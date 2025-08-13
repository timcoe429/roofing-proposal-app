// Proposal routes
import express from 'express';
const router = express.Router();

// Proposal routes will go here
router.get('/', (req, res) => {
    res.json({ message: 'Proposal routes working' });
});

export default router;
