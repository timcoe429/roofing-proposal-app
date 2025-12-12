import express from 'express';
import { 
  register, 
  login, 
  getCurrentUser, 
  updateProfile, 
  changePassword,
  adminResetPassword,
  refreshToken 
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no authentication required)
// Registration disabled - admin must create users via /api/admin/users
// router.post('/register', register); // DISABLED - Admin-only user creation
router.post('/login', login);
router.post('/refresh', refreshToken);

// Emergency admin route (temporary)
router.post('/admin-reset-password', adminResetPassword);

// Protected routes (authentication required)
router.get('/me', authenticateToken, getCurrentUser);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);

export default router;
