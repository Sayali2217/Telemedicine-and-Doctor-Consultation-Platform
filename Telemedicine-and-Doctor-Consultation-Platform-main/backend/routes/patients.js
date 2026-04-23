const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../config/db');

// GET /api/patients
router.get('/', auth, async (req, res) => {
  try {
    const { status, city, q } = req.query;
    let query = 'SELECT * FROM patients WHERE 1=1';
    let params = [];
    
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (city)   { query += ' AND LOWER(city) LIKE ?'; params.push(`%${city.toLowerCase()}%`); }
    if (q)      { query += ' AND LOWER(name) LIKE ?'; params.push(`%${q.toLowerCase()}%`); }
    
    const [rows] = await db.query(query, params);
    
    // To match original frontend payload structure:
    // Some keys might differ marginally (e.g. condition_note vs condition)
    const formattedRows = rows.map(r => ({
      ...r,
      condition: r.condition_note
    }));
      
    res.json({ count: rows.length, data: formattedRows });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// GET /api/patients/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Patient not found' });
    
    const p = rows[0];
    p.condition = p.condition_note;
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// POST /api/patients
router.post('/', auth, async (req, res) => {
  try {
    const { name, age, city, condition } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    
    const [countRows] = await db.query('SELECT COUNT(*) as count FROM patients');
    const newId = `P${String(countRows[0].count + 1).padStart(2,'0')}`;
    
    await db.query(
      'INSERT INTO patients (id, name, age, city, condition_note, status) VALUES (?, ?, ?, ?, ?, ?)',
      [newId, name, age || null, city || null, condition || null, 'active']
    );
    
    // Return the new object
    const [newRows] = await db.query('SELECT * FROM patients WHERE id = ?', [newId]);
    res.status(201).json(newRows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// PATCH /api/patients/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = [];
    const params = [];
    const fields = ['name', 'age', 'city', 'condition_note', 'status'];
    
    for (const key of fields) {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = ?`);
        params.push(req.body[key]);
      }
    }
    
    // Alternative mapping for 'condition'
    if (req.body.condition !== undefined) {
       updates.push(`condition_note = ?`);
       params.push(req.body.condition);
    }
    
    if (updates.length > 0) {
      params.push(req.params.id);
      await db.query(`UPDATE patients SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    
    const [rows] = await db.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Patient not found' });
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

module.exports = router;
