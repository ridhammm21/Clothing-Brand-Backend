// Cart Controller for handling cart logic (DB for logged-in, localStorage for guests)
const { pool } = require('../config/database');

// Get all cart items for a user
exports.getCart = async (req, res) => {
  const userId = req.user.id;
  try {
    const [items] = await pool.query(
      `SELECT ci.*, pv.size, pv.color, pv.price as variant_price, p.name as product_name, p.base_price, p.discounted_price, pi.image_url
       FROM cart_items ci
       JOIN product_variants pv ON ci.variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_main = 1
       WHERE ci.user_id = ?`,
      [userId]
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add or update cart item
exports.addOrUpdateCartItem = async (req, res) => {
  const userId = req.user.id;
  const { variant_id, quantity } = req.body;
  try {
    // Upsert logic: if exists, update; else insert
    const [existing] = await pool.query(
      'SELECT * FROM cart_items WHERE user_id = ? AND variant_id = ?',
      [userId, variant_id]
    );
    if (existing.length > 0) {
      await pool.query(
        'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND variant_id = ?',
        [quantity, userId, variant_id]
      );
    } else {
      await pool.query(
        'INSERT INTO cart_items (user_id, variant_id, quantity) VALUES (?, ?, ?)',
        [userId, variant_id, quantity]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Remove cart item
exports.removeCartItem = async (req, res) => {
  const userId = req.user.id;
  const { variant_id } = req.body;
  try {
    await pool.query(
      'DELETE FROM cart_items WHERE user_id = ? AND variant_id = ?',
      [userId, variant_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Clear cart
exports.clearCart = async (req, res) => {
  const userId = req.user.id;
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
