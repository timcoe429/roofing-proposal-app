import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Admin middleware - checks if user is admin
export const isAdmin = async (req, res, next) => {
  try {
    // Get full user from database to check role
    const user = await User.findByPk(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.adminUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error checking admin status' });
  }
};
