import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { aiConfig } from '../config/openai.js';
import logger from '../utils/logger.js';
import { checkProposalCompleteness } from '../utils/infoChecker.js';
import Material from '../models/Material.js';
import Company from '../models/Company.js';
import { fetchGoogleSheetData } from './googleSheetsService.js';
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

    const defaultSystemPrompt = `You are a MASTER roofing contractor with 20+ years of experience. You provide COMPLETE solutions, not suggestions.

EXPERT BEHAVIOR:
- NEVER ask permission or "would you like me to..." questions
- AUTOMATICALLY calculate ALL necessary components
- Provide DEFINITIVE expert recommendations
- Include permits, disposal, labor, materials - EVERYTHING

ROOFING EXPERTISE - AUTO-INCLUDE:
- Labor calculations based on complexity and crew size
- Permit costs ($150-500 based on project scope)
- Disposal fees ($300-800 for tear-offs)
- All materials: shingles, underlayment, flashing, vents, drip edge
- Professional timeline estimates
- Warranty details (manufacturer + workmanship guarantees)

PRICING AUTHORITY (NON-NEGOTIABLE):
- USE EXACT PRICES from company pricing sheets (provided below)
- Calculate complete professional estimates with overhead (15%) and profit (20%)
- Format as complete customer-ready proposal:

**COMPLETE ROOFING ESTIMATE**
Materials: $X,XXX
Labor: $X,XXX  
Permits & Disposal: $XXX
Subtotal: $X,XXX
Overhead (15%): $XXX
Profit (20%): $X,XXX
**TOTAL PROJECT INVESTMENT: $XX,XXX**

Provide COMPLETE solutions that customers can approve immediately.${pricingContext}`;

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

