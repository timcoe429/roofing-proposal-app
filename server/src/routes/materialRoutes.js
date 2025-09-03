// Material routes
import express from 'express';
import { 
  getMaterials, 
  createMaterial, 
  updateMaterial, 
  deleteMaterial,
  getActivePricingForAI
} from '../controllers/materialController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Add logging middleware
router.use((req, res, next) => {
  console.log(`[MaterialRoutes] ${req.method} ${req.originalUrl}`);
  console.log('[MaterialRoutes] Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('[MaterialRoutes] Body preview:', Object.keys(req.body));
  }
  next();
});

// Material routes (temporarily unprotected for testing)
router.get('/', getMaterials);
router.get('/ai-pricing', getActivePricingForAI);
router.post('/', createMaterial);
router.put('/:id', updateMaterial);
router.delete('/:id', deleteMaterial);

export default router;
