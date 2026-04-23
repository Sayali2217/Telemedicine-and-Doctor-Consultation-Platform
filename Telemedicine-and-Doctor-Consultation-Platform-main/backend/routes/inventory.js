const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../config/db');

// GET /api/inventory
router.get('/', auth, async (req, res) => {
  try {
    const { low } = req.query;
    let query = `
      SELECT i.*, m.name, m.price 
      FROM inventory i 
      JOIN medicines m ON i.sku = m.sku
    `;
    
    if (low === 'true') {
      query += ' WHERE i.qty < i.min_qty';
    }
    
    const [rows] = await db.query(query);
    res.json({ count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// GET /api/inventory/:sku
router.get('/:sku', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT i.*, m.name, m.price, m.brand 
      FROM inventory i 
      JOIN medicines m ON i.sku = m.sku 
      WHERE i.sku = ?
    `, [req.params.sku]);
    
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// POST /api/inventory
router.post('/', auth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { name, qty, minQty, price, expiry } = req.body;
    if (!name || qty === undefined) return res.status(400).json({ error: 'name and qty required' });
    
    await connection.beginTransaction();

    const [countRows] = await connection.query('SELECT COUNT(*) as count FROM medicines');
    const newSku = `MED-${String(countRows[0].count + 1).padStart(3,'0')}`;
    
    // Insert into Medicines
    await connection.query(
      `INSERT INTO medicines (sku, name, price) VALUES (?, ?, ?)`,
      [newSku, name, price || 0]
    );

    // Insert into Inventory
    await connection.query(
      `INSERT INTO inventory (sku, qty, min_qty, expiry_date) VALUES (?, ?, ?, ?)`,
      [newSku, qty, minQty || 20, expiry || null]
    );

    await connection.commit();
    res.status(201).json({ sku: newSku, name, qty, minQty, price, expiry });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: 'Database error', message: err.message });
  } finally {
    connection.release();
  }
});

// PATCH /api/inventory/:sku — restock
router.patch('/:sku', auth, async (req, res) => {
  try {
    const updates = [];
    const params = [];
    if (req.body.qty !== undefined) { updates.push('qty = ?'); params.push(req.body.qty); }
    if (req.body.minQty !== undefined) { updates.push('min_qty = ?'); params.push(req.body.minQty); }
    
    if (updates.length) {
      params.push(req.params.sku);
      await db.query(`UPDATE inventory SET ${updates.join(', ')} WHERE sku = ?`, params);
    }
    
    const [rows] = await db.query('SELECT * FROM inventory WHERE sku = ?', [req.params.sku]);
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// GET /api/inventory/alerts/low-stock
router.get('/alerts/low-stock', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT i.*, m.name 
      FROM inventory i 
      JOIN medicines m ON i.sku = m.sku 
      WHERE i.qty < i.min_qty
    `);
    res.json({ count: rows.length, items: rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

module.exports = router;
