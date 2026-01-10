import logger from '../utils/logger.js';
import { processImageWithClaude, processWithClaude } from '../services/openaiService.js';

export const analyzeRoofImages = async (req, res) => {
  try {
    const { images, documentType } = req.body;
    
    if (!images || images.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    logger.info(`Processing ${images.length} image(s) with Claude Vision`);

    // Prompt for extracting measurements from roofing reports
    const prompt = `Extract all measurements and data from this roofing report. Return everything as JSON including:
- Total roof area and all slope breakdowns
- All linear measurements (ridge, hip, valley, eave, rake, flashing, etc.)
- Roof planes, structures, and any other relevant data
- Material information if visible
- Damage areas and severity if visible

Return as structured JSON.`;

    // Process all images in parallel for speed
    const analyses = await Promise.all(
      images.map(async (imageBase64) => {
        try {
          return await processImageWithClaude(imageBase64, prompt);
        } catch (error) {
          logger.warn(`Failed to process image: ${error.message}`);
          return { error: error.message };
        }
      })
    );

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

    logger.info(`Successfully processed ${images.length} image(s) with Claude Vision`);
    
    res.json({
      success: true,
      analysis: analysisData,
      imageCount: images.length,
      processingMethod: 'claude-vision'
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

    const prompt = `Extract all measurements and data from this roofing document. Return as structured JSON.`;

    const response = await processImageWithClaude(pdfBase64, prompt);
    
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
    const { images } = req.body;
    
    if (!images || images.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const prompt = `Identify the roofing materials in these images and return as JSON.`;

    // Process first image (can extend to multiple if needed)
    const response = await processImageWithClaude(images[0], prompt);
    
    let materials;
    try {
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch ? jsonMatch[1] : response;
      materials = JSON.parse(jsonString);
    } catch (parseError) {
      materials = { rawAnalysis: response };
    }
    
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