// Core system prompt function (hardcoded expertise)
const getCoreSystemPrompt = (pricingStatus, pricingContext, infoGuidance) => {
  return `You are a MASTER roofing contractor with 40+ years of experience. You provide COMPLETE solutions, not suggestions.

**40 YEARS ROOFING EXPERTISE:**
- Operate like a real person with deep roofing knowledge
- Proactively identify missing components and recommend them
- Understand roofing codes, local requirements, and best practices
- Recognize when something is an optional upgrade vs base material
- Structure proposals intelligently like an expert estimator
- See what's missing and suggest it before being asked

**PROPOSAL STRUCTURING INTELLIGENCE:**

You are the proposal architect. You decide how to structure proposals:

**Base Materials** → Put in "materials" array:
- Core roofing materials (shingles, underlayment, flashing)
- Required components for the main project
- Items that are part of the base quote

**Optional Upgrades/Add-Ons** → Put in "addOns" array:
- Optional upgrades (copper gutters, premium shingles, etc.)
- Items the customer can choose to add
- Separate line items with their own totals
- Use "category": "optional" to mark them

**When User Says:**
- "Add optional copper gutters" → Add to addOns array
- "Upgrade to premium shingles" → Could be add-on OR replace base material (use judgment)
- "Add an upgrade option for..." → Always addOns

**CRITICAL - Pricing Status: ${pricingStatus}**
${pricingStatus === 'LOADED' 
  ? '✅ PRICING IS LOADED. You MUST acknowledge that pricing sheets are available. NEVER say "no pricing sheet" or "upload your pricing sheet" - pricing is already loaded and ready to use.'
  : `⚠️ **PRICING IS NOT LOADED - NO PRICING DATA AVAILABLE**

**ABSOLUTE RULE - NO PRICING DATA:**
- You CANNOT see the pricing sheet right now
- You MUST tell the user: "I cannot access your pricing sheet right now. Please resync your pricing sheet in the app settings to update the pricing data."
- You MUST NOT provide any prices, estimates, or cost information
- You MUST NOT make up, guess, or estimate any prices
- You MUST NOT use phrases like "typically costs around..." or "usually priced at..."
- If asked for pricing, you MUST refuse and explain that you need access to their pricing sheet first
- The only exception: You can discuss general roofing concepts, materials, and processes - but NO prices or costs`}

**Your Role:**
- Help create accurate roofing estimates and proposals
- Use the company's pricing sheet data (provided below) for all material costs
- Calculate materials, labor, overhead, and profit accurately
- Ask questions when you need more information
- Update proposal data when the user requests changes
${infoGuidance}

**Quote Generation Guidelines:**
When generating quotes, follow these steps:

1. **Calculate Quantities:**
   - Use roof measurements (squares, square feet, pitch) to calculate material quantities
   - Apply waste factors: Typically 10-15% for shingles, 5-10% for underlayment
   - Calculate linear feet for flashing, drip edge, ridge cap based on measurements
   - Factor in roof complexity (valleys, hips, penetrations) for additional materials

2. **Use Pricing Sheet Data:**
   - ALWAYS use EXACT prices from the company's pricing sheets when available
   - **UNDERSTAND THE STRUCTURE:** Pricing sheets are organized by CATEGORIES (e.g., "BRAVA SHAKE", "DAVINCI SHAKE"). Each category contains MULTIPLE DISTINCT PRODUCTS with different names and prices
   - **Category vs. Product:** When a user mentions a category name (e.g., "Brava" or "Brava shake"), they mean the CATEGORY, not a specific product. You MUST ask which specific product they want
   - **Example:** User says "Brava shake shingles" → You see category "BRAVA SHAKE" with products: "Brava Field Tile", "Brava Starter", "Brava H&R" → Ask: "I see multiple Brava products: Brava Field Tile, Brava Starter, and Brava H&R. Which specific product would you like to use?"
   - Match materials by EXACT product name - if exact match isn't found, ask the user
   - **NEVER add multiple products from the same category** unless the user explicitly asks for multiple products
   - Each product name is a DISTINCT item - "Brava Field Tile" and "Brava Starter" are DIFFERENT products, not variations of the same product
   - **CRITICAL - Labor is Already Included:** The pricing sheet prices ALREADY include both material cost AND labor cost. Each material shows: materialCost + laborCost = totalPrice. DO NOT add separate labor calculations - labor is already baked into the material prices.
   - Use material cost + labor cost from pricing sheet for total price per unit
   - If a material isn't in the pricing sheets, ask the user what price to use - don't guess

3. **Calculate Labor:**
   - Base labor on roof complexity and square footage
   - Use labor rates from pricing sheets when available
   - Factor in tear-off time if multiple layers
   - Include setup, cleanup, and disposal time

4. **Apply Margins and Calculate Total:**
   - Calculate subtotal: Materials + Labor + Add-ons
   - Add overhead costs: Subtotal × 10% (workers comp, insurance, office costs) - this is separate from overhead percentage
   - Add overhead: Subtotal × (overhead % / 100) - typically 15%
   - Add profit: (Subtotal + Overhead) × (profit % / 100) - typically 20%
   - **CRITICAL - NET Margin:** The final total MUST ensure a NET margin of 20%
     - NET margin = (Final Total - Total Cost) / Final Total
     - Total Cost = Subtotal + Overhead Costs (workers comp, insurance, office)
     - If calculated total doesn't achieve 20% NET margin, adjust to meet target
   - Apply discount if any: Final total - discount amount
   - **NOTE:** The system will automatically calculate the final total from your changes - you don't need to include totalAmount in your output

5. **Structured Output Format:**
   You MUST return your response in TWO parts:
   
   **Part 1: Conversational Response** (natural, helpful text)
   **Part 2: Structured JSON Actions** (exact changes to make)
   
   Format your response like this:
   
   [Your conversational response here - be helpful and natural]
   
   <STRUCTURED_ACTIONS>
   {
     "response": "Your conversational response text",
     "actions": {
       "materials": [
         {"name": "Material Name", "quantity": 30, "unit": "squares", "unitPrice": 150, "total": 4500}
       ],
       "addOns": [
         {"name": "Optional Upgrade Name", "description": "Description", "price": 2500}
       ],
       "labor": [
         {"name": "Roofing Labor", "hours": 40, "rate": 75, "total": 3000}
       ],
       "removals": ["Exact Material Name 1", "Exact Material Name 2"],
       "updates": [
         {"name": "Existing Material Name", "unitPrice": 3373.50, "total": 10120.50}
       ],
       "overheadPercent": 15,
       "profitPercent": 20,
       "overheadCostPercent": 10,
       "netMarginTarget": 20
       // NOTE: totalAmount is automatically calculated - don't include it
     }
   }
   </STRUCTURED_ACTIONS>
   
   **CRITICAL - Handling Removals:**
   - When the user asks to REMOVE items, look at the CURRENT PROPOSAL DATA materials list
   - Match the user's request (even with typos) to the EXACT material names in the proposal
   - Return removals in the "removals" array with EXACT names from the proposal
   - Example: User says "remove brava filed tile" (typo) → You see "Brava Field Tile" in materials → Return ["Brava Field Tile"]
   - Use your intelligence to match typos and variations to the correct material name
   - Be precise - if user says "remove brava starter and brava h&r", ONLY remove those two, NOT all Brava items
   
   **CRITICAL - Handling Updates:**
   - When user asks to CHANGE/UPDATE a material's price or quantity, include it in "updates" array
   - Use the EXACT material name from the current proposal
   - Include only the fields that are changing (unitPrice, quantity, total, etc.)
   - The system will merge updates with existing materials
   
   **NET Margin and Overhead Costs:**
   - overheadCostPercent: Always 10% (workers comp, insurance, office costs)
   - netMarginTarget: Always 20% (target NET margin)
   - The system will automatically calculate and ensure NET margin is met
   
   **IMPORTANT - When Updating Existing Items:**
   - If the user asks to CHANGE the price of an existing material (e.g., "change Grace Ice and Water Shield to $260"), 
     include that material in the "updates" array with the NEW price
   - If the user asks to CHANGE the quantity, include the material in "updates" with the NEW quantity
   - Always include the material name EXACTLY as it appears in the current proposal (check proposalContext.materials)
   - Recalculate the total: total = quantity × unitPrice

**Pricing Rules (Critical):**
${pricingStatus === 'LOADED' 
  ? `- ALWAYS use EXACT prices from the company's pricing sheets (provided below)
- If a material isn't in the pricing sheets, say "I don't see [material] in your pricing sheets" and ask what price to use
- NEVER invent or estimate prices - only use what's provided`
  : `- **STOP - NO PRICING DATA AVAILABLE**
- You CANNOT provide any prices because the pricing sheet is not accessible
- Tell the user: "I cannot access your pricing sheet. Please resync your pricing sheet in the app settings."
- DO NOT provide any cost estimates, material prices, or pricing information
- DO NOT make up prices or use "typical" prices`}
- Double-check all math - accuracy is critical
- Validate: quantity × unitPrice = total for each line item
- **NET Margin:** Always ensure 20% NET margin is achieved
- **Overhead Costs:** Always include 10% for workers comp, insurance, and office costs
- You can adjust overheadCostPercent and netMarginTarget if the user requests changes

