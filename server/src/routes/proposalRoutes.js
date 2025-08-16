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

// Proposal routes (temporarily unprotected for testing)
router.get('/', getProposals);
router.get('/:id', getProposal);
router.post('/', createProposal);
router.put('/:id', updateProposal);
router.delete('/:id', deleteProposal);

export default router;
