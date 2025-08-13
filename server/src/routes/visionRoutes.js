// Vision routes
import express from 'express';
import { analyzeRoofImages, extractMeasurements, identifyMaterials } from '../controllers/visionController.js';

const router = express.Router();

// Vision AI routes
router.post('/analyze', analyzeRoofImages);
router.post('/extract-measurements', extractMeasurements);
router.post('/identify-materials', identifyMaterials);

export default router;
