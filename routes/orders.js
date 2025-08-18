const express = require("express");
const router = express.Router();
const { placeOrder } = require("../controllers/ordersController");
const auth = require("../middleware/auth");

// Place an order
router.post("/", auth, placeOrder);

module.exports = router;
