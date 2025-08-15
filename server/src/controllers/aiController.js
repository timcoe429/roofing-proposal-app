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
    
    logger.info('📥 Received request with:');
    logger.info('- documentContent:', documentContent ? 'present' : 'missing');
    logger.info('- documentUrl:', documentUrl || 'missing');
    logger.info('- documentType:', documentType || 'missing');
    logger.info('- files:', files ? `${files.length} files` : 'missing');
    
    if (!documentContent && !documentUrl && !files) {
      logger.error('❌ No document content, URL, or files provided');
      return res.status(400).json({ error: 'Document content, URL, or files are required' });
    }

    logger.info(`🤖 Analyzing pricing document with Claude AI: ${documentType}`);

    let contentToAnalyze = documentContent;

    // Handle Google Sheets URL - Use Google Sheets API
    if (documentUrl) {
      try {
        logger.info('🔗 Processing Google Sheets URL:', documentUrl);
        
        const { fetchGoogleSheetData } = await import('../services/googleSheetsService.js');
        logger.info('✅ Google Sheets service imported successfully');
        
        logger.info('📊 Calling fetchGoogleSheetData...');
        const sheetData = await fetchGoogleSheetData(documentUrl);
        logger.info('✅ fetchGoogleSheetData completed');
        
        const { csvData, rowCount, dataRowCount } = sheetData;
        
        logger.info(`📈 Successfully fetched ${rowCount} total rows, ${dataRowCount} data rows`);
        logger.info('📄 First 500 characters of data:', csvData.substring(0, 500));
        
        // Use Claude to analyze the fetched data
        contentToAnalyze = `Please analyze this pricing data from a Google Sheet:

${csvData}

Extract all pricing information and return in this JSON format:
{
  "itemCount": ${dataRowCount},
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

IMPORTANT: Set itemCount to exactly ${dataRowCount} (the number of data rows excluding headers).
Process each row that contains pricing information. Skip empty rows and category headers.`;

      } catch (fetchError) {
        logger.error('💥 Google Sheets fetch failed:', fetchError.message);
        logger.error('Full error details:', fetchError);
        
        contentToAnalyze = `Failed to fetch data from Google Sheets URL: ${documentUrl}

Error: ${fetchError.message}

To fix this:
1. Ensure the Google Sheet is publicly viewable (Share → Anyone with the link can view)
2. Check that the URL is correct and the sheet contains data
3. Verify the GOOGLE_SHEETS_API_KEY is properly configured

This error will be sent to Claude AI for analysis, but no actual pricing data was retrieved.`;
      }
    }

    // Handle uploaded files
    if (files && files.length > 0) {
      contentToAnalyze = `Please analyze these uploaded pricing files:
      
      ${files.map((file, index) => `File ${index + 1}: ${file.name}`).join('\n')}
      
      Extract all pricing information and return structured data with itemCount.`;
    }

    // Log what we're sending to Claude
    logger.info('📤 Content being sent to Claude AI:');
    logger.info('Content length:', contentToAnalyze.length);
    logger.info('Content preview (first 500 chars):', contentToAnalyze.substring(0, 500));
    
    // Add timeout to prevent hanging
    const analysisPromise = analyzePricingDocument(contentToAnalyze, documentType);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Analysis timeout after 60 seconds')), 60000)
    );
    
    const analysis = await Promise.race([analysisPromise, timeoutPromise]);

    logger.info('📥 Claude AI response received:');
    logger.info('Response length:', analysis.length);
    logger.info('Response preview (first 500 chars):', analysis.substring(0, 500));
    
    // Try to parse the response as JSON
    let structuredData;
    try {
      structuredData = JSON.parse(analysis);
      logger.info('Successfully parsed JSON response');
      logger.info('Parsed itemCount:', structuredData.itemCount);
    } catch (parseError) {
      logger.error('Failed to parse Claude response as JSON:', parseError.message);
      logger.info('Raw Claude response:', analysis);
      // If parsing fails, return the raw analysis
      structuredData = { rawAnalysis: analysis, itemCount: 0 };
    }

    res.json({
      success: true,
      data: structuredData,
      itemCount: structuredData.itemCount || structuredData.materials?.length || 0,
      documentType,
      processingMethod: 'claude-ai'
    });

    } catch (error) {
    logger.error('💥 FULL ERROR analyzing pricing document:');
    logger.error('Error message:', error.message);
    logger.error('Error stack:', error.stack);
    logger.error('Error details:', JSON.stringify(error, null, 2));
    
    res.status(500).json({
      error: 'Failed to analyze pricing document',
      details: error.message,
      fullError: error.toString()
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
