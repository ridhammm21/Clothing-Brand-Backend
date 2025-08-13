const express = require('express');
const router = express.Router();
const productVariantsController = require('../controllers/productVariantsController');

// Get all variants for a product
router.get('/product/:productId', productVariantsController.getVariantsByProductId);
// Create a new variant
router.post('/', productVariantsController.createVariant);
// Update a variant
router.put('/:id', productVariantsController.updateVariant);
// Delete a variant
router.delete('/:id', productVariantsController.deleteVariant);

module.exports = router;
