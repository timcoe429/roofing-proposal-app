import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { aiConfig } from '../config/openai.js';
import logger from '../utils/logger.js';

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
export const chatWithClaude = async (message, conversationHistory = []) => {
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

  const systemPrompt = `You're a helpful roofing expert assistant helping create proposals. Be conversational and natural - like ChatGPT - but stay focused on roofing estimates and proposals.

=== CONVERSATION STYLE ===
- Talk naturally and friendly, like you're chatting with a colleague
- Use "I" and "you" naturally - it's okay to be conversational
- Ask clarifying questions when you need more info
- Be helpful and engaging, not robotic or overly formal
- It's fine to say things like "I can help with that" or "Let me calculate that for you"

=== TOPIC BOUNDARIES (STAY FOCUSED) ===
- ONLY discuss roofing, roofing estimates, proposals, materials, labor, and project details
- If asked about unrelated topics (cooking, sports, general chat), politely redirect: "I'm focused on helping with roofing proposals. How can I help with your estimate?"
- Keep conversations relevant to creating and refining roofing proposals
- You can discuss roofing techniques, materials, costs, timelines, warranties - all roofing-related

=== PRICING ACCURACY (CRITICAL - NO HALLUCINATIONS) ===
- ALWAYS use EXACT prices from the company's pricing sheets (provided below)
- If a material isn't in the pricing sheets, say: "I don't see [material] in your pricing sheets. Could you add it, or should I use a placeholder?"
- NEVER make up prices - if pricing isn't available, ask rather than guess
- When calculating totals:
  * Materials + Labor = Subtotal
  * Add overhead (15% of subtotal)
  * Add profit (20% of subtotal + overhead)
  * Include permits/disposal in base costs

=== WHAT YOU CAN HELP WITH ===
- Calculate materials, labor, and costs for roofing projects
- Suggest materials and approaches based on the project
- Answer roofing questions (within scope)
- Update proposal data when asked
- Help with measurements and estimates
- Discuss roofing best practices and recommendations

${pricingContext ? `\n=== COMPANY PRICING DATA ===\n${pricingContext}\n\nCRITICAL: Only use prices from above. If something isn't listed, ask rather than guessing.` : '\n=== PRICING ===\nNo pricing sheets loaded yet. Ask for pricing before providing cost estimates.'}`;

  const context = conversationHistory.length > 0 
    ? `Previous conversation:\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
    : '';

  return await processWithClaude(message, context, systemPrompt);
};

export default {
  processImageWithVision,
  processWithClaude,
  analyzePricingDocument,
  generateRoofingRecommendations,
  chatWithClaude
};
