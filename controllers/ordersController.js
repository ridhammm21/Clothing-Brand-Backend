const { pool } = require("../config/database");
const ORDER_STATUS = require("../config/orderStatus");

// Place an order
const placeOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { address_id, payment_method } = req.body;

    // Validate user
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User not found" });
    }

    // Validate address
    const [addressRows] = await pool.query(
      "SELECT * FROM user_addresses WHERE id = ? AND user_id = ?",
      [address_id, userId]
    );
    if (addressRows.length === 0) {
      return res.status(400).json({ error: "Invalid address" });
    }

    // Validate cart
    const [cartItems] = await pool.query(
      "SELECT * FROM cart_items WHERE user_id = ?",
      [userId]
    );
    if (cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Calculate total price
    let total = 0;
    for (const item of cartItems) {
      // Get variant price
      const [variantRows] = await pool.query(
        "SELECT price FROM product_variants WHERE id = ?",
        [item.variant_id]
      );
      if (variantRows.length === 0) {
        return res
          .status(400)
          .json({ error: `Invalid product variant: ${item.variant_id}` });
      }
      total += variantRows[0].price * item.quantity;
    }

    // Insert order
    const [orderResult] = await pool.query(
      "INSERT INTO orders (user_id, address_id, total_price, payment_method, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      [userId, address_id, total, payment_method || "cod", ORDER_STATUS.PENDING]
    );
    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of cartItems) {
      await pool.query(
        "INSERT INTO order_items (order_id, variant_id, quantity, price) VALUES (?, ?, ?, ?)",
        [orderId, item.variant_id, item.quantity, item.price]
      );
    }

    // Clear cart
    await pool.query("DELETE FROM cart_items WHERE user_id = ?", [userId]);

    res
      .status(201)
      .json({ message: "Order placed successfully", order_id: orderId });
  } catch (err) {
    console.error("Order placement error:", err);
    res
      .status(500)
      .json({ error: "Failed to place order", details: err.message });
  }
};

module.exports = { placeOrder };
