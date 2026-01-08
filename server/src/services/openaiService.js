import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { aiConfig } from '../config/openai.js';
import logger from '../utils/logger.js';
import Material from '../models/Material.js';
import Company from '../models/Company.js';
import { fetchGoogleSheetData, parsePricingSheet } from './googleSheetsService.js';
import { buildPricingSnapshotFromSheet } from '../controllers/materialController.js';

// Initialize AI clients
let openai = null;
let claude = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

if (process.env.ANTHROPIC_API_KEY) {
  claude = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  console.log('✅ Claude AI initialized with API key');
} else {
  console.log('❌ ANTHROPIC_API_KEY not found in environment variables');
}

// ============================================
// CLAUDE TOOL DEFINITIONS
// These tools let Claude modify the proposal
// ============================================
const proposalTools = [
  {
    name: "set_client_info",
    description: "Update client contact information. Use when user provides client name, email, phone, or address.",
    input_schema: {
      type: "object",
      properties: {
        clientName: { type: "string", description: "Client's full name" },
        clientEmail: { type: "string", description: "Client's email address" },
        clientPhone: { type: "string", description: "Client's phone number" },
        clientAddress: { type: "string", description: "Client's mailing address" }
      }
    }
  },
  {
    name: "set_property_info",
    description: "Update property/job site information. Use when user provides property address or location details.",
    input_schema: {
      type: "object",
      properties: {
        propertyAddress: { type: "string", description: "Street address of the property" },
        propertyCity: { type: "string", description: "City" },
        propertyState: { type: "string", description: "State (2-letter code)" },
        propertyZip: { type: "string", description: "ZIP code" },
        projectType: { type: "string", description: "Type of project (e.g., 'Tear-off and Re-roof', 'Overlay', 'Repair')" }
      }
    }
  },
  {
    name: "set_measurements",
    description: "Update roof measurements. Use when extracting data from RoofScope, EagleView, or user-provided measurements.",
    input_schema: {
      type: "object",
      properties: {
        totalSquares: { type: "number", description: "Total roof area in squares (1 square = 100 sq ft)" },
        ridgeLength: { type: "number", description: "Total ridge length in linear feet" },
        hipLength: { type: "number", description: "Total hip length in linear feet" },
        valleyLength: { type: "number", description: "Total valley length in linear feet" },
        eaveLength: { type: "number", description: "Total eave/drip edge length in linear feet" },
        rakeLength: { type: "number", description: "Total rake length in linear feet" },
        stepFlashingLength: { type: "number", description: "Step flashing length in linear feet" },
        headwallLength: { type: "number", description: "Headwall flashing length in linear feet" },
        pitch: { type: "string", description: "Roof pitch (e.g., '6/12', '8/12')" },
        layers: { type: "number", description: "Number of existing layers to remove" },
        penetrations: { type: "number", description: "Number of penetrations (vents, pipes)" },
        skylights: { type: "number", description: "Number of skylights" },
        roofPlanes: { type: "number", description: "Number of roof planes/facets" }
      }
    }
  },
  {
    name: "add_material",
    description: "Add a line item to the proposal. Use for materials, labor items, or add-ons.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Item name (e.g., 'Brava Field Tile', 'Roofing Labor')" },
        category: { type: "string", description: "Category: 'material', 'labor', or 'addon'" },
        quantity: { type: "number", description: "Quantity needed" },
        unit: { type: "string", description: "Unit of measure (e.g., 'sq', 'bundle', 'lf', 'each', 'hour')" },
        unitPrice: { type: "number", description: "Price per unit in dollars" },
        description: { type: "string", description: "Optional description or notes" },
        isOptional: { type: "boolean", description: "Whether this is an optional add-on" }
      },
      required: ["name", "quantity", "unit", "unitPrice"]
    }
  },
  {
    name: "update_material",
    description: "Update an existing line item. Use when user wants to change quantity, price, or details of an item already in the proposal.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the item to update (must match existing item)" },
        quantity: { type: "number", description: "New quantity" },
        unitPrice: { type: "number", description: "New unit price" },
        description: { type: "string", description: "New description" }
      },
      required: ["name"]
    }
  },
  {
    name: "remove_material",
    description: "Remove a line item from the proposal.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the item to remove (must match existing item)" }
      },
      required: ["name"]
    }
  },
  {
    name: "set_margins",
    description: "Update profit and overhead percentages.",
    input_schema: {
      type: "object",
      properties: {
        overheadPercent: { type: "number", description: "Overhead percentage (e.g., 15 for 15%)" },
        profitPercent: { type: "number", description: "Profit percentage (e.g., 20 for 20%)" }
      }
    }
  },
  {
    name: "apply_discount",
    description: "Apply a discount to the proposal.",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Discount amount in dollars" },
        reason: { type: "string", description: "Reason for discount (e.g., 'Veteran discount', 'Repeat customer')" }
      },
      required: ["amount"]
    }
  },
  {
    name: "set_project_details",
    description: "Update project timeline, warranty, and notes.",
    input_schema: {
      type: "object",
      properties: {
        timeline: { type: "string", description: "Project timeline (e.g., '3-5 days, weather permitting')" },
        warranty: { type: "string", description: "Warranty details (e.g., '50-Year Manufacturer, 10-Year Workmanship')" },
        notes: { type: "string", description: "Additional notes for the proposal" }
      }
    }
  },
  {
    name: "add_labor",
    description: "Add a labor line item. Use for crew labor costs.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Labor description (e.g., 'Steep Slope Labor', 'Flat Roof Labor')" },
        hours: { type: "number", description: "Number of hours" },
        rate: { type: "number", description: "Hourly rate in dollars" },
        description: { type: "string", description: "Optional description" }
      },
      required: ["name", "hours", "rate"]
    }
  }
];

