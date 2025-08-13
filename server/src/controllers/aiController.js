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
    const { documentContent, documentType } = req.body;
    
    if (!documentContent) {
      return res.status(400).json({ error: 'Document content is required' });
    }

    logger.info(`Analyzing pricing document with Claude AI: ${documentType}`);

    const analysis = await analyzePricingDocument(documentContent, documentType);
    
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
      analysis: structuredData,
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
