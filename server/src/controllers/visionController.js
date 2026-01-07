import OpenAI from 'openai';
import logger from '../utils/logger.js';
import { processImageWithVision, processWithClaude } from '../services/openaiService.js';

// Initialize OpenAI only if API key is provided
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

export const analyzeRoofImages = async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ 
        error: 'OpenAI service not configured. Please set OPENAI_API_KEY environment variable.' 
      });
    }

    const { images, documentType } = req.body;
    
    if (!images || images.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    logger.info(`Processing ${images.length} images with GPT Vision`);

    // Simple prompt - let GPT-4 Vision understand the document naturally
    const prompt = `Extract all measurements and data from this roofing report. Return everything as JSON including:
- Total roof area and all slope breakdowns
- All linear measurements (ridge, hip, valley, eave, rake, flashing, etc.)
- Roof planes, structures, and any other relevant data
- Material information if visible
- Damage areas and severity if visible

Return as structured JSON.`;

    // Process all images
    const analyses = [];
    for (const imageBase64 of images) {
      try {
        const analysis = await processImageWithVision(imageBase64, prompt);
        analyses.push(analysis);
      } catch (error) {
        logger.warn(`Failed to process image: ${error.message}`);
        analyses.push({ error: error.message });
      }
    }

    // If multiple images, combine them
    let finalAnalysis;
    if (analyses.length > 1) {
      const synthesisPrompt = `I have ${analyses.length} pages of a roofing report. Combine all measurements and data into one complete JSON object.`;
      try {
        finalAnalysis = await processWithClaude(synthesisPrompt + '\n\n' + analyses.join('\n\n'));
      } catch (error) {
        logger.warn('Failed to synthesize, using first analysis');
        finalAnalysis = analyses[0];
      }
    } else {
      finalAnalysis = analyses[0];
    }

    // Try to parse JSON from the response
    let analysisData;
    try {
      // Extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = finalAnalysis.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch ? jsonMatch[1] : finalAnalysis;
      analysisData = JSON.parse(jsonString);
    } catch (parseError) {
      logger.warn('Could not parse Vision API response as JSON, returning raw text');
      analysisData = { rawAnalysis: finalAnalysis };
    }

    logger.info(`Successfully processed ${images.length} image(s) with GPT Vision`);
    
    res.json({
      success: true,
      analysis: analysisData,
      imageCount: images.length,
      processingMethod: 'gpt-vision'
    });

  } catch (error) {
    logger.error('Error in vision analysis:', error);
    res.status(500).json({ 
      error: 'Failed to analyze images',
      details: error.message 
    });
  }
};

export const extractMeasurements = async (req, res) => {
  try {
    const { pdfBase64 } = req.body;
    
    if (!pdfBase64) {
      return res.status(400).json({ error: 'No PDF provided' });
    }

    // For PDFs, we might need to convert to images first
    // or use a different approach
    
    const prompt = `Extract all measurements and data from this roofing document. Return as structured JSON.`;

    const response = await processImageWithVision(pdfBase64, prompt);
    
    res.json({
      success: true,
      measurements: response
    });

  } catch (error) {
    logger.error('Error extracting measurements:', error);
    res.status(500).json({ 
      error: 'Failed to extract measurements',
      details: error.message 
    });
  }
};

export const identifyMaterials = async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ 
        error: 'OpenAI service not configured. Please set OPENAI_API_KEY environment variable.' 
      });
    }

    const { images } = req.body;
    
    const prompt = `Identify the roofing materials in these images and return as JSON.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...images.map(img => ({
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${img}` }
            }))
          ]
        }
      ],
      max_tokens: 1000
    });

    const materials = JSON.parse(response.choices[0].message.content);
    
    res.json({
      success: true,
      materials
    });

  } catch (error) {
    logger.error('Error identifying materials:', error);
    res.status(500).json({ 
      error: 'Failed to identify materials',
      details: error.message 
    });
  }
};
