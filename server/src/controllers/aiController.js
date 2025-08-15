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
        logger.info(`📄 First 500 characters of data: ${csvData?.substring(0, 500) || 'undefined'}`);
        
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

                // Skip Claude processing - just return the raw CSV data for AI conversations
        logger.info('✅ Skipping Claude processing - storing raw CSV for conversational AI');
        
        // Count actual data rows (excluding headers and empty rows)
        const csvRows = csvData.split('\n').filter(row => row.trim().length > 0);
        const dataRows = csvRows.slice(1); // Skip header row
        const actualItemCount = dataRows.filter(row => {
          const cells = row.split(',');
          // Count rows that have actual content (not just category headers)
          return cells.length > 3 && cells[1] && cells[1].trim() && !cells[1].includes('MATERIALS');
        }).length;
        
        logger.info(`📊 Counted ${actualItemCount} actual pricing items from ${dataRows.length} data rows`);

        return res.json({
          success: true,
          data: {
            csvData: csvData,
            rawData: csvRows,
            itemCount: actualItemCount,
            summary: `Pricing sheet with ${actualItemCount} items ready for AI conversations`
          },
          itemCount: actualItemCount,
          documentType,
          processingMethod: 'raw-csv-storage'
        });

      } catch (fetchError) {
        logger.error('💥 Google Sheets fetch failed:', fetchError.message);
        return res.status(500).json({
          error: 'Failed to fetch Google Sheets data',
          details: fetchError.message
        });
      }
    }

    // Handle uploaded files
    if (files && files.length > 0) {
      logger.info('📁 Processing uploaded files...');
      return res.json({
        success: true,
        data: {
          files: files,
          itemCount: 0,
          summary: 'File upload processing not implemented yet'
        },
        itemCount: 0,
        documentType,
        processingMethod: 'file-upload'
      });
    }

    // No valid input
    return res.status(400).json({
      error: 'No valid document content, URL, or files provided'
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
