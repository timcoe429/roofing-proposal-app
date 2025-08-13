// Proposal routes
import express from 'express';
import { getProposals } from '../controllers/proposalController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Proposal routes (protected)
router.get('/', authenticateToken, getProposals);

export default router;
