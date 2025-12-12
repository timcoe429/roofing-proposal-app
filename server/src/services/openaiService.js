import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { aiConfig } from '../config/openai.js';
import logger from '../utils/logger.js';
import { checkProposalCompleteness } from '../utils/infoChecker.js';
import Material from '../models/Material.js';
import Company from '../models/Company.js';
import { fetchGoogleSheetData } from './googleSheetsService.js';

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
    let companyId = null;
    
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
            if (existingSnapshot?.materials?.length) {
              logger.info(`✅ [PRICING DEBUG] Using stored snapshot for ${sheet.name}: ${existingSnapshot.materials.length} materials`);
              pricingData.push({
                sheetName: sheet.name,
                materials: existingSnapshot.materials,
                totalItems: existingSnapshot.materials.length,
                lastSyncedAt: existingSnapshot.lastSyncedAt || sheet.specifications?.lastSyncedAt || null,
                source: 'snapshot'
              });
              debugInfo.sheetsWithSnapshots++;
              debugInfo.totalMaterials += existingSnapshot.materials.length;
              continue;
            }

            // No snapshot - fetch from Google (fallback)
            logger.info(`⚠️ [PRICING DEBUG] No snapshot found for ${sheet.name}, fetching from Google Sheets...`);
            try {
              const sheetData = await fetchGoogleSheetData(sheetUrl);
              logger.info(`✅ [PRICING DEBUG] Fetched ${sheetData.rowCount} rows from Google Sheet`);
              
              // Build snapshot (same logic as materialController)
              const parseMoney = (value) => {
                if (value === null || value === undefined) return 0;
                const cleaned = String(value).replace(/[$,\s]/g, '').trim();
                const num = parseFloat(cleaned);
                return Number.isFinite(num) ? num : 0;
              };

              const rows = Array.isArray(sheetData?.rows) ? sheetData.rows : [];
              const materials = [];
              for (let i = 1; i < rows.length; i++) {
                const row = rows[i] || [];
                const name = (row[1] || '').toString().trim();
                if (!name) continue;
                
                const materialCost = parseMoney(row[3]);
                const laborCost = parseMoney(row[4]);
                const totalPrice = parseMoney(row[5]);
                if (materialCost === 0 && laborCost === 0 && totalPrice === 0) continue;

                materials.push({
                  category: (row[0] || '').toString().trim() || 'General',
                  name,
                  unit: (row[2] || '').toString().trim() || 'Per Square',
                  materialCost,
                  laborCost,
                  totalPrice,
                  minOrder: (row[6] || '').toString().trim(),
                  notes: (row[7] || '').toString().trim()
                });
              }

              logger.info(`✅ [PRICING DEBUG] Parsed ${materials.length} materials from Google Sheet`);
              
              pricingData.push({
                sheetName: sheet.name,
                materials,
                totalItems: materials.length,
                lastSyncedAt: new Date().toISOString(),
                source: 'google_fetch'
              });
              debugInfo.sheetsFetchedFromGoogle++;
              debugInfo.totalMaterials += materials.length;
            } catch (fetchError) {
              logger.error(`❌ [PRICING DEBUG] Failed to fetch Google Sheet for ${sheet.name}:`, fetchError.message);
              debugInfo.errors.push({ sheet: sheet.name, error: fetchError.message });
            }
          } else {
            logger.info(`⚠️ [PRICING DEBUG] Sheet ${sheet.name} is not a Google Sheets URL type, skipping`);
          }
        } catch (sheetError) {
          logger.error(`❌ [PRICING DEBUG] Error processing sheet ${sheet.name}:`, sheetError.message);
          debugInfo.errors.push({ sheet: sheet.name, error: sheetError.message });
        }
      }

      // Build pricing context string for Claude
      if (pricingData.length > 0) {
        pricingStatus = 'LOADED';
        logger.info(`✅ [PRICING DEBUG] Building pricing context from ${pricingData.length} sheets, ${debugInfo.totalMaterials} total materials`);
        
        pricingContext = `\n\n=== AUTHORIZED PRICING DATA (USE ONLY THESE PRICES) ===\n`;
        
        pricingData.forEach(sheet => {
          pricingContext += `\n**${sheet.sheetName}** (${sheet.source === 'snapshot' ? 'from snapshot' : 'fresh from Google'}, synced: ${sheet.lastSyncedAt || 'unknown'}):\n`;
          sheet.materials.forEach(material => {
            pricingContext += `- ${material.name}: $${material.materialCost} (material) + $${material.laborCost} (labor) = $${material.totalPrice} per ${material.unit}\n`;
          });
        });
        
        pricingContext += `\n**RULES:**\n`;
        pricingContext += `- ONLY use prices listed above\n`;
        pricingContext += `- If a material isn't listed, say "I don't see [material] in your pricing sheets" and ask what price to use\n`;
        pricingContext += `- NEVER invent or estimate prices - only use what's provided\n`;
        
        logger.info(`✅ [PRICING DEBUG] Pricing context built: ${pricingContext.length} characters`);
      } else {
        logger.warn(`⚠️ [PRICING DEBUG] No pricing data found after processing ${pricingSheets.length} sheets`);
        debugInfo.step = 'no_data_after_processing';
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

  const systemPrompt = `You're a helpful roofing expert assistant helping create estimates and proposals. Talk naturally and conversationally, just like ChatGPT - be friendly, engaging, and helpful.

**CRITICAL - Pricing Status: ${pricingStatus}**
${pricingStatus === 'LOADED' 
  ? '✅ PRICING IS LOADED. You MUST acknowledge that pricing sheets are available. NEVER say "no pricing sheet" or "upload your pricing sheet" - pricing is already loaded and ready to use.'
  : '⚠️ PRICING IS NOT LOADED. Tell the user they need to upload/resync their pricing sheet before you can provide accurate cost estimates.'}

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
   - Match materials by name - if exact match isn't found, ask the user
   - Use material cost + labor cost from pricing sheet for total price per unit
   - If a material isn't in the pricing sheets, ask the user what price to use - don't guess

3. **Calculate Labor:**
   - Base labor on roof complexity and square footage
   - Use labor rates from pricing sheets when available
   - Factor in tear-off time if multiple layers
   - Include setup, cleanup, and disposal time

4. **Apply Margins:**
   - Calculate subtotal: Materials + Labor + Add-ons
   - Add overhead: Subtotal × (overhead % / 100)
   - Add profit: (Subtotal + Overhead) × (profit % / 100)
   - Apply discount if any: Final total - discount amount

5. **Format Output:**
   When updating the proposal, return structured data in this format:
   {
     "materials": [
       {"name": "Material Name", "quantity": 30, "unit": "squares", "unitPrice": 150, "total": 4500, "category": "material"},
       {"name": "Labor Description", "quantity": 40, "unit": "hours", "unitPrice": 75, "total": 3000, "category": "labor"}
     ],
     "overheadPercent": 15,
     "profitPercent": 20,
     "totalAmount": 8625
   }
   
   **IMPORTANT - When Updating Existing Items:**
   - If the user asks to CHANGE the price of an existing material (e.g., "change Grace Ice and Water Shield to $260"), 
     include that material in the materials array with the NEW price
   - If the user asks to CHANGE the quantity, include the material with the NEW quantity
   - The system will automatically match materials by name and update the existing entry
   - Always include the material name EXACTLY as it appears in the current proposal (check proposalContext.materials)
   - Recalculate the total: total = quantity × unitPrice

**Pricing Rules (Critical):**
- ALWAYS use EXACT prices from the company's pricing sheets when available
- If a material isn't in the pricing sheets, ask the user what price to use - don't guess
- Double-check all math - accuracy is critical
- Validate: quantity × unitPrice = total for each line item

**Conversation Style:**
- Be natural and conversational - talk like you're helping a colleague
- Use "I" and "you" naturally
- Ask clarifying questions when needed
- Be helpful and engaging

${pricingContext ? `\n**Available Pricing Data:**\n${pricingContext}\n\nUse these exact prices from the company's pricing sheets. If something isn't listed, ask the user for the price.` : '\n**Note:** No pricing sheets are loaded yet. Ask the user to upload their pricing sheet before providing cost estimates.'}`;

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
    return responseText;
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
