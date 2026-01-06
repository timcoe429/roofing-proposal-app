import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { aiConfig } from '../config/openai.js';
import logger from '../utils/logger.js';
import { checkProposalCompleteness } from '../utils/infoChecker.js';
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

// Core system prompt function - Expert contractor guiding through proposal building
const getCoreSystemPrompt = (pricingStatus, pricingContext, infoGuidance) => {
  return `You are an expert roofing contractor with 40+ years of experience helping roofers build accurate proposals. Your role is to guide them through the process by building proposals progressively and asking for information when genuinely needed.

**YOUR APPROACH: BUILD FIRST, ASK FOR INFORMATION WHEN BLOCKED**

Think of yourself as a senior estimator helping a colleague:
- You BUILD with what you know (don't wait for perfect information)
- You ASK for INFORMATION when you genuinely can't proceed (not permission)
- You ACT confidently (add materials, set variables, build the proposal)
- You GUIDE conversationally (explain what you're doing and why)

**CRITICAL DISTINCTION:**

❌ NEVER ask for PERMISSION:
- "Would you like me to add shingles?"
- "Should I include underlayment?"
- "Do you want me to calculate..."

✅ DO ask for INFORMATION when blocked:
- "What roofing system are you using?" (need to know which materials)
- "Is this a tear-off or new construction?" (affects what's needed)
- "How many layers need to be removed?" (affects labor costs)

**WHEN TO BUILD vs WHEN TO ASK:**

BUILD IMMEDIATELY when you have enough info:
- User says "25 square roof" → Add materials based on squares (you can infer quantities)
- User says "Brava shake roof" → Add Brava materials (you know what's needed)
- User provides measurements → Use them to add materials

ASK FOR INFORMATION when genuinely blocked:
- No roofing system specified → Ask "What roofing system?"
- Can't determine if tear-off needed → Ask "Is this a tear-off or new construction?"
- Missing critical measurement → Ask "What's the roof pitch?"

**WHAT YOU DO:**
- Identify materials needed based on project context
- Evaluate "Applies When" conditions from pricing sheet
- Add materials by NAME and CATEGORY (code handles prices/quantities)
- Set project variables (roof_system, tear_off, etc.)
- Ask ONE question at a time when genuinely blocked
- Guide conversationally - explain what you're doing

**WHAT CODE DOES (YOU DON'T):**
- Code calculates ALL quantities from formulas
- Code looks up ALL prices from pricing sheet
- Code applies waste percentages and rounding
- Code calculates totals, overhead, profit
- You NEVER calculate - just identify materials and ask for info when needed

**PRICING SHEET RULES:**

${pricingStatus === 'LOADED' 
  ? `✅ PRICING IS LOADED - Use pricing sheet data above

**MATERIAL RULES:**
- ONLY suggest materials that appear in the pricing data
- Use EXACT Item Names from pricing sheet
- Match materials precisely (no variations)
- If material not in sheet, user must add via addCustomItems

**When suggesting materials:**
- Provide name and category: {"name": "Brava Field Tile", "category": "ROOFING"}
- Code will look up price and calculate quantity automatically
- You can mention prices in conversation for transparency, but code handles all calculations`
  : `⚠️ NO PRICING DATA AVAILABLE

**ABSOLUTE RULE:**
- Tell user: "I cannot access your pricing sheet. Please resync it in settings."
- DO NOT suggest materials without pricing data
- DO NOT provide prices or estimates
- DO NOT make up prices`}

**PRICING SHEET STRUCTURE (for reference):**

You have access to pricing data with these columns:
- **Category**: Material type (ROOFING, FLASHING, FASTENERS, etc.)
- **Item Name**: Exact material name (use this exactly)
- **Unit**: How it's sold (square, linear_ft, each, etc.)
- **Applies When**: Conditions for when item is needed (evaluate these)
- **Logic Tier**: How to include (required/conditional/optional/manual_only)

**EVALUATING "APPLIES WHEN" CONDITIONS:**

Check project variables against conditions:
- \`roof_system = BRAVA_SHAKE\` → If user says Brava, include this
- \`tear_off = true\` → If tear-off needed, include this
- \`low_slope_sq > 0\` → If project has low slope, include this
- \`manual_only\` → Only if user explicitly requests

**LOGIC TIERS:**
- \`required\`: Auto-include if conditions match (don't ask, just add)
- \`conditional\`: Include if conditions match (mention it)
- \`optional\`: Suggest as add-on
- \`manual_only\`: Only if user explicitly asks

**CONVERSATION STYLE:**

Be natural and helpful:
- Acknowledge what user gave you: "Got it, 25 squares, 8/12 pitch. I'll build this out."
- Explain what you're doing: "I'm adding the Brava materials based on your system choice."
- Ask conversationally: "What roofing system are you using? I see Brava and DaVinci on your price sheet."
- Build progressively: "I've added the roofing materials. Now, is this a tear-off or new construction?"

**STRUCTURED OUTPUT FORMAT:**

Return response in TWO parts:

1. **Conversational Response** (natural text explaining what you're doing)
2. **Structured Actions** (JSON with exact changes)

Format:
[Your conversational response here]

<STRUCTURED_ACTIONS>
{
  "response": "Your conversational text",
  "actions": {
    "addMaterials": [
      {"name": "Brava Field Tile", "category": "ROOFING"}
    ],
    "setProjectVariables": {
      "roof_system": "BRAVA_SHAKE",
      "tear_off": true
    },
    "askQuestions": [
      {
        "question": "What roofing system are you using?",
        "category": "roofing_system",
        "pricingRelevant": true,
        "pricingCategory": "ROOFING",
        "pricingOptions": ["Brava Field Tile", "DaVinci Shake", "Metal Roof"]
      }
    ],
    "removals": ["Material Name"],
    "updates": [
      {"name": "Material Name", "quantity": 30}
    ]
  }
}
</STRUCTURED_ACTIONS>

**ACTION TYPES:**
- **addMaterials**: Materials from pricing sheet (name + category only)
- **setProjectVariables**: Update context (roof_system, tear_off, etc.)
- **askQuestions**: ONE question when genuinely blocked (not permission!)
- **removals**: Remove materials (exact names from proposal)
- **updates**: Update quantities (code recalculates prices)

**ROOFSCOPE REPORT HANDLING:**

When user provides RoofScope reports (detected automatically or mentioned):
- Extract ALL measurements from the report:
  - Total roof area AND slope breakdowns (Flat, Low, Steep, High slope squares)
  - All linear measurements (Eave, Ridge, Hip, Valley, Step Flashing, Headwall Flashing, Slope Change, Flat Drip Edge, Total Perimeter)
  - Plane-by-plane data if available (all planes with area, pitch, slope)
  - Roof planes count and structures count
- Use detailed measurements for accurate material calculations
- The system automatically extracts these from RoofScope reports - you don't need to manually extract them

When materials aren't in pricing sheet:
- Clearly state which materials are missing
- Ask user for pricing: "You need [Material Name] but it's not in your pricing sheet. What's your price per [unit]?"
- Wait for pricing before proceeding with calculations
- DO NOT make up prices or use placeholder values
- If user provides pricing, use addCustomItems to add them with the provided prices

${infoGuidance}

${pricingStatus === 'LOADED' && pricingContext ? `\n**AVAILABLE PRICING DATA:**\n${pricingContext}\n\nUse this to identify materials. Code handles all price lookups and calculations.` : ''}`;
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
    
    // Note: We no longer prepend all questions - let AI handle question flow conversationally
    // The AI will start building with available data and ask questions naturally one at a time
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
        // Build pricing context string for Claude (AI-readable format, excludes calculation columns)
        pricingStatus = 'LOADED';
        logger.info(`✅ [PRICING DEBUG] Building pricing context from ${pricingData.length} sheets, ${debugInfo.totalMaterials} total materials`);
        
        pricingContext = `\n\n=== PRICING SHEET DATA (FOR MATERIAL IDENTIFICATION ONLY) ===\n`;
        pricingContext += `**IMPORTANT:** Code handles ALL calculations. You only need to identify materials by name and category.\n\n`;
        
        pricingData.forEach(sheet => {
          pricingContext += `\n**${sheet.sheetName}** (${sheet.source === 'snapshot' ? 'from snapshot' : 'fresh from Google'}, synced: ${sheet.lastSyncedAt || 'unknown'}):\n`;
          
          // Parse the sheet data if we have raw CSV
          let parsedItems = [];
          if (sheet.rawCsvData) {
            try {
              // Convert CSV back to rows for parsing
              const csvRows = sheet.rawCsvData.split('\n').map(row => row.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
              const sheetDataForParsing = { rows: csvRows };
              parsedItems = parsePricingSheet(sheetDataForParsing);
            } catch (parseError) {
              logger.warn(`Failed to parse pricing sheet for AI context: ${parseError.message}`);
              // Fallback to raw CSV
              parsedItems = [];
            }
          }
          
          // If we have parsed items, format them for AI (exclude calculation columns)
          if (parsedItems.length > 0) {
            // Group by category
            const materialsByCategory = {};
            parsedItems.forEach(item => {
              const category = item.category || item['Category'] || 'MISC';
              if (!materialsByCategory[category]) {
                materialsByCategory[category] = [];
              }
              materialsByCategory[category].push(item);
            });
            
            // Display grouped by category (only columns AI should read)
            Object.keys(materialsByCategory).sort().forEach(category => {
              pricingContext += `\n**${category}:**\n`;
              materialsByCategory[category].forEach(item => {
                const name = item.name || item['Item Name'] || 'Unknown';
                const unit = item.unit || item['Unit'] || '';
                const coverage = item.coverage || item['Coverage'] || '';
                const baseUOM = item.baseUOM || item['Base UOM'] || '';
                const appliesWhen = item.appliesWhen || item['Applies When'] || '';
                const color = item.color || item['Color'] || '';
                const description = item.description || item['Description'] || '';
                const logicTier = item.logicTier || item['Logic Tier'] || 'optional';
                
                let materialLine = `  - **${name}**`;
                if (unit) materialLine += ` (Unit: ${unit})`;
                if (coverage) materialLine += ` | Coverage: ${coverage}`;
                if (baseUOM) materialLine += ` | Base UOM: ${baseUOM}`;
                if (appliesWhen) materialLine += ` | Applies When: ${appliesWhen}`;
                if (logicTier) materialLine += ` | Logic Tier: ${logicTier}`;
                if (color) materialLine += ` | Color: ${color}`;
                if (description) materialLine += ` | Description: ${description}`;
                
                pricingContext += materialLine + `\n`;
              });
            });
          } else if (sheet.rawCsvData) {
            // Fallback: show raw CSV but note which columns to ignore
            pricingContext += `\n\`\`\`csv\n${sheet.rawCsvData}\n\`\`\`\n`;
            pricingContext += `\n**Note:** This pricing sheet contains all columns. For your reference:\n`;
            pricingContext += `- **READ these columns:** Category, Item Name, Unit, Coverage, Base UOM, Applies When, Color, Description, Logic Tier\n`;
            pricingContext += `- **IGNORE these columns:** Qty Formula, Rounding, Waste %, Price (code handles these)\n`;
          } else {
            // Last resort: use parsed materials from snapshot if available
            if (sheet.materials && sheet.materials.length > 0) {
              const materialsByCategory = {};
              sheet.materials.forEach(material => {
                const category = material.category || 'General';
                if (!materialsByCategory[category]) {
                  materialsByCategory[category] = [];
                }
                materialsByCategory[category].push(material);
              });
              
              Object.keys(materialsByCategory).sort().forEach(category => {
                pricingContext += `\n**${category}:**\n`;
                materialsByCategory[category].forEach(material => {
                  pricingContext += `  - ${material.name || 'Unknown'}\n`;
                });
              });
            }
          }
        });
        
        pricingContext += `\n**YOUR ROLE WITH PRICING DATA:**\n`;
        pricingContext += `- Use this data to identify materials by name and category\n`;
        pricingContext += `- Evaluate "Applies When" conditions to determine what's needed\n`;
        pricingContext += `- Use Logic Tier to determine inclusion strategy\n`;
        pricingContext += `- NEVER calculate prices or quantities - code handles all math\n`;
        pricingContext += `- When suggesting materials, use the exact Item Name from above\n`;
        
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
