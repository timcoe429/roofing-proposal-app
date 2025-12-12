import express from 'express';
import { 
  getAllUsers,
  createUser,
  updateUser,
  deactivateUser,
  resetUserPassword
} from '../controllers/adminController.js';
import { authenticateToken } from '../middleware/auth.js';
import { isAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication AND admin role
router.use(authenticateToken);
router.use(isAdmin);

// User management routes
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deactivateUser);
router.post('/users/:id/reset-password', resetUserPassword);

export default router;

