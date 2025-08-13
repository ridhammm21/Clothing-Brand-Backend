const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');

// Get all products with variants and images
router.get('/', productsController.getAllProducts);
// Get single product by ID
router.get('/:id', productsController.getProductById);
// Create a new product
router.post('/', productsController.createProduct);
// Update a product
router.put('/:id', productsController.updateProduct);
// Delete a product
router.delete('/:id', productsController.deleteProduct);

module.exports = router;