// GPT Vision for image analysis
export const processImageWithVision = async (imageBase64, prompt, documentType = 'general') => {
  if (!openai) {
    throw new Error('OpenAI service not configured');
  }

  try {
    const response = await openai.chat.completions.create({
      model: aiConfig.defaultVisionModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: aiConfig.openai.maxTokens,
      temperature: aiConfig.openai.temperature
    });

    return response.choices[0].message.content;
  } catch (error) {
    logger.error('Error in GPT Vision processing:', error);
    throw error;
  }
};

// Claude AI for data analysis and chat
export const processWithClaude = async (prompt, context = '', systemPrompt = '') => {
  if (!claude) {
    console.log('❌ Claude service not configured - missing API key');
    throw new Error('Claude service not configured - ANTHROPIC_API_KEY missing');
  }

  console.log(`🤖 Processing with Claude model: ${aiConfig.defaultChatModel}`);

  try {
    // Fetch real pricing data for default prompts too
    let pricingContext = '';
    if (!systemPrompt) {
      try {
        const axios = (await import('axios')).default;
        const baseURL = process.env.NODE_ENV === 'production' 
          ? process.env.API_URL || 'http://localhost:3001'
          : 'http://localhost:3001';
        
        const pricingResponse = await axios.get(`${baseURL}/api/materials/ai-pricing`);
        
        if (pricingResponse.data.success && pricingResponse.data.pricingSheets.length > 0) {
          pricingContext = `\n\n**COMPANY PRICING DATA (USE THESE EXACT PRICES):**\n`;
          
          pricingResponse.data.pricingSheets.forEach(sheet => {
            pricingContext += `\n${sheet.sheetName}:\n`;
            sheet.materials.forEach(material => {
              pricingContext += `- ${material.name}: $${material.materialCost} material + $${material.laborCost} labor = $${material.totalPrice} ${material.unit}\n`;
            });
          });
          
          pricingContext += `\n**CRITICAL:** Use these EXACT prices from the company's pricing sheets.\n`;
        }
      } catch (error) {
        console.error('❌ Failed to fetch pricing data for default prompt:', error.message);
      }
    }

    const defaultSystemPrompt = `You are a roofing expert helping build proposals. Provide complete solutions based on the context provided.${pricingContext ? `\n\n${pricingContext}` : ''}`;

    const response = await claude.messages.create({
      model: aiConfig.defaultChatModel,
      max_tokens: aiConfig.claude.maxTokens,
      temperature: aiConfig.claude.temperature,
      system: systemPrompt || defaultSystemPrompt,
      messages: [
        {
          role: 'user',
          content: context ? `${context}\n\n${prompt}` : prompt
        }
      ]
    });

    return response.content[0].text;
  } catch (error) {
    logger.error('💥 Error in Claude processing:');
    logger.error('Error type:', error.constructor.name);
    logger.error('Error message:', error.message);
    logger.error('Error code:', error.code);
    logger.error('Error status:', error.status);
    logger.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    throw error;
  }
};