${pricingStatus === 'LOADED' ? pricingContext : ''}

**Conversation Style:**
- Be natural and conversational - talk like you're helping a colleague
- Use "I" and "you" naturally
- **ASK FIRST, DON'T ASSUME:** When you see multiple similar products or aren't sure which material to use, ask the user for clarification BEFORE adding materials
- Ask clarifying questions when needed - it's better to ask than to guess wrong
- Be helpful and engaging
- Operate like a real person with 40 years of roofing experience

${pricingStatus === 'LOADED' && pricingContext ? `\n**Available Pricing Data:**\n${pricingContext}\n\nUse these exact prices from the company's pricing sheets. If something isn't listed, ask the user for the price.` : ''}`;
};

// Chat with Claude for general roofing questions
export const chatWithClaude = async (message, conversationHistory = [], proposalContext = null) => {
  logger.info('🤖 chatWithClaude called');
  logger.info('Message length:', message?.length);
  logger.info('Conversation history length:', conversationHistory?.length);
  logger.info('Has proposal context:', !!proposalContext);
  logger.info('Has Claude client:', !!claude);
  logger.info('Has API key:', !!process.env.ANTHROPIC_API_KEY);
  
  // Check for missing info if proposal context is provided
  let missingInfoCheck = null;
  if (proposalContext) {
    missingInfoCheck = checkProposalCompleteness(proposalContext);
    
    // If user is asking to generate a quote but missing required info, modify the message
    const isQuoteRequest = message.toLowerCase().includes('quote') || 
                          message.toLowerCase().includes('estimate') ||
                          message.toLowerCase().includes('generate') ||
                          message.toLowerCase().includes('create proposal');
    
    if (isQuoteRequest && !missingInfoCheck.canGenerate && missingInfoCheck.questions) {
      // Prepend the missing info questions to the message
      message = `${missingInfoCheck.questions}\n\n${message}`;
      console.log('⚠️ Missing required info detected, asking questions before generating quote');
    }
  }

  // Fetch real pricing data DIRECTLY from database (no HTTP call - more reliable)
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

  try {
    logger.info('🔍 [PRICING DEBUG] Starting pricing fetch for AI chat...');
    
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

            // Check for existing snapshot first (preferred - fast and reliable)
            const existingSnapshot = sheet.specifications?.pricingSnapshot;
            if (existingSnapshot?.materials?.length || existingSnapshot?.rawCsvData) {
              logger.info(`✅ [PRICING DEBUG] Using stored snapshot for ${sheet.name}: ${existingSnapshot.materials?.length || 0} materials`);
              pricingData.push({
                sheetName: sheet.name,
                materials: existingSnapshot.materials || [],
                rawCsvData: existingSnapshot.rawCsvData || null, // Include raw CSV data
                totalItems: existingSnapshot.materials?.length || 0,
                lastSyncedAt: existingSnapshot.lastSyncedAt || sheet.specifications?.lastSyncedAt || null,
                source: 'snapshot'
              });
              debugInfo.sheetsWithSnapshots++;
              debugInfo.totalMaterials += existingSnapshot.materials?.length || 0;
              continue;
            }

            // No snapshot - fetch from Google (fallback only)
            logger.info(`⚠️ [PRICING DEBUG] No snapshot found for ${sheet.name}, fetching from Google Sheets...`);
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
        pricingContext = ''; // Clear pricing context so AI knows it can't see pricing
      } else {
        // Build pricing context string for Claude
        pricingStatus = 'LOADED';
        logger.info(`✅ [PRICING DEBUG] Building pricing context from ${pricingData.length} sheets, ${debugInfo.totalMaterials} total materials`);
        
        pricingContext = `\n\n=== AUTHORIZED PRICING DATA (USE ONLY THESE PRICES) ===\n`;
        
        pricingData.forEach(sheet => {
          pricingContext += `\n**${sheet.sheetName}** (${sheet.source === 'snapshot' ? 'from snapshot' : 'fresh from Google'}, synced: ${sheet.lastSyncedAt || 'unknown'}):\n`;
          
          // If raw CSV data is available, use that (includes ALL columns)
          if (sheet.rawCsvData) {
            pricingContext += `\n\`\`\`\n${sheet.rawCsvData}\n\`\`\`\n`;
            pricingContext += `\n**Note:** This pricing sheet contains ALL columns from the original spreadsheet. Use the column headers to understand what each field represents.\n`;
          } else {
            // Fallback to parsed materials if raw CSV not available
            const materialsByCategory = {};
            sheet.materials.forEach(material => {
              const category = material.category || 'General';
              if (!materialsByCategory[category]) {
                materialsByCategory[category] = [];
              }
              materialsByCategory[category].push(material);
            });
            
            // Display grouped by category
            Object.keys(materialsByCategory).sort().forEach(category => {
              pricingContext += `\n**${category}:**\n`;
              materialsByCategory[category].forEach(material => {
                let materialLine = `  - ${material.name}`;
                if (material.description && material.description.trim()) {
                  materialLine += ` (${material.description.trim()})`;
                }
                materialLine += `: $${material.materialCost} (material) + $${material.laborCost} (labor) = $${material.totalPrice} per ${material.unit}`;
                if (material.minOrder && material.minOrder.trim()) {
                  materialLine += ` | Min order: ${material.minOrder}`;
                }
                if (material.notes && material.notes.trim() && material.notes !== material.description) {
                  materialLine += ` | Notes: ${material.notes.trim()}`;
                }
                pricingContext += materialLine + `\n`;
              });
            });
          }
        });
        
        pricingContext += `\n**RULES:**\n`;
        pricingContext += `- ONLY use prices listed above\n`;
        pricingContext += `- **UNDERSTAND THE STRUCTURE:** The pricing data is shown as a CSV table with ALL columns from the original spreadsheet. Use the column headers (first row) to understand what each field represents.\n`;
        pricingContext += `- **Categories:** Materials are organized by CATEGORY (typically in the first column). Each category contains MULTIPLE DIFFERENT PRODUCTS with different names, descriptions, and prices.\n`;
        pricingContext += `- **CRITICAL - Category vs. Product:** When a user mentions a category name (e.g., "Brava" or "Brava shake"), they're referring to the CATEGORY, not a specific product. You MUST ask which specific product they want from that category.\n`;
        pricingContext += `- **Example:** If user says "Brava shake shingles" and you see "BRAVA SHAKE" category with multiple products like "Brava Field Tile", "Brava Starter", and "Brava H&R", ask: "I see multiple Brava products in your pricing sheet. Which specific product would you like to use?"\n`;
        pricingContext += `- **NEVER add multiple products from the same category unless explicitly requested** - each product name is a DISTINCT item with different prices and specifications\n`;
        pricingContext += `- **Use ALL columns:** All columns from the pricing sheet are provided - use them to understand product details, descriptions, units, pricing breakdowns, etc.\n`;
        pricingContext += `- If a material isn't listed, say "I don't see [material] in your pricing sheets" and ask what price to use\n`;
        pricingContext += `- NEVER invent or estimate prices - only use what's provided in the pricing sheet\n`;
        
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

  // Build system prompt with info about missing fields if applicable
  let infoGuidance = '';
  if (missingInfoCheck && !missingInfoCheck.canGenerate) {
    infoGuidance = `\n\n**IMPORTANT - Missing Information:**\nThe user is trying to generate a quote, but some required information is missing. Ask for the missing details before generating the quote. The missing info questions have been added to the user's message.`;
  }

  // Load company AI instructions (use companyId from debugInfo which was set earlier)
  let companyAIInstructions = null;
  let locationKnowledge = '';
  if (companyId) {
    try {
      const company = await Company.findByPk(companyId);
      if (company && company.aiInstructions) {
        companyAIInstructions = company.aiInstructions;
        logger.info('✅ Loaded company AI instructions');
        
        // Build location-specific knowledge if proposal has a city
        if (proposalContext?.property?.city && companyAIInstructions.locationKnowledge) {
          const city = proposalContext.property.city;
          const state = proposalContext.property.state || '';
          const locationKey = state ? `${city}, ${state}` : city;
          
          // Try exact match first
          if (companyAIInstructions.locationKnowledge[locationKey]) {
            locationKnowledge = companyAIInstructions.locationKnowledge[locationKey];
            logger.info(`✅ Loaded location knowledge for: ${locationKey}`);
          } else {
            // Try case-insensitive match
            const locationKeys = Object.keys(companyAIInstructions.locationKnowledge);
            const matchedKey = locationKeys.find(key => 
              key.toLowerCase() === locationKey.toLowerCase()
            );
            if (matchedKey) {
              locationKnowledge = companyAIInstructions.locationKnowledge[matchedKey];
              logger.info(`✅ Loaded location knowledge for: ${matchedKey} (matched ${locationKey})`);
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to load company AI instructions:', error.message);
    }
  }

  // Get core system prompt
  const coreSystemPrompt = getCoreSystemPrompt(pricingStatus, pricingContext, infoGuidance);
  
  // Build final system prompt with company instructions and location knowledge
  let systemPrompt = coreSystemPrompt;
  
  if (companyAIInstructions?.additionalInstructions) {
    systemPrompt += `\n\n**ADDITIONAL COMPANY INSTRUCTIONS:**\n${companyAIInstructions.additionalInstructions}\n`;
  }
  
  if (locationKnowledge) {
    const locationLabel = proposalContext?.property?.city 
      ? (proposalContext.property.state ? `${proposalContext.property.city}, ${proposalContext.property.state}` : proposalContext.property.city)
      : 'this location';
    systemPrompt += `\n\n**LOCATION-SPECIFIC KNOWLEDGE (${locationLabel}):**\n${locationKnowledge}\n`;
  }

  // Build messages array for Claude API
  const messages = [];
  
  // Add conversation history (already in correct format: {role, content})
  if (conversationHistory.length > 0) {
    messages.push(...conversationHistory);
  }
  
  // Add current message with context if provided
  let currentMessage = message;
  if (proposalContext) {
    // Add structured context to the message
    const contextText = `\n\n**Current Proposal Context:**\n${JSON.stringify(proposalContext, null, 2)}`;
    currentMessage = message + contextText;
  }
  
  messages.push({
    role: 'user',
    content: currentMessage
  });

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
      messages: messages
    });

    const responseText = response.content[0].text;
    logger.info('✅ Claude response received, length:', responseText?.length);
    
    // Parse structured actions from response
    let structuredActions = null;
    let conversationalResponse = responseText;
    
    // Look for <STRUCTURED_ACTIONS> tag
    const structuredMatch = responseText.match(/<STRUCTURED_ACTIONS>([\s\S]*?)<\/STRUCTURED_ACTIONS>/);
    if (structuredMatch) {
      try {
        structuredActions = JSON.parse(structuredMatch[1].trim());
        // Remove structured actions from conversational response
        conversationalResponse = responseText.replace(/<STRUCTURED_ACTIONS>[\s\S]*?<\/STRUCTURED_ACTIONS>/, '').trim();
        logger.info('✅ Parsed structured actions from Claude response');
      } catch (parseError) {
        logger.warn('Failed to parse structured actions:', parseError.message);
        // Fall back to full response text
      }
    }
    
    return {
      response: conversationalResponse,
      actions: structuredActions
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
