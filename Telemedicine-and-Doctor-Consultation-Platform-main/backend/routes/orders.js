const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../config/db');

const VALID_STATUSES = ['pending','rx_pending','packing','dispatched','delivered','cancelled'];

// GET /api/orders
router.get('/', auth, async (req, res) => {
  try {
    const { patientId, status } = req.query;
    let query = 'SELECT * FROM orders WHERE 1=1';
    let params = [];
    
    if (patientId) { query += ' AND patient_id = ?'; params.push(patientId); }
    if (status)    { query += ' AND status = ?'; params.push(status); }
    
    const [rows] = await db.query(query, params);
    res.json({ count: rows.length, data: rows.map(r => ({ ...r, patientId: r.patient_id })) });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// GET /api/orders/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    
    const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    const o = rows[0];
    res.json({
        ...o,
        patientId: o.patient_id,
        items
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// POST /api/orders — place order
router.post('/', auth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { patientId, items, totalAmount, prescriptionId } = req.body;
    if (!patientId || !items || items.length === 0) {
      return res.status(400).json({ error: 'patientId and items array required' });
    }
    
    await connection.beginTransaction();

    const [countRows] = await connection.query('SELECT COUNT(*) as count FROM orders');
    const newId = `ORD-${8821 + countRows[0].count + 1}`;
    const status = prescriptionId ? 'rx_pending' : 'pending';

    // Create the order
    await connection.query(
      `INSERT INTO orders (id, patient_id, prescription_id, total_amount, status, payment_status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newId, patientId, prescriptionId || null, totalAmount || 0, status, 'pending']
    );

    // Insert each item - items should be array of {sku, qty, unitPrice}
    for (const item of items) {
      const { sku, qty, unitPrice } = item;
      if (!sku || !qty || !unitPrice) {
        throw new Error('Each item must have sku, qty, and unitPrice');
      }
      
      await connection.query(
        `INSERT INTO order_items (order_id, sku, qty, unit_price) VALUES (?, ?, ?, ?)`,
        [newId, sku, qty, unitPrice]
      );
    }

    await connection.commit();
    res.status(201).json({ 
      success: true,
      id: newId, 
      patientId, 
      itemCount: items.length,
      totalAmount, 
      status 
    });
  } catch (err) {
    await connection.rollback();
    console.error('Order creation error:', err.message);
    res.status(500).json({ error: 'Database error', message: err.message });
  } finally {
    connection.release();
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    if (!VALID_STATUSES.includes(req.body.status))
      return res.status(400).json({ error: `Invalid status. Valid: ${VALID_STATUSES.join(', ')}` });
      
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
    
    const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// GET /api/orders/summary/stats
router.get('/summary/stats', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT status, total_amount FROM orders');
    
    let stats = {
      total: rows.length,
      pending: 0,
      dispatched: 0,
      delivered: 0,
      totalRevenue: 0
    };
    
    rows.forEach(o => {
      if (['pending','rx_pending','packing'].includes(o.status)) stats.pending++;
      if (o.status === 'dispatched') stats.dispatched++;
      if (o.status === 'delivered') stats.delivered++;
      if (o.status !== 'cancelled') stats.totalRevenue += Number(o.total_amount);
    });
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

module.exports = router;
