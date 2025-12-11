import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { aiConfig } from '../config/openai.js';
import logger from '../utils/logger.js';
import { checkProposalCompleteness } from '../utils/infoChecker.js';

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

  // Fetch real pricing data from the company's uploaded pricing sheets
  let pricingContext = '';
  try {
    const axios = (await import('axios')).default;
    const baseURL = process.env.NODE_ENV === 'production' 
      ? process.env.API_URL || 'http://localhost:3001'
      : 'http://localhost:3001';
    
    console.log('🔍 Fetching real pricing data for AI...');
    const pricingResponse = await axios.get(`${baseURL}/api/materials/ai-pricing`);
    
    if (pricingResponse.data.success && pricingResponse.data.pricingSheets.length > 0) {
      console.log(`✅ Found ${pricingResponse.data.pricingSheets.length} pricing sheets with real data`);
      
      pricingContext = `\n\n=== AUTHORIZED PRICING DATA (USE ONLY THESE PRICES) ===\n`;
      
      pricingResponse.data.pricingSheets.forEach(sheet => {
        pricingContext += `\n**${sheet.sheetName}:**\n`;
        sheet.materials.forEach(material => {
          pricingContext += `- ${material.name}: $${material.materialCost} (material) + $${material.laborCost} (labor) = $${material.totalPrice} per ${material.unit}\n`;
        });
      });
      
      pricingContext += `\n**RULES:**\n`;
      pricingContext += `- ONLY use prices listed above\n`;
      pricingContext += `- If a material isn't listed, say "I don't see [material] in your pricing sheets" and ask what price to use\n`;
      pricingContext += `- NEVER invent or estimate prices - only use what's provided\n`;
    } else {
      console.log('⚠️ No pricing sheets found, using generic pricing');
    }
  } catch (error) {
    console.error('❌ Failed to fetch pricing data for AI:', error.message);
  }

  // Build system prompt with info about missing fields if applicable
  let infoGuidance = '';
  if (missingInfoCheck && !missingInfoCheck.canGenerate) {
    infoGuidance = `\n\n**IMPORTANT - Missing Information:**\nThe user is trying to generate a quote, but some required information is missing. Ask for the missing details before generating the quote. The missing info questions have been added to the user's message.`;
  }

  const systemPrompt = `You're a helpful roofing expert assistant helping create estimates and proposals. Talk naturally and conversationally, just like ChatGPT - be friendly, engaging, and helpful.

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
