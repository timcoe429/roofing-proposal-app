// Auth routes
import express from 'express';
const router = express.Router();

// Auth routes
router.post('/login', (req, res) => {
    res.json({ message: 'Login not yet implemented' });
});

router.post('/register', (req, res) => {
    res.json({ message: 'Register not yet implemented' });
});

router.get('/me', (req, res) => {
    res.json({ message: 'Get current user not yet implemented' });
});

export default router;
