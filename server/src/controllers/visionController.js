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

    // Construct the prompt based on document type
    let prompt = '';
    
    if (documentType === 'measurement_report') {
      prompt = `Analyze this roofing measurement report and extract the following information in JSON format:
      {
        "measurements": {
          "totalSquares": number (in roofing squares, 100 sq ft each),
          "ridgeLength": number (linear feet),
          "valleyLength": number (linear feet),
          "edgeLength": number (linear feet),
          "pitch": string (e.g., "6/12"),
          "facets": number,
          "predominantPitch": string
        },
        "existingMaterial": string,
        "layers": number,
        "penetrations": number (vents, pipes, etc),
        "skylights": number,
        "chimneys": number,
        "confidence": number (0-100)
      }`;
    } else if (documentType === 'damage_photos') {
      prompt = `Analyze these roof damage photos and identify:
      {
        "damageAreas": [
          {
            "type": string (e.g., "missing shingles", "wind damage", "hail damage", "water damage"),
            "severity": string ("low", "medium", "high", "critical"),
            "location": string (description of where on roof),
            "description": string (detailed description),
            "repairNeeded": string
          }
        ],
        "overallCondition": string ("good", "fair", "poor", "critical"),
        "immediateAttentionNeeded": boolean,
        "estimatedAge": string,
        "materialType": string,
        "recommendations": [string]
      }`;
    } else {
      prompt = `Analyze these roofing-related images and extract any relevant information about:
      1. Measurements (if visible)
      2. Damage areas and their severity
      3. Existing roofing material type
      4. Roof features (vents, skylights, chimneys)
      5. Any visible issues or concerns
      
      Provide the analysis in JSON format with sections for measurements, damage, and recommendations.`;
    }

    // Process each image individually and then combine results
    const imageAnalyses = [];
    for (const imageBase64 of images) {
      try {
        const analysis = await processImageWithVision(imageBase64, prompt, documentType);
        imageAnalyses.push(analysis);
      } catch (error) {
        logger.warn(`Failed to process image: ${error.message}`);
        imageAnalyses.push({ error: error.message });
      }
    }

    // If we have multiple images, use Claude to synthesize the results
    let finalAnalysis;
    if (imageAnalyses.length > 1) {
      const synthesisPrompt = `I have analyzed ${imageAnalyses.length} images of a roof. Here are the individual analyses:

${imageAnalyses.map((analysis, i) => `Image ${i + 1}: ${JSON.stringify(analysis)}`).join('\n\n')}

Please synthesize these analyses into a comprehensive, coherent assessment. Combine measurements, identify patterns in damage, and provide unified recommendations. Return as structured JSON.`;

      try {
        finalAnalysis = await processWithClaude(synthesisPrompt);
      } catch (error) {
        logger.warn('Failed to synthesize with Claude, using first analysis');
        finalAnalysis = imageAnalyses[0];
      }
    } else {
      finalAnalysis = imageAnalyses[0];
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

    logger.info('Successfully processed images with GPT Vision');
    
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
    
    const prompt = `Extract all roofing measurements from this document. Focus on:
    - Total roof area in squares
    - Linear measurements (ridge, valley, edge)
    - Roof pitch
    - Number of facets/sections
    Return as structured JSON.`;

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
    
    const prompt = `Identify the roofing materials in these images:
    1. Shingle type (3-tab, architectural, designer, etc.)
    2. Material (asphalt, wood, slate, tile, metal)
    3. Approximate age/condition
    4. Color/style
    5. Manufacturer if identifiable
    Return as JSON with confidence scores.`;

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