// Analyze pricing documents with Claude
export const analyzePricingDocument = async (documentContent, documentType) => {
  logger.info('🔍 analyzePricingDocument called with:');
  logger.info('Document type:', documentType);
  logger.info('Content length:', documentContent.length);
  logger.info('Content preview:', documentContent.substring(0, 300));

  const systemPrompt = `You are an expert at analyzing roofing pricing documents and spreadsheets. 
Your job is to extract pricing data and return it in a specific JSON format.
Always count the actual number of items/rows and include that in your response.`;

  // The documentContent already contains the full prompt from the controller
  // Just pass it directly to Claude
  try {
    const result = await processWithClaude(documentContent, '', systemPrompt);
    logger.info('✅ Claude analysis completed successfully');
    logger.info('Result length:', result.length);
    return result;
  } catch (error) {
    logger.error('❌ Claude analysis failed:', error.message);
    logger.error('Full error:', error);
    throw error;
  }
};

// Generate roofing recommendations with Claude
export const generateRoofingRecommendations = async (projectData) => {
  const systemPrompt = `You are a MASTER roofing contractor providing DEFINITIVE project recommendations. No questions, no suggestions - provide COMPLETE solutions.`;

  const prompt = `Based on this roofing project data, provide a COMPLETE professional roofing proposal:

Project Data:
${JSON.stringify(projectData, null, 2)}

Provide COMPLETE SOLUTION including:

**ROOFING SYSTEM RECOMMENDATION**
- Specific shingle brand and model (GAF, Owens Corning, or CertainTeed)
- Complete material specifications
- Labor requirements and timeline

**COMPLETE PROJECT ESTIMATE**
Materials: $X,XXX (itemized)
Labor: $X,XXX (based on complexity)
Permits & Disposal: $XXX
Subtotal: $X,XXX
Overhead (15%): $XXX
Profit (20%): $X,XXX
**TOTAL PROJECT INVESTMENT: $XX,XXX**

**PROJECT DETAILS**
Timeline: X-X working days
Warranty: Manufacturer + workmanship details
Weather considerations and scheduling

Provide a COMPLETE, customer-ready proposal they can approve immediately.`;

  return await processWithClaude(prompt, '', systemPrompt);
};

// Core system prompt function - Instructs Claude on tool use
const getCoreSystemPrompt = (pricingStatus, pricingContext) => {
  return `You are a roofing proposal assistant. You help contractors build accurate proposals by extracting data from documents and adding materials.

## YOUR TOOLS
You have tools to modify the proposal directly. USE THEM whenever the user provides information:
- set_client_info: When user gives client name, email, phone
- set_property_info: When user gives property address, city, state, zip
- set_measurements: When you extract measurements from RoofScope, EagleView, or user input
- add_material: Add materials, labor items, or add-ons to the proposal
- update_material: Change quantity or price of existing items
- remove_material: Remove items from the proposal
- set_margins: Update overhead and profit percentages
- apply_discount: Apply discounts
- add_labor: Add labor line items
- set_project_details: Update timeline, warranty, notes

## WHEN TO USE TOOLS
- When user uploads an image: Extract ALL measurements and use set_measurements
- When user gives client info: Use set_client_info immediately
- When user says "add X": Use add_material with proper quantity/price
- When user says "change X to Y": Use update_material
- When user says "remove X": Use remove_material

## IMPORTANT RULES
1. ALWAYS use tools when you have data to add - don't just describe what you would add
2. Calculate quantities properly: add 10% waste for roofing materials
3. Use multiple tools in one response when needed
4. After using tools, briefly confirm what you did

${pricingStatus === 'LOADED' 
  ? `## YOUR PRICING SHEET
${pricingContext}

Use these exact prices when adding materials. If an item isn't in the sheet, ask the user for the price.`
  : `## NO PRICING SHEET
You don't have access to pricing data. Ask the user for prices, or tell them to add a pricing sheet in Settings.`}

