import logger from '../utils/logger.js';
import { 
  processWithClaude, 
  analyzePricingDocument, 
  generateRoofingRecommendations,
  chatWithClaude 
} from '../services/openaiService.js';

// Chat with Claude AI
export const chatWithAI = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    logger.info('Processing chat message with Claude AI');

    const response = await chatWithClaude(message, conversationHistory);
    
    res.json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in AI chat:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
};

// Analyze pricing documents with Claude
export const analyzePricingWithAI = async (req, res) => {
  try {
    const { documentContent, documentUrl, documentType, files } = req.body;
    
    if (!documentContent && !documentUrl && !files) {
      return res.status(400).json({ error: 'Document content, URL, or files are required' });
    }

    logger.info(`Analyzing pricing document with Claude AI: ${documentType}`);

    let contentToAnalyze = documentContent;

    // Handle Google Sheets URL - Server-side fetch then Claude analyze
    if (documentUrl) {
      try {
        // Step 1: Convert Google Sheets URL to CSV export format
        let csvUrl = documentUrl;
        if (documentUrl.includes('docs.google.com/spreadsheets')) {
          const sheetIdMatch = documentUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
          if (sheetIdMatch) {
            csvUrl = `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=csv`;
          }
        }

        logger.info('Fetching CSV data from:', csvUrl);
        
        // Step 2: Fetch the CSV data server-side (no CORS issues)
        const response = await fetch(csvUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Cannot access the Google Sheet. Make sure it's publicly viewable.`);
        }
        
        const csvData = await response.text();
        
        if (!csvData || csvData.trim().length === 0) {
          throw new Error('The Google Sheet appears to be empty or inaccessible.');
        }

        logger.info(`Successfully fetched ${csvData.length} characters of CSV data`);
        
        // Step 3: Use Claude to analyze the fetched CSV data
        contentToAnalyze = `Please analyze this pricing data from a Google Sheet (CSV format):

${csvData}

Extract all pricing information and return in this JSON format:
{
  "itemCount": number,
  "materials": [
    {
      "name": "string",
      "price": number,
      "unit": "string", 
      "supplier": "string"
    }
  ],
  "summary": "Brief summary of the pricing data"
}

Count each row of pricing data as one item for the itemCount. Skip header rows.`;

      } catch (fetchError) {
        logger.error('Error fetching Google Sheets data:', fetchError);
        contentToAnalyze = `Failed to fetch data from Google Sheets URL: ${documentUrl}

Error: ${fetchError.message}

To fix this:
1. Open your Google Sheet
2. Click Share → Change to "Anyone with the link can view"  
3. Make sure the sheet contains data
4. Try again, or copy/paste the data directly instead`;
      }
    }

    // Handle uploaded files
    if (files && files.length > 0) {
      contentToAnalyze = `Please analyze these uploaded pricing files:
      
      ${files.map((file, index) => `File ${index + 1}: ${file.name}`).join('\n')}
      
      Extract all pricing information and return structured data with itemCount.`;
    }

    const analysis = await analyzePricingDocument(contentToAnalyze, documentType);
    
    // Try to parse the response as JSON
    let structuredData;
    try {
      structuredData = JSON.parse(analysis);
    } catch (parseError) {
      // If parsing fails, return the raw analysis
      structuredData = { rawAnalysis: analysis };
    }

    res.json({
      success: true,
      data: structuredData,
      itemCount: structuredData.itemCount || structuredData.materials?.length || 0,
      documentType,
      processingMethod: 'claude-ai'
    });

  } catch (error) {
    logger.error('Error analyzing pricing document:', error);
    res.status(500).json({ 
      error: 'Failed to analyze pricing document',
      details: error.message 
    });
  }
};

// Generate roofing recommendations with Claude
export const getAIRecommendations = async (req, res) => {
  try {
    const { projectData } = req.body;
    
    if (!projectData) {
      return res.status(400).json({ error: 'Project data is required' });
    }

    logger.info('Generating roofing recommendations with Claude AI');

    const recommendations = await generateRoofingRecommendations(projectData);
    
    res.json({
      success: true,
      recommendations,
      processingMethod: 'claude-ai'
    });

  } catch (error) {
    logger.error('Error generating recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to generate recommendations',
      details: error.message 
    });
  }
};

// Process text-based documents (Excel, Word, PDF text) with Claude
export const processDocumentWithAI = async (req, res) => {
  try {
    const { documentText, documentType, extractionType } = req.body;
    
    if (!documentText) {
      return res.status(400).json({ error: 'Document text is required' });
    }

    logger.info(`Processing ${documentType} document with Claude AI for ${extractionType}`);

    let systemPrompt = '';
    let prompt = '';

    switch (extractionType) {
      case 'pricing':
        systemPrompt = `You are an expert at extracting pricing information from roofing documents.`;
        prompt = `Extract all pricing information from this ${documentType} document:\n\n${documentText}`;
        break;
      
      case 'measurements':
        systemPrompt = `You are an expert at extracting roofing measurements from documents.`;
        prompt = `Extract all measurement information from this ${documentType} document:\n\n${documentText}`;
        break;
      
      case 'materials':
        systemPrompt = `You are an expert at identifying roofing materials from documents.`;
        prompt = `Identify all roofing materials mentioned in this ${documentType} document:\n\n${documentText}`;
        break;
      
      default:
        systemPrompt = `You are an expert at analyzing roofing documents.`;
        prompt = `Analyze this ${documentType} document and extract relevant roofing information:\n\n${documentText}`;
    }

    const analysis = await processWithClaude(prompt, '', systemPrompt);
    
    res.json({
      success: true,
      analysis,
      documentType,
      extractionType,
      processingMethod: 'claude-ai'
    });

  } catch (error) {
    logger.error('Error processing document with AI:', error);
    res.status(500).json({ 
      error: 'Failed to process document',
      details: error.message 
    });
  }
};

// Health check for AI services
export const checkAIServices = async (req, res) => {
  try {
    const services = {
      claude: !!process.env.ANTHROPIC_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      services,
      message: 'AI services status checked'
    });

  } catch (error) {
    logger.error('Error checking AI services:', error);
    res.status(500).json({ 
      error: 'Failed to check AI services',
      details: error.message 
    });
  }
};
