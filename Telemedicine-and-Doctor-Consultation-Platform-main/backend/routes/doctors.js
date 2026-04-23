const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../config/db');

// GET /api/doctors
router.get('/', auth, async (req, res) => {
  try {
    const { status, speciality, q } = req.query;
    let query = 'SELECT * FROM doctors WHERE 1=1';
    let params = [];
    
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (speciality) { query += ' AND LOWER(speciality) LIKE ?'; params.push(`%${speciality.toLowerCase()}%`); }
    if (q) { query += ' AND LOWER(name) LIKE ?'; params.push(`%${q.toLowerCase()}%`); }
    
    const [rows] = await db.query(query, params);
    res.json({ count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// GET /api/doctors/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Doctor not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// POST /api/doctors
router.post('/', auth, async (req, res) => {
  try {
    const { name, speciality } = req.body;
    if (!name || !speciality) return res.status(400).json({ error: 'Name and speciality required' });
    
    const [countRows] = await db.query('SELECT COUNT(*) as count FROM doctors');
    const newId = `D${String(countRows[0].count + 1).padStart(2,'0')}`;
    
    await db.query(
      'INSERT INTO doctors (id, name, speciality, status) VALUES (?, ?, ?, ?)',
      [newId, name, speciality, 'available']
    );
    
    const [newRows] = await db.query('SELECT * FROM doctors WHERE id = ?', [newId]);
    res.status(201).json(newRows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// PATCH /api/doctors/:id/status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status required' });
    
    await db.query('UPDATE doctors SET status = ? WHERE id = ?', [status, req.params.id]);
    
    const [rows] = await db.query('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Doctor not found' });
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

module.exports = router;
