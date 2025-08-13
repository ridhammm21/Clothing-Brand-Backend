
// Product Images Controller
const { pool } = require('../config/database');


exports.getImagesByProductId = async (req, res) => {
  const productId = req.params.productId;
  try {
    const [results] = await pool.query('SELECT * FROM product_images WHERE product_id = ?', [productId]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.addImage = async (req, res) => {
  const { product_id, image_url, is_main } = req.body;
  try {
    const [result] = await pool.query('INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, ?)',
      [product_id, image_url, is_main]);
    res.status(201).json({ id: result.insertId, product_id, image_url, is_main });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deleteImage = async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM product_images WHERE id=?', [id]);
    res.json({ message: 'Image deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
