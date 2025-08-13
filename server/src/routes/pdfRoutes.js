// PDF routes
import express from 'express';
import { generatePDF, downloadPDF } from '../controllers/pdfController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// PDF routes (protected)
router.post('/generate/:id', authenticateToken, generatePDF);
router.get('/download/:id', authenticateToken, downloadPDF);

export default router;
