import Anthropic from '@anthropic-ai/sdk';
import { aiConfig } from '../config/openai.js';
import logger from '../utils/logger.js';
import Material from '../models/Material.js';
import Company from '../models/Company.js';
import { parsePricingSheet } from './googleSheetsService.js';

// Initialize Claude client
let claude = null;

if (process.env.ANTHROPIC_API_KEY) {
  claude = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: aiConfig.claude.timeout
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

// Process image with Claude Vision (replaces OpenAI GPT-4 Vision)
export const processImageWithClaude = async (imageBase64, prompt, documentType = 'general') => {
  if (!claude) {
    throw new Error('Claude service not configured');
  }

  try {
    // Extract base64 data from data URL if needed
    let base64Data = imageBase64;
    let mediaType = 'image/jpeg';
    
    const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      mediaType = matches[1];
      base64Data = matches[2];
    }

    const response = await Promise.race([
      claude.messages.create({
        model: aiConfig.defaultChatModel,
        max_tokens: aiConfig.claude.maxTokens,
        temperature: aiConfig.claude.temperature,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ]
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Claude API timeout')), aiConfig.claude.timeout)
      )
    ]);

    return response.content[0].text;
  } catch (error) {
    logger.error('Error in Claude Vision processing:', error);
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
    const defaultSystemPrompt = systemPrompt || 'You are a roofing expert helping build proposals. Provide complete solutions based on the context provided.';

    const response = await Promise.race([
      claude.messages.create({
        model: aiConfig.defaultChatModel,
        max_tokens: aiConfig.claude.maxTokens,
        temperature: aiConfig.claude.temperature,
        system: defaultSystemPrompt,
        messages: [
          {
            role: 'user',
            content: context ? `${context}\n\n${prompt}` : prompt
          }
        ]
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Claude API timeout')), aiConfig.claude.timeout)
      )
    ]);

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

  // Only load pricing when needed (when discussing materials/pricing)
  const needsPricing = message.toLowerCase().includes('material') || 
                       message.toLowerCase().includes('price') ||
                       message.toLowerCase().includes('add') ||
                       message.toLowerCase().includes('cost') ||
                       message.toLowerCase().includes('quote') ||
                       conversationHistory.some(msg => msg.content?.toLowerCase().includes('material') || msg.content?.toLowerCase().includes('price'));

  let pricingContext = '';
  let pricingStatus = 'NOT_LOADED';

  if (needsPricing) {
    try {
      // Get company ID
      let companyId = null;
      if (proposalContext?.companyId) {
        companyId = proposalContext.companyId;
      } else if (proposalContext?.userId) {
        const User = (await import('../models/User.js')).default;
        const user = await User.findByPk(proposalContext.userId);
        companyId = user?.companyId || null;
      } else {
        const company = await Company.findOne({ order: [['createdAt', 'ASC']] });
        companyId = company?.id || null;
      }

      if (companyId) {
        // Load pricing sheets from database (snapshots only - no Google Sheets API calls)
        const pricingSheets = await Material.findAll({
          where: { 
            companyId: companyId,
            category: 'pricing_sheet',
            isActive: true
          },
          order: [['updatedAt', 'DESC']]
        });

        if (pricingSheets.length > 0) {
          pricingStatus = 'LOADED';
          
          for (const sheet of pricingSheets) {
            const snapshot = sheet.specifications?.pricingSnapshot;
            if (snapshot?.materials?.length) {
              pricingContext += `\n**${sheet.name}:**\n`;
              pricingContext += `| Item Name | Unit | Price |\n`;
              pricingContext += `|-----------|------|-------|\n`;
              
              snapshot.materials.forEach(material => {
                const name = material.name || '';
                const unit = material.unit || '';
                const price = material.price || material.totalPrice || 0;
                pricingContext += `| ${name} | ${unit} | $${price} |\n`;
              });
            }
          }
          
          logger.info(`✅ Loaded pricing from ${pricingSheets.length} sheet(s), ${pricingContext.length} chars`);
        }
      }
    } catch (error) {
      logger.error('Error loading pricing:', error.message);
      // Continue without pricing - not critical
    }
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
    const response = await Promise.race([
      claude.messages.create({
        model: aiConfig.defaultChatModel,
        max_tokens: aiConfig.claude.maxTokens,
        temperature: aiConfig.claude.temperature,
        system: systemPrompt,
        messages: messages,
        tools: proposalTools  // Enable tool use
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Claude API timeout')), aiConfig.claude.timeout)
      )
    ]);

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
  processImageWithClaude,
  processWithClaude,
  analyzePricingDocument,
  generateRoofingRecommendations,
  chatWithClaude
};
