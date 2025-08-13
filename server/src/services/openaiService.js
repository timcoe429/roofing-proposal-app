import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { aiConfig } from '../config/ai.js';
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
    throw new Error('Claude service not configured');
  }

  try {
    const defaultSystemPrompt = `You are an expert roofing contractor assistant. You help with:
- Material calculations and estimates
- Project planning and recommendations
- Technical roofing knowledge
- Proposal writing and formatting
- Cost analysis and pricing

Always provide accurate, professional advice suitable for roofing contractors.`;

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
    logger.error('Error in Claude processing:', error);
    throw error;
  }
};

// Analyze pricing documents with Claude
export const analyzePricingDocument = async (documentContent, documentType) => {
  const systemPrompt = `You are an expert at analyzing roofing pricing documents. Extract and structure the following information:

1. Material prices per unit
2. Labor rates
3. Additional services and costs
4. Terms and conditions
5. Contact information

Return the data in structured JSON format.`;

  const prompt = `Analyze this ${documentType} document and extract all pricing information:

${documentContent}

Please return the data in this JSON structure:
{
  "materials": [
    {
      "name": "string",
      "unit": "string",
      "price": "number",
      "description": "string"
    }
  ],
  "labor": {
    "hourlyRate": "number",
    "perSquareRate": "number",
    "additionalServices": []
  },
  "terms": "string",
  "contact": "string"
}`;

  return await processWithClaude(prompt, '', systemPrompt);
};

// Generate roofing recommendations with Claude
export const generateRoofingRecommendations = async (projectData) => {
  const systemPrompt = `You are an expert roofing contractor. Provide professional recommendations based on project data.`;

  const prompt = `Based on this roofing project data, provide recommendations:

Project Data:
${JSON.stringify(projectData, null, 2)}

Please provide:
1. Material recommendations
2. Labor estimates
3. Timeline suggestions
4. Cost considerations
5. Risk factors to consider

Format as a professional analysis.`;

  return await processWithClaude(prompt, '', systemPrompt);
};

// Chat with Claude for general roofing questions
export const chatWithClaude = async (message, conversationHistory = []) => {
  const systemPrompt = `You are a helpful AI roofing assistant. You help contractors with:
- Technical questions about roofing
- Project planning advice
- Material selection guidance
- Cost estimation help
- Best practices and safety

Be professional, accurate, and helpful. If you're not sure about something, say so.`;

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
