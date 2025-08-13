const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware to clean registration request body
const cleanRegistrationBody = (req, res, next) => {
  // Only allow specific fields for registration
  const allowedFields = ['name', 'email', 'password', 'phone'];
  const cleanedBody = {};
  
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      // Convert empty strings and null to undefined for optional fields
      if (field === 'phone' && (req.body[field] === null || req.body[field] === '')) {
        cleanedBody[field] = undefined;
      } else {
        cleanedBody[field] = req.body[field];
      }
    }
  });
  
  req.body = cleanedBody;
  next();
};

// Register new user
router.post('/register', cleanRegistrationBody, [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional({ nullable: true, checkFalsy: true }).isMobilePhone().withMessage('Valid phone number required')
], async (req, res) => {
  try {
    // Log the request body for debugging
    console.log('Registration attempt:', { 
      name: req.body.name, 
      email: req.body.email, 
      phone: req.body.phone,
      hasPassword: !!req.body.password 
    });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { name, email, password, phone } = req.body;

    // Validate that required fields are present
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'email', 'password']
      });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, phone || null]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('User registered successfully:', { id: result.insertId, email });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: result.insertId,
        name,
        email,
        phone: phone || null,
        is_admin: false
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Log the login attempt for debugging
    console.log('Login attempt:', { email: req.body.email });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Login validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const [users] = await pool.execute(
      'SELECT id, name, email, password_hash, phone, is_admin, status FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      console.log('Login failed: User not found for email:', email);
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // Check if user is active
    if (user.status !== 'active') {
      console.log('Login failed: User account inactive:', email);
      return res.status(400).json({ error: 'Account is inactive or banned' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log('Login failed: Invalid password for email:', email);
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful for user:', { id: user.id, email: user.email });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        is_admin: user.is_admin
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    console.log('Profile request for user ID:', req.user.id);

    const [users] = await pool.execute(
      'SELECT id, name, email, phone, is_admin, status, created_at, updated_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    
    // Format the response
    const userProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      is_admin: user.is_admin,
      status: user.status,
      member_since: user.created_at,
      last_updated: user.updated_at,
      profile_complete: !!(user.name && user.email && user.phone) // Boolean indicating if profile is complete
    };

    console.log('Profile fetched successfully for user:', user.email);
    
    res.json({ 
      success: true,
      user: userProfile 
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional({ nullable: true, checkFalsy: true }).isMobilePhone().withMessage('Valid phone number required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { name, phone } = req.body;
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No fields to update' 
      });
    }

    values.push(req.user.id);

    await pool.execute(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    console.log('Profile updated successfully for user:', req.user.id);

    res.json({ 
      success: true,
      message: 'Profile updated successfully' 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get current user with password
    const [users] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, req.user.id]
    );

    console.log('Password changed successfully for user:', req.user.id);

    res.json({ 
      success: true,
      message: 'Password changed successfully' 
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message   
    });
  }
});

// Get account summary (for dashboard)
router.get('/account-summary', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, phone, is_admin, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const user = users[0];
    
    // Calculate days since registration
    const createdDate = new Date(user.created_at);
    const now = new Date();
    const daysSinceRegistration = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

    const summary = {
      user_id: user.id,
      name: user.name,
      email: user.email,
      member_since: user.created_at,
      days_as_member: daysSinceRegistration,
      account_status: user.status,
      profile_complete: !!(user.name && user.email && user.phone),
      is_admin: user.is_admin
    };

    res.json({ 
      success: true,
      summary 
    });

  } catch (error) {
    console.error('Account summary error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
});



module.exports = router;
