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

// Simple in-memory rate limiting for public chat endpoint
const chatRateLimiter = new Map();
const RATE_LIMIT = 10; // 10 requests
const RATE_WINDOW = 60 * 1000; // per minute

const rateLimitMiddleware = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!chatRateLimiter.has(ip)) {
    chatRateLimiter.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return next();
  }
  
  const limit = chatRateLimiter.get(ip);
  
  if (now > limit.resetTime) {
    limit.count = 1;
    limit.resetTime = now + RATE_WINDOW;
    return next();
  }
  
  if (limit.count >= RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  
  limit.count++;
  next();
};

// Apply authentication to all AI routes (temporarily disabled for AI chat)
// router.use(authenticateToken);

// Chat with Claude AI (PUBLIC with rate limiting)
router.post('/chat', rateLimitMiddleware, chatWithAI);

// Protected routes
router.use(authenticateToken);

// Analyze pricing documents with Claude
router.post('/analyze-pricing', analyzePricingWithAI);

// Get AI recommendations for roofing projects
router.post('/recommendations', getAIRecommendations);

// Process text-based documents with Claude
router.post('/process-document', processDocumentWithAI);

// Check AI services status
router.get('/status', checkAIServices);

export default router;
