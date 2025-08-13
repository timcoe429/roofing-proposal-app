// Company routes
import express from 'express';
const router = express.Router();

// Company routes
router.get('/settings', (req, res) => {
    res.json({ message: 'Company settings not yet implemented' });
});

router.put('/settings', (req, res) => {
    res.json({ message: 'Company settings update not yet implemented' });
});

export default router;
