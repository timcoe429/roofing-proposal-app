import bcrypt from 'bcryptjs';
import { User, Company } from '../models/index.js';
import logger from '../utils/logger.js';

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    logger.error('Error getting all users:', error);
    res.status(500).json({ 
      error: 'Failed to get users',
      details: error.message 
    });
  }
};

// Create new user (admin only)
export const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'Email, password, first name, and last name are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email already exists' 
      });
    }

    // Get admin's companyId to assign to new user
    const adminUser = await User.findByPk(req.user.userId);
    const companyId = adminUser.companyId;

    if (!companyId) {
      return res.status(400).json({ 
        error: 'Admin user must have a company assigned. Please contact support.' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user with same companyId as admin
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'contractor',
      isActive: true,
      companyId: companyId
    });

    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      companyId: user.companyId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    logger.info(`Admin ${req.user.email} created new user: ${email}`);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userResponse
    });

  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({ 
      error: 'Failed to create user',
      details: error.message 
    });
  }
};

// Update user (admin only)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, role, isActive } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from changing their own role
    if (parseInt(id) === req.user.userId && role && role !== user.role) {
      return res.status(400).json({ 
        error: 'You cannot change your own role' 
      });
    }

    // Update fields
    if (email !== undefined) user.email = email;
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      companyId: user.companyId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    logger.info(`Admin ${req.user.email} updated user: ${user.email}`);
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user: userResponse
    });

  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({ 
      error: 'Failed to update user',
      details: error.message 
    });
  }
};

// Deactivate user (admin only) - soft delete by setting isActive=false
export const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({ 
        error: 'You cannot deactivate your own account' 
      });
    }

    user.isActive = false;
    await user.save();

    logger.info(`Admin ${req.user.email} deactivated user: ${user.email}`);
    
    res.json({
      success: true,
      message: 'User deactivated successfully'
    });

  } catch (error) {
    logger.error('Error deactivating user:', error);
    res.status(500).json({ 
      error: 'Failed to deactivate user',
      details: error.message 
    });
  }
};

// Reset user password (admin only)
export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ 
        error: 'Password is required and must be at least 6 characters' 
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    user.password = hashedPassword;
    await user.save();

    logger.info(`Admin ${req.user.email} reset password for user: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    logger.error('Error resetting password:', error);
    res.status(500).json({ 
      error: 'Failed to reset password',
      details: error.message 
    });
  }
};

