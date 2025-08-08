const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all addresses for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching addresses for user ID:', req.user.id);

    const [addresses] = await pool.execute(
      `SELECT id, label, full_name, phone, address_line1, address_line2, 
              city, state, postal_code, country, country_code, is_default, 
              created_at, updated_at 
       FROM user_addresses 
       WHERE user_id = ? 
       ORDER BY is_default DESC, created_at DESC`,
      [req.user.id]
    );

    console.log(`Found ${addresses.length} addresses for user:`, req.user.id);

    res.json({
      success: true,
      addresses: addresses,
      count: addresses.length
    });

  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get a specific address by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const addressId = req.params.id;
    console.log('Fetching address ID:', addressId, 'for user:', req.user.id);

    const [addresses] = await pool.execute(
      `SELECT id, label, full_name, phone, address_line1, address_line2, 
              city, state, postal_code, country, country_code, is_default, 
              created_at, updated_at 
       FROM user_addresses 
       WHERE id = ? AND user_id = ?`,
      [addressId, req.user.id]
    );

    if (addresses.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Address not found'
      });
    }

    console.log('Address found:', addressId);

    res.json({
      success: true,
      address: addresses[0]
    });

  } catch (error) {
    console.error('Get address error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Add new address
router.post('/', authenticateToken, [
  body('label').optional().isLength({ max: 50 }).withMessage('Label must be 50 characters or less'),
  body('full_name').notEmpty().isLength({ max: 100 }).withMessage('Full name is required and must be 100 characters or less'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('address_line1').notEmpty().isLength({ max: 255 }).withMessage('Address line 1 is required'),
  body('address_line2').optional().isLength({ max: 255 }).withMessage('Address line 2 must be 255 characters or less'),
  body('city').notEmpty().isLength({ max: 100 }).withMessage('City is required'),
  body('state').notEmpty().isLength({ max: 100 }).withMessage('State is required'),
  body('postal_code').notEmpty().isLength({ max: 20 }).withMessage('Postal code is required'),
  body('country').notEmpty().isLength({ max: 100 }).withMessage('Country is required'),
  body('country_code').notEmpty().isLength({ min: 2, max: 2 }).withMessage('Country code must be 2 characters'),
  body('is_default').optional().isBoolean().withMessage('is_default must be boolean')
], async (req, res) => {
  try {
    console.log('Adding new address for user:', req.user.id);

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Address validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      label, full_name, phone, address_line1, address_line2,
      city, state, postal_code, country, country_code, is_default
    } = req.body;

    // If this address is being set as default, remove default from other addresses
    if (is_default) {
      await pool.execute(
        'UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?',
        [req.user.id]
      );
      console.log('Removed default status from other addresses for user:', req.user.id);
    }

    // Insert new address
    const [result] = await pool.execute(
      `INSERT INTO user_addresses 
       (user_id, label, full_name, phone, address_line1, address_line2, 
        city, state, postal_code, country, country_code, is_default) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, label || null, full_name, phone || null, 
        address_line1, address_line2 || null, city, state, 
        postal_code, country, country_code.toUpperCase(), is_default || false
      ]
    );

    console.log('Address added successfully with ID:', result.insertId);

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      address_id: result.insertId
    });

  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Update address
router.put('/:id', authenticateToken, [
  body('label').optional().isLength({ max: 50 }).withMessage('Label must be 50 characters or less'),
  body('full_name').optional().notEmpty().isLength({ max: 100 }).withMessage('Full name must be 100 characters or less'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('address_line1').optional().notEmpty().isLength({ max: 255 }).withMessage('Address line 1 is required'),
  body('address_line2').optional().isLength({ max: 255 }).withMessage('Address line 2 must be 255 characters or less'),
  body('city').optional().notEmpty().isLength({ max: 100 }).withMessage('City is required'),
  body('state').optional().notEmpty().isLength({ max: 100 }).withMessage('State is required'),
  body('postal_code').optional().notEmpty().isLength({ max: 20 }).withMessage('Postal code is required'),
  body('country').optional().notEmpty().isLength({ max: 100 }).withMessage('Country is required'),
  body('country_code').optional().isLength({ min: 2, max: 2 }).withMessage('Country code must be 2 characters'),
  body('is_default').optional().isBoolean().withMessage('is_default must be boolean')
], async (req, res) => {
  try {
    const addressId = req.params.id;
    console.log('Updating address ID:', addressId, 'for user:', req.user.id);

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Address update validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if address exists and belongs to user
    const [existingAddress] = await pool.execute(
      'SELECT id FROM user_addresses WHERE id = ? AND user_id = ?',
      [addressId, req.user.id]
    );

    if (existingAddress.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Address not found'
      });
    }

    const {
      label, full_name, phone, address_line1, address_line2,
      city, state, postal_code, country, country_code, is_default
    } = req.body;

    // If this address is being set as default, remove default from other addresses
    if (is_default) {
      await pool.execute(
        'UPDATE user_addresses SET is_default = FALSE WHERE user_id = ? AND id != ?',
        [req.user.id, addressId]
      );
      console.log('Removed default status from other addresses for user:', req.user.id);
    }

    // Build dynamic update query
    const updates = [];
    const values = [];

    if (label !== undefined) {
      updates.push('label = ?');
      values.push(label);
    }
    if (full_name !== undefined) {
      updates.push('full_name = ?');
      values.push(full_name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone || null);
    }
    if (address_line1 !== undefined) {
      updates.push('address_line1 = ?');
      values.push(address_line1);
    }
    if (address_line2 !== undefined) {
      updates.push('address_line2 = ?');
      values.push(address_line2 || null);
    }
    if (city !== undefined) {
      updates.push('city = ?');
      values.push(city);
    }
    if (state !== undefined) {
      updates.push('state = ?');
      values.push(state);
    }
    if (postal_code !== undefined) {
      updates.push('postal_code = ?');
      values.push(postal_code);
    }
    if (country !== undefined) {
      updates.push('country = ?');
      values.push(country);
    }
    if (country_code !== undefined) {
      updates.push('country_code = ?');
      values.push(country_code.toUpperCase());
    }
    if (is_default !== undefined) {
      updates.push('is_default = ?');
      values.push(is_default);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(addressId, req.user.id);

    await pool.execute(
      `UPDATE user_addresses SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    console.log('Address updated successfully:', addressId);

    res.json({
      success: true,
      message: 'Address updated successfully'
    });

  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Set address as default
router.put('/:id/set-default', authenticateToken, async (req, res) => {
  try {
    const addressId = req.params.id;
    console.log('Setting address as default:', addressId, 'for user:', req.user.id);

    // Check if address exists and belongs to user
    const [existingAddress] = await pool.execute(
      'SELECT id FROM user_addresses WHERE id = ? AND user_id = ?',
      [addressId, req.user.id]
    );

    if (existingAddress.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Address not found'
      });
    }

    // Remove default from all addresses for this user
    await pool.execute(
      'UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?',
      [req.user.id]
    );

    // Set this address as default
    await pool.execute(
      'UPDATE user_addresses SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [addressId, req.user.id]
    );

    console.log('Address set as default successfully:', addressId);

    res.json({
      success: true,
      message: 'Address set as default successfully'
    });

  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Delete address
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const addressId = req.params.id;
    console.log('Deleting address ID:', addressId, 'for user:', req.user.id);

    // Check if address exists and belongs to user
    const [existingAddress] = await pool.execute(
      'SELECT id, is_default FROM user_addresses WHERE id = ? AND user_id = ?',
      [addressId, req.user.id]
    );

    if (existingAddress.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Address not found'
      });
    }

    // Delete the address
    await pool.execute(
      'DELETE FROM user_addresses WHERE id = ? AND user_id = ?',
      [addressId, req.user.id]
    );

    console.log('Address deleted successfully:', addressId);

    // If this was the default address, set another address as default (if any exist)
    if (existingAddress[0].is_default) {
      const [remainingAddresses] = await pool.execute(
        'SELECT id FROM user_addresses WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
        [req.user.id]
      );

      if (remainingAddresses.length > 0) {
        await pool.execute(
          'UPDATE user_addresses SET is_default = TRUE WHERE id = ?',
          [remainingAddresses[0].id]
        );
        console.log('Set new default address:', remainingAddresses[0].id);
      }
    }

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });

  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get default address
router.get('/default/address', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching default address for user:', req.user.id);

    const [addresses] = await pool.execute(
      `SELECT id, label, full_name, phone, address_line1, address_line2, 
              city, state, postal_code, country, country_code, is_default, 
              created_at, updated_at 
       FROM user_addresses 
       WHERE user_id = ? AND is_default = TRUE`,
      [req.user.id]
    );

    if (addresses.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No default address found'
      });
    }

    console.log('Default address found for user:', req.user.id);

    res.json({
      success: true,
      address: addresses[0]
    });

  } catch (error) {
    console.error('Get default address error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
