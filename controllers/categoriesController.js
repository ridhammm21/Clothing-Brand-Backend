
// Categories Controller
const { pool } = require('../config/database');


exports.getAllCategories = async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM categories');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.createCategory = async (req, res) => {
  const { name } = req.body;
  try {
    const [result] = await pool.query('INSERT INTO categories (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
