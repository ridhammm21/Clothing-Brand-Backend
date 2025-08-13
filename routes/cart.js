const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all cart items for the logged-in user
router.get('/', cartController.getCart);
// Add or update a cart item
router.post('/', cartController.addOrUpdateCartItem);
// Remove a cart item
router.delete('/item', cartController.removeCartItem);
// Clear the cart
router.delete('/', cartController.clearCart);

module.exports = router;
