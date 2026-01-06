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

    // Process each image individually first to detect RoofScope
    const imageAnalyses = [];
    let isRoofScope = false;
    
    // First pass: Quick detection for RoofScope
    for (const imageBase64 of images) {
      try {
        const detectionPrompt = `Look at this image and determine if it's a RoofScope report. 
        Look for indicators like:
        - "RoofScope" logo or text
        - "Roof Area Analysis" title
        - "Plane A", "Plane B" etc. labels
        - "Structure 1" or similar structure labels
        - Slope breakdowns (Flat, Low, Steep, High)
        - Detailed linear measurements table
        
        Respond with only "YES" if it's a RoofScope report, or "NO" if it's not.`;
        
        const detectionResult = await processImageWithVision(imageBase64, detectionPrompt, 'general');
        if (detectionResult && (detectionResult.includes('YES') || detectionResult.toLowerCase().includes('roofscope'))) {
          isRoofScope = true;
          logger.info('RoofScope report detected');
          break;
        }
      } catch (error) {
        logger.warn(`Failed to detect RoofScope in image: ${error.message}`);
      }
    }

    // Construct the prompt based on document type
    let prompt = '';
    
    if (documentType === 'measurement_report' || isRoofScope) {
      if (isRoofScope) {
        // RoofScope-specific prompt with detailed extraction
        prompt = `Analyze this RoofScope roofing measurement report and extract ALL measurements in JSON format:
        {
          "measurements": {
            "totalSquares": number (in roofing squares, 100 sq ft each - look for "Total Roof Area" in SQ),
            "roofArea": number (square feet),
            "ridgeLength": number (linear feet - look for "Ridge" in LF),
            "valleyLength": number (linear feet - look for "Valley" in LF),
            "hipLength": number (linear feet - look for "Hip" in LF),
            "eaveLength": number (linear feet - look for "Eave" in LF),
            "rakeLength": number (linear feet - look for "Rake" or "Rake Edge" in LF),
            "stepFlashingLength": number (linear feet - look for "Step Flashing" in LF),
            "headwallFlashingLength": number (linear feet - look for "Headwall Flashing" in LF),
            "slopeChangeLength": number (linear feet - look for "Slope Change" in LF),
            "flatDripEdgeLength": number (linear feet - look for "Flat Drip Edge" in LF),
            "totalPerimeter": number (linear feet - look for "Total Perimeter" in LF),
            "pitch": string (e.g., "6/12" or "8:12"),
            "predominantPitch": string,
            "facets": number,
            "roofPlanes": number (look for "Roof Planes" count),
            "structures": number (look for "Structures" count),
            "flatSlopeSq": number (squares - look for "Flat Slope" in SQ),
            "lowSlopeSq": number (squares - look for "Low Slope" in SQ),
            "steepSlopeSq": number (squares - look for "Steep Slope" in SQ),
            "highSlopeSq": number (squares - look for "Standard Slope" or "High Slope" in SQ),
            "planes": [
              {
                "id": string (e.g., "A", "B", "AA"),
                "area": number (square feet),
                "pitch": string (e.g., "1:12", "3:12", "4:12", "8:12"),
                "slope": string ("F" for Flat, "L" for Low, "S" for Steep, "H" for High)
              }
            ]
          },
          "existingMaterial": string,
          "layers": number,
          "penetrations": number (vents, pipes, etc),
          "skylights": number,
          "chimneys": number,
          "confidence": number (0-100),
          "isRoofScope": true
        }
        
        IMPORTANT: Extract ALL plane data from the "Plane Data" table. Include every plane listed (A through AT or more).
        Extract ALL linear measurements from the "Linear Measurements" section.
        Extract slope breakdowns from the "Project Totals" section.`;
      } else {
        // Generic measurement report prompt
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
      }
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

    // Process each image individually with the appropriate prompt
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
      const synthesisType = isRoofScope ? 'RoofScope report' : 'roof';
      const synthesisPrompt = `I have analyzed ${imageAnalyses.length} images of a ${synthesisType}. Here are the individual analyses:

${imageAnalyses.map((analysis, i) => `Image ${i + 1}: ${JSON.stringify(analysis)}`).join('\n\n')}

Please synthesize these analyses into a comprehensive, coherent assessment. ${isRoofScope ? 'Combine ALL measurements from all pages. Ensure plane data from all pages is included. Merge linear measurements and slope breakdowns.' : 'Combine measurements, identify patterns in damage, and provide unified recommendations.'} Return as structured JSON.`;

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

    logger.info(`Successfully processed ${images.length} image(s) with GPT Vision${isRoofScope ? ' (RoofScope detected)' : ''}`);
    
    res.json({
      success: true,
      analysis: analysisData,
      imageCount: images.length,
      processingMethod: 'gpt-vision',
      isRoofScope: isRoofScope || analysisData.isRoofScope || false
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
