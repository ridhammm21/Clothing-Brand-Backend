// Genders Controller (not strictly needed, but for consistency)
const { pool } = require('../config/database');

exports.getAllGenders = async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM genders');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
