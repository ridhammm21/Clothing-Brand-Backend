
// Products Controller
const { pool } = require('../config/database');


exports.getAllProducts = async (req, res) => {
  try {
    const { search = '', category = '', status = '' } = req.query;
    let whereClauses = [];
    let params = [];

    if (search) {
      whereClauses.push('p.name LIKE ?');
      params.push(`%${search}%`);
    }
    if (category) {
      whereClauses.push('c.name = ?');
      params.push(category);
    }
    // Status filter: 'Active', 'Out of Stock', 'Discontinued'
    if (status) {
      if (status === 'Out of Stock') {
        whereClauses.push('COALESCE(SUM(v.stock), 0) = 0');
      } else if (status === 'Active') {
        whereClauses.push('COALESCE(SUM(v.stock), 0) > 0 AND (p.status IS NULL OR p.status = "Active")');
      } else {
        whereClauses.push('p.status = ?');
        params.push(status);
      }
    }

    let whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Note: MySQL does not allow using aggregate functions in WHERE, so use HAVING for stock
    let havingSQL = '';
    if (status === 'Out of Stock') {
      havingSQL = 'HAVING stock = 0';
    } else if (status === 'Active') {
      havingSQL = 'HAVING stock > 0';
    }

    const [products] = await pool.query(`
      SELECT 
        p.*, 
        c.name as category_name, 
        g.name as gender_name, 
        COALESCE(SUM(v.stock), 0) as stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN genders g ON p.gender_id = g.id
      LEFT JOIN product_variants v ON p.id = v.product_id
      ${whereSQL}
      GROUP BY p.id
      ${havingSQL}
    `, params);
    const productIds = products.map(p => p.id);
    if (productIds.length === 0) return res.json([]);
    const [variants] = await pool.query('SELECT * FROM product_variants WHERE product_id IN (?)', [productIds]);
    const [images] = await pool.query('SELECT * FROM product_images WHERE product_id IN (?)', [productIds]);
    const productsWithDetails = products.map(product => {
      const productVariants = variants.filter(v => v.product_id === product.id).map(variant => ({
        ...variant,
        final_price: variant.price !== null && variant.price !== undefined ? variant.price : product.base_price
      }));
      return {
        ...product,
        variants: productVariants,
        images: images.filter(img => img.product_id === product.id)
      };
    });
    res.json(productsWithDetails);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getProductById = async (req, res) => {
  const id = req.params.id;
  try {
    const [results] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (results.length === 0) return res.status(404).json({ error: 'Product not found' });
    const product = results[0];
    const [variants] = await pool.query('SELECT * FROM product_variants WHERE product_id = ?', [id]);
    const [images] = await pool.query('SELECT * FROM product_images WHERE product_id = ?', [id]);
    const variantsWithPrice = variants.map(variant => ({
      ...variant,
      final_price: variant.price !== null && variant.price !== undefined ? variant.price : product.base_price
    }));
    res.json({ ...product, variants: variantsWithPrice, images });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.createProduct = async (req, res) => {
  const { name, description, base_price, discounted_price, gender_id, category_id, status = 'active', images = [], variants = [] } = req.body;
  console.log('Create Product Payload:', {
    name, description, base_price, discounted_price, gender_id, category_id, status, images, variants
  });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Insert product
    const [result] = await conn.query(
      'INSERT INTO products (name, description, base_price, discounted_price, gender_id, category_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, description, base_price, discounted_price, gender_id, category_id, status]
    );
    const productId = result.insertId;

    // Insert images
    for (let i = 0; i < images.length; i++) {
      await conn.query(
        'INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, ?)',
        [productId, images[i], i === 0] // first image is main
      );
    }

    // Insert variants
    for (const variant of variants) {
      await conn.query(
        'INSERT INTO product_variants (product_id, sku, size, color, stock, price) VALUES (?, ?, ?, ?, ?, ?)',
        [productId, variant.sku, variant.size, variant.color, variant.stock, variant.price]
      );
    }

    await conn.commit();
  res.status(201).json({ id: productId, name, description, base_price, discounted_price, gender_id, category_id, status, images, variants });
  } catch (err) {
    await conn.rollback();
    console.error('Create Product Error:', err);
    res.status(500).json({ error: err.message, details: err });
  } finally {
    conn.release();
  }
};


exports.updateProduct = async (req, res) => {
  const id = req.params.id;
  const { name, description, base_price, discounted_price, gender_id, category_id, status = 'active', images = [], variants = [] } = req.body;
  console.log('Update Product Payload:', {
    name, description, base_price, discounted_price, gender_id, category_id, status, images, variants
  });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Update main product fields
    await conn.query(
      'UPDATE products SET name=?, description=?, base_price=?, discounted_price=?, gender_id=?, category_id=?, status=? WHERE id=?',
      [name, description, base_price, discounted_price, gender_id, category_id, status, id]
    );

    // Update images: delete all and re-insert
    await conn.query('DELETE FROM product_images WHERE product_id=?', [id]);
    for (let i = 0; i < images.length; i++) {
      await conn.query(
        'INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, ?)',
        [id, images[i], i === 0]
      );
    }

    // Update variants: delete all and re-insert
    await conn.query('DELETE FROM product_variants WHERE product_id=?', [id]);
    for (const variant of variants) {
      // Only use allowed fields for insert
      await conn.query(
        'INSERT INTO product_variants (product_id, sku, size, color, stock, price) VALUES (?, ?, ?, ?, ?, ?)',
        [
          id,
          variant.sku,
          variant.size,
          variant.color,
          typeof variant.stock === 'number' ? variant.stock : Number(variant.stock) || 0,
          variant.price !== undefined && variant.price !== null && variant.price !== '' ? Number(variant.price) : null
        ]
      );
    }

    await conn.commit();
  res.json({ id, name, description, base_price, discounted_price, gender_id, category_id, status, images, variants });
  } catch (err) {
    await conn.rollback();
    console.error('Update Product Error:', err);
    res.status(500).json({ error: err.message, details: err });
  } finally {
    conn.release();
  }
};


exports.deleteProduct = async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM products WHERE id=?', [id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
