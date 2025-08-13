const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Get all genders
router.get('/', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM genders');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
