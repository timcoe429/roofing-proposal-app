// Company routes
import express from 'express';
import { getCompanySettings, updateCompanySettings } from '../controllers/companyController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Company routes (protected)
router.get('/settings', authenticateToken, getCompanySettings);
router.put('/settings', authenticateToken, updateCompanySettings);

export default router;
