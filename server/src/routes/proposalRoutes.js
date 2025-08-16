// Proposal routes
import express from 'express';
import { 
  getProposals, 
  getProposal, 
  createProposal, 
  updateProposal, 
  deleteProposal 
} from '../controllers/proposalController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Add logging middleware
router.use((req, res, next) => {
  console.log(`[ProposalRoutes] ${req.method} ${req.originalUrl}`);
  console.log('[ProposalRoutes] Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('[ProposalRoutes] Body preview:', Object.keys(req.body));
  }
  next();
});

// Proposal routes (temporarily unprotected for testing)
router.get('/', getProposals);
router.get('/:id', getProposal);
router.post('/', createProposal);
router.put('/:id', updateProposal);
router.delete('/:id', deleteProposal);

export default router;