Be conversational but action-oriented. When you have data, USE THE TOOLS to add it to the proposal.`;
};

// Chat with Claude for general roofing questions
export const chatWithClaude = async (message, conversationHistory = [], proposalContext = null, images = null) => {
  logger.info('🤖 chatWithClaude called');
  logger.info('Message length:', message?.length);
  logger.info('Conversation history length:', conversationHistory?.length);
  logger.info('Has proposal context:', !!proposalContext);
  logger.info('Has images:', images ? images.length : 0);
  logger.info('Has Claude client:', !!claude);
  logger.info('Has API key:', !!process.env.ANTHROPIC_API_KEY);

  // Fetch pricing data from database
  let pricingContext = '';
  let pricingStatus = 'NOT_LOADED';
  let companyId = null; // Declare at function level so it's accessible outside try block
  let debugInfo = {
    step: 'starting',
    companyId: null,
    sheetsFound: 0,
    sheetsWithSnapshots: 0,
    sheetsFetchedFromGoogle: 0,
    totalMaterials: 0,
    errors: []
  };

  // Check if this is a new conversation or user requested refresh
  const isNewConversation = !conversationHistory || conversationHistory.length === 0;
  const refreshKeywords = ['refresh', 'update', 'sync', 'latest', 'newest', 'current'];
  const userRequestedRefresh = refreshKeywords.some(keyword => 
    message.toLowerCase().includes(keyword) && 
    (message.toLowerCase().includes('pric') || message.toLowerCase().includes('sheet'))
  );
  const shouldFetchFresh = isNewConversation || userRequestedRefresh;

  try {
    logger.info('🔍 [PRICING DEBUG] Starting pricing fetch for AI chat...');
    logger.info(`🔍 [PRICING DEBUG] New conversation: ${isNewConversation}, User requested refresh: ${userRequestedRefresh}, Will fetch fresh: ${shouldFetchFresh}`);
    
    // Determine company ID (same logic as /api/materials/ai-pricing)
    
    // Try to get companyId from proposalContext first
    if (proposalContext?.companyId) {
      companyId = proposalContext.companyId;
      logger.info(`🔍 [PRICING DEBUG] Using companyId from proposalContext: ${companyId}`);
    } 
    // If proposalContext has userId, get companyId from user's companyId field
    else if (proposalContext?.userId) {
      const User = (await import('../models/User.js')).default;
      const user = await User.findByPk(proposalContext.userId);
      companyId = user?.companyId || null;
      logger.info(`🔍 [PRICING DEBUG] Using companyId from user record: ${companyId}`);
    }
    // Fallback: get first company
    else {
      logger.info('🔍 [PRICING DEBUG] No companyId in proposalContext, looking up first company...');
      const company = await Company.findOne({ order: [['createdAt', 'ASC']] });
      companyId = company?.id || null;
      logger.info(`🔍 [PRICING DEBUG] Found company: ${companyId} (${company?.name || 'unknown'})`);
    }
    debugInfo.companyId = companyId;

    if (!companyId) {
      logger.warn('⚠️ [PRICING DEBUG] No company found - cannot load pricing');
      debugInfo.step = 'no_company';
    } else {
      // Query pricing sheets directly from database
      logger.info(`🔍 [PRICING DEBUG] Querying materials table for companyId=${companyId}, category='pricing_sheet', isActive=true`);
      const pricingSheets = await Material.findAll({
        where: { 
          companyId: companyId,
          category: 'pricing_sheet',
          isActive: true
        },
        order: [['updatedAt', 'DESC']]
      });
      
      debugInfo.sheetsFound = pricingSheets.length;
      logger.info(`🔍 [PRICING DEBUG] Found ${pricingSheets.length} active pricing sheets in database`);

      const pricingData = [];
      
      for (const sheet of pricingSheets) {
        try {
          logger.info(`🔍 [PRICING DEBUG] Processing sheet: ${sheet.name} (ID: ${sheet.id})`);
          
          // Check if it's a Google Sheets URL type
          if (sheet.specifications?.type === 'url' && sheet.specifications?.files?.[0]?.name) {
            const sheetUrl = sheet.specifications.files[0].name;
            logger.info(`🔍 [PRICING DEBUG] Sheet ${sheet.name} is Google Sheets URL: ${sheetUrl.substring(0, 50)}...`);

            // Check if we should fetch fresh (new conversation or user requested refresh)
            if (!shouldFetchFresh) {
              // Use snapshot for ongoing conversations (fast)
            const existingSnapshot = sheet.specifications?.pricingSnapshot;
            if (existingSnapshot?.materials?.length || existingSnapshot?.rawCsvData) {
              logger.info(`✅ [PRICING DEBUG] Using stored snapshot for ${sheet.name}: ${existingSnapshot.materials?.length || 0} materials`);
              pricingData.push({
                sheetName: sheet.name,
                materials: existingSnapshot.materials || [],
                  rawCsvData: existingSnapshot.rawCsvData || null,
                totalItems: existingSnapshot.materials?.length || 0,
                lastSyncedAt: existingSnapshot.lastSyncedAt || sheet.specifications?.lastSyncedAt || null,
                source: 'snapshot'
              });
              debugInfo.sheetsWithSnapshots++;
              debugInfo.totalMaterials += existingSnapshot.materials?.length || 0;
              continue;
              }
            }

            // Fetch fresh from Google Sheets (new conversation, user requested refresh, or no snapshot)
            logger.info(`📥 [PRICING DEBUG] Fetching fresh data from Google Sheets for ${sheet.name}${shouldFetchFresh ? (isNewConversation ? ' (new conversation)' : ' (user requested refresh)') : ' (no snapshot)'}...`);
            try {
              const sheetData = await fetchGoogleSheetData(sheetUrl);
              logger.info(`✅ [PRICING DEBUG] Fetched ${sheetData.rowCount} rows from Google Sheet`);
              
              // Parse the fresh data
              const snapshot = buildPricingSnapshotFromSheet(sheetData, sheetUrl);
              logger.info(`✅ [PRICING DEBUG] Parsed ${snapshot.materials.length} materials using flexible parser`);
              
              // Store snapshot for future use (wrap in try-catch so DB errors don't break pricing)
              try {
                const nextSpecs = {
                  ...(sheet.specifications || {}),
                  itemCount: snapshot.totalItems,
                  totalRows: snapshot.totalRows,
                  processedAt: snapshot.lastSyncedAt,
                  pricingSnapshot: snapshot,  // Store snapshot for next time
                  syncStatus: 'ok',
                  syncError: null,
                  lastSyncedAt: snapshot.lastSyncedAt
                };
                await sheet.update({ specifications: nextSpecs });
                logger.info(`✅ [PRICING DEBUG] Stored snapshot in database for ${sheet.name}`);
              } catch (dbError) {
                // Log but don't fail - pricing data is still valid even if snapshot save fails
                logger.warn(`⚠️ [PRICING DEBUG] Failed to save snapshot in database for ${sheet.name}:`, dbError.message);
              }
              
              pricingData.push({
                sheetName: sheet.name,
                materials: snapshot.materials,
                rawCsvData: snapshot.rawCsvData || sheetData.csvData || null, // Include raw CSV data
                totalItems: snapshot.materials.length,
                lastSyncedAt: snapshot.lastSyncedAt,
                source: 'google_fetch'
              });
              debugInfo.sheetsFetchedFromGoogle++;
              debugInfo.totalMaterials += snapshot.materials.length;
              
            } catch (fetchError) {
              logger.error(`❌ [PRICING DEBUG] Failed to fetch Google Sheet for ${sheet.name}:`, fetchError.message);
              debugInfo.errors.push({ sheet: sheet.name, error: fetchError.message });
              
              // No snapshot AND fetch failed - skip this sheet (don't use stale data)
              logger.warn(`⚠️ [PRICING DEBUG] Skipping ${sheet.name} - no snapshot and Google Sheets fetch failed`);
              // Don't add anything to pricingData - this sheet is unavailable
            }
          } else {
            logger.info(`⚠️ [PRICING DEBUG] Sheet ${sheet.name} is not a Google Sheets URL type, skipping`);
          }
        } catch (sheetError) {
          logger.error(`❌ [PRICING DEBUG] Error processing sheet ${sheet.name}:`, sheetError.message);
          debugInfo.errors.push({ sheet: sheet.name, error: sheetError.message });
        }
      }

      // After processing all sheets, check if we have any valid pricing data
      if (pricingData.length === 0) {
        logger.error(`❌ [PRICING DEBUG] NO VALID PRICING DATA AVAILABLE - all sheets failed to load or no sheets found`);
        pricingStatus = 'NOT_LOADED';
        pricingContext = '';
      } else {
        // Build simple pricing context for Claude - just a readable table
        pricingStatus = 'LOADED';
        logger.info(`✅ [PRICING DEBUG] Building pricing context from ${pricingData.length} sheets, ${debugInfo.totalMaterials} total materials`);
        
        pricingData.forEach(sheet => {
          pricingContext += `\n**${sheet.sheetName}:**\n`;
          pricingContext += `| Category | Item Name | Unit | Coverage | Price |\n`;
          pricingContext += `|----------|-----------|------|----------|-------|\n`;
          
          // Parse the sheet data if we have raw CSV
          let parsedItems = [];
          if (sheet.rawCsvData) {
            try {
              const csvRows = sheet.rawCsvData.split('\n').map(row => row.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
              const sheetDataForParsing = { rows: csvRows };
              parsedItems = parsePricingSheet(sheetDataForParsing);
            } catch (parseError) {
              logger.warn(`Failed to parse pricing sheet: ${parseError.message}`);
              parsedItems = [];
            }
          }
          
          if (parsedItems.length > 0) {
            parsedItems.forEach(item => {
              const category = item.category || item['Category'] || '';
              const name = item.name || item['Item Name'] || '';
                const unit = item.unit || item['Unit'] || '';
                const coverage = item.coverage || item['Coverage'] || '';
              const price = item.price || item['Price'] || '';
              
              pricingContext += `| ${category} | ${name} | ${unit} | ${coverage} | $${price} |\n`;
            });
          } else if (sheet.materials && sheet.materials.length > 0) {
              sheet.materials.forEach(material => {
              pricingContext += `| ${material.category || ''} | ${material.name || ''} | ${material.unit || ''} | ${material.coverage || ''} | $${material.price || 0} |\n`;
            });
          }
        });
        
        logger.info(`✅ [PRICING DEBUG] Pricing context built: ${pricingContext.length} characters`);
      }
    }

    logger.info(`🔍 [PRICING DEBUG] Final status: ${pricingStatus}, sheets=${debugInfo.sheetsFound}, materials=${debugInfo.totalMaterials}, errors=${debugInfo.errors.length}`);
    logger.info(`🔍 [PRICING DEBUG] Full debug info:`, JSON.stringify(debugInfo, null, 2));
    
    // Also log to console for Railway visibility
    console.log(`\n📊 [PRICING SUMMARY FOR AI CHAT]`);
    console.log(`   Status: ${pricingStatus}`);
    console.log(`   Company ID: ${debugInfo.companyId}`);
    console.log(`   Sheets found: ${debugInfo.sheetsFound}`);
    console.log(`   Sheets with snapshots: ${debugInfo.sheetsWithSnapshots}`);
    console.log(`   Sheets fetched from Google: ${debugInfo.sheetsFetchedFromGoogle}`);
    console.log(`   Total materials: ${debugInfo.totalMaterials}`);
    console.log(`   Pricing context length: ${pricingContext.length} chars`);
    if (debugInfo.errors.length > 0) {
      console.log(`   ⚠️ Errors: ${JSON.stringify(debugInfo.errors)}`);
    }
    console.log(`\n`);

  } catch (error) {
    logger.error('❌ [PRICING DEBUG] CRITICAL ERROR fetching pricing data for AI:', error);
    logger.error('❌ [PRICING DEBUG] Error stack:', error.stack);
    console.error(`\n❌ [PRICING DEBUG] CRITICAL ERROR: ${error.message}\n`);
    debugInfo.step = 'error';
    debugInfo.errors.push({ error: error.message, stack: error.stack?.split('\n')[0] });
  }

  // Get simple system prompt
  const systemPrompt = getCoreSystemPrompt(pricingStatus, pricingContext);

  // Build messages array for Claude API
  const messages = [];
  
  // Add conversation history (already in correct format: {role, content})
  if (conversationHistory.length > 0) {
    messages.push(...conversationHistory);
  }
  
  // Build current message content
  let textContent = message;
  if (proposalContext) {
    // Add structured context to the message
    const contextText = `\n\n**Current Proposal Context:**\n${JSON.stringify(proposalContext, null, 2)}`;
    textContent = message + contextText;
  }
  
  // Build message content - with images or text only
  if (images && images.length > 0) {
    // Claude vision format: content is an array of content blocks
    const contentBlocks = [];
    
    // Add images first (Claude processes them in order)
    for (const imageDataUrl of images) {
      // Extract base64 data and media type from data URL
      // Format: data:image/jpeg;base64,/9j/4AAQ...
      const matches = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mediaType = matches[1]; // e.g., "image/jpeg", "image/png"
        const base64Data = matches[2]; // The actual base64 string
        
        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data
          }
        });
        logger.info(`Added image to Claude request: ${mediaType}, ${base64Data.length} chars`);
      } else {
        logger.warn('Invalid image data URL format, skipping');
      }
    }
    
    // Add text content after images
    contentBlocks.push({
      type: 'text',
      text: textContent
    });
  
  messages.push({
    role: 'user',
      content: contentBlocks
    });
    
    logger.info(`Built message with ${images.length} image(s) and text`);
  } else {
    // Text-only message (simple string content)
    messages.push({
      role: 'user',
      content: textContent
    });
  }

  // Use processWithClaude but with messages array
  if (!claude) {
    throw new Error('Claude service not configured - ANTHROPIC_API_KEY missing');
  }

  // Debug: Log what we're sending to Claude
  logger.info(`🔍 [CLAUDE DEBUG] About to send to Claude:`);
  logger.info(`   Pricing Status: ${pricingStatus}`);
  logger.info(`   System prompt length: ${systemPrompt.length} chars`);
  logger.info(`   System prompt starts with: ${systemPrompt.substring(0, 200)}...`);
  logger.info(`   Pricing context included: ${pricingContext ? 'YES (' + pricingContext.length + ' chars)' : 'NO'}`);
  logger.info(`   Messages count: ${messages.length}`);
  console.log(`\n🤖 [CLAUDE DEBUG] Sending to Claude:`);
  console.log(`   Pricing Status: ${pricingStatus}`);
  console.log(`   Has pricing context: ${pricingContext ? 'YES' : 'NO'}`);
  console.log(`   System prompt CRITICAL section: ${systemPrompt.includes('PRICING IS LOADED') ? '✅ LOADED' : systemPrompt.includes('PRICING IS NOT LOADED') ? '⚠️ NOT LOADED' : '❓ UNKNOWN'}`);
  console.log(`\n`);

  try {
    const response = await claude.messages.create({
      model: aiConfig.defaultChatModel,
      max_tokens: aiConfig.claude.maxTokens,
      temperature: aiConfig.claude.temperature,
      system: systemPrompt,
      messages: messages,
      tools: proposalTools  // Enable tool use
    });

    // Parse response - may contain text and/or tool_use blocks
    let responseText = '';
    const actions = [];
    
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText += block.text;
      } else if (block.type === 'tool_use') {
        // Claude wants to use a tool
        actions.push({
          tool: block.name,
          input: block.input,
          id: block.id
        });
        logger.info(`🔧 Tool use: ${block.name}`, JSON.stringify(block.input));
      }
    }
    
    logger.info('✅ Claude response received, text length:', responseText?.length);
    logger.info(`🔧 Tool actions: ${actions.length}`);
    
    // Return text for display + actions for proposal updates
    return {
      response: responseText,
      actions: actions.length > 0 ? actions : null
    };
  } catch (error) {
    logger.error('💥 Error in Claude chat service:');
    logger.error('Error type:', error.constructor.name);
    logger.error('Error message:', error.message);
    logger.error('Error code:', error.code);
    logger.error('Error status:', error.status);
    logger.error('Error status_code:', error.status_code);
    logger.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    logger.error('Messages sent count:', messages.length);
    logger.error('System prompt length:', systemPrompt.length);
    logger.error('Has Claude client:', !!claude);
    logger.error('Has API key:', !!process.env.ANTHROPIC_API_KEY);
    logger.error('API key length:', process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0);
    
    throw error;
  }
};

export default {
  processImageWithVision,
  processWithClaude,
  analyzePricingDocument,
  generateRoofingRecommendations,
  chatWithClaude
};
