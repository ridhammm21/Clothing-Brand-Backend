
// Product Variants Controller
const { pool } = require('../config/database');


exports.getVariantsByProductId = async (req, res) => {
  const productId = req.params.productId;
  try {
    const [results] = await pool.query('SELECT * FROM product_variants WHERE product_id = ?', [productId]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.createVariant = async (req, res) => {
  const { product_id, size, color, stock, price, image_url } = req.body;
  try {
    const [result] = await pool.query('INSERT INTO product_variants (product_id, size, color, stock, price, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [product_id, size, color, stock, price, image_url]);
    res.status(201).json({ id: result.insertId, product_id, size, color, stock, price, image_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.updateVariant = async (req, res) => {
  const id = req.params.id;
  const { size, color, stock, price, image_url } = req.body;
  try {
    await pool.query('UPDATE product_variants SET size=?, color=?, stock=?, price=?, image_url=? WHERE id=?',
      [size, color, stock, price, image_url, id]);
    res.json({ id, size, color, stock, price, image_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deleteVariant = async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM product_variants WHERE id=?', [id]);
    res.json({ message: 'Variant deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
