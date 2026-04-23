const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../config/db');

// GET /api/consultations
router.get('/', auth, async (req, res) => {
  try {
    const { status, doctorId, patientId, date } = req.query;
    let query = 'SELECT * FROM consultations WHERE 1=1';
    let params = [];
    
    if (status)    { query += ' AND status = ?'; params.push(status); }
    if (doctorId)  { query += ' AND doctor_id = ?'; params.push(doctorId); }
    if (patientId) { query += ' AND patient_id = ?'; params.push(patientId); }
    if (date)      { query += ' AND scheduled_date = ?'; params.push(date); }
    
    const [rows] = await db.query(query, params);
    
    const formatted = rows.map(r => ({
      ...r,
      patientId: r.patient_id,
      doctorId: r.doctor_id,
      date: typeof r.scheduled_date === 'string' ? r.scheduled_date : r.scheduled_date.toISOString().slice(0, 10),
      time: r.scheduled_time
    }));
    
    res.json({ count: formatted.length, data: formatted });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// GET /api/consultations/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM consultations WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Consultation not found' });
    
    const r = rows[0];
    res.json({
        ...r,
        patientId: r.patient_id,
        doctorId: r.doctor_id,
        date: typeof r.scheduled_date === 'string' ? r.scheduled_date : r.scheduled_date.toISOString().slice(0, 10),
        time: r.scheduled_time
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// POST /api/consultations — book
router.post('/', auth, async (req, res) => {
  try {
    const { patientId, doctorId, type, date, time, spec, reason } = req.body;
    if (!patientId || !doctorId) return res.status(400).json({ error: 'patientId and doctorId required' });
    
    const [countRows] = await db.query('SELECT COUNT(*) as count FROM consultations');
    const newId = `C${String(countRows[0].count + 1).padStart(3,'0')}`;
    
    const dDate = date || new Date().toISOString().slice(0,10);
    const dTime = time || '10:00:00';
    
    await db.query(`
      INSERT INTO consultations 
      (id, patient_id, doctor_id, type, speciality, scheduled_date, scheduled_time, status, reason) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, patientId, doctorId, type || 'video', spec || 'General', dDate, dTime, 'scheduled', reason || '']);
    
    const [newRows] = await db.query('SELECT * FROM consultations WHERE id = ?', [newId]);
    const r = newRows[0];
    res.status(201).json({
        ...r, patientId: r.patient_id, doctorId: r.doctor_id, 
        date: typeof r.scheduled_date === 'string' ? r.scheduled_date : r.scheduled_date.toISOString().slice(0, 10),
        time: r.scheduled_time
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// PATCH /api/consultations/:id/status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, duration } = req.body;
    const updates = [];
    const params = [];
    
    if (status) { updates.push('status = ?'); params.push(status); }
    if (duration !== undefined) { updates.push('duration_min = ?'); params.push(duration); }
    
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    
    params.push(req.params.id);
    await db.query(`UPDATE consultations SET ${updates.join(', ')} WHERE id = ?`, params);
    
    const [rows] = await db.query('SELECT * FROM consultations WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// GET /api/consultations/stats/today
router.get('/stats/today', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0,10);
    const [rows] = await db.query('SELECT status, COUNT(*) as count FROM consultations WHERE scheduled_date = ? GROUP BY status', [today]);
    
    let stats = { total: 0, live: 0, waiting: 0, completed: 0 };
    rows.forEach(r => {
      stats.total += r.count;
      if (stats[r.status] !== undefined) stats[r.status] += r.count;
    });
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

module.exports = router;
