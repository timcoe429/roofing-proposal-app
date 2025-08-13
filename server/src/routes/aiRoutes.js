import express from 'express';
import { 
  chatWithAI, 
  analyzePricingWithAI, 
  getAIRecommendations, 
  processDocumentWithAI,
  checkAIServices 
} from '../controllers/aiController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all AI routes
router.use(authenticateToken);

// Chat with Claude AI
router.post('/chat', chatWithAI);

// Analyze pricing documents with Claude
router.post('/analyze-pricing', analyzePricingWithAI);

// Get AI recommendations for roofing projects
router.post('/recommendations', getAIRecommendations);

// Process text-based documents with Claude
router.post('/process-document', processDocumentWithAI);

// Check AI services status
router.get('/status', checkAIServices);

export default router;
