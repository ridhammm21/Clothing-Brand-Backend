const express = require("express");
const router = express.Router();
const productImagesController = require("../controllers/productImagesController");

// Get all images for a product
router.get("/product/:productId", productImagesController.getImagesByProductId);
// Add a new image
router.post("/", productImagesController.addImage);
// Delete an image
router.delete("/:id", productImagesController.deleteImage);

module.exports = router;
