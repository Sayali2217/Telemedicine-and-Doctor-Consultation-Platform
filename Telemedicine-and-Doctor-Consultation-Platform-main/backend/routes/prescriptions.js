const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../config/db');

// GET /api/prescriptions
router.get('/', auth, async (req, res) => {
  try {
    const { patientId, doctorId, status } = req.query;
    let query = 'SELECT * FROM prescriptions WHERE 1=1';
    let params = [];
    
    if (patientId) { query += ' AND patient_id = ?'; params.push(patientId); }
    if (doctorId)  { query += ' AND doctor_id = ?'; params.push(doctorId); }
    if (status)    { query += ' AND status = ?'; params.push(status); }
    
    const [rows] = await db.query(query, params);
    res.json({ count: rows.length, data: rows.map(r => ({ ...r, patientId: r.patient_id, doctorId: r.doctor_id })) });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// GET /api/prescriptions/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM prescriptions WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Prescription not found' });
    
    const [items] = await db.query('SELECT medicine_name, dosage, duration FROM prescription_items WHERE prescription_id = ?', [req.params.id]);
    
    const rx = rows[0];
    res.json({
      ...rx,
      patientId: rx.patient_id,
      doctorId: rx.doctor_id,
      medicines: items.map(i => i.medicine_name)
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// POST /api/prescriptions
router.post('/', auth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { consultationId, patientId, doctorId, medicines, diagnosis, notes } = req.body;
    if (!patientId || !doctorId || !medicines || !medicines.length)
      return res.status(400).json({ error: 'patientId, doctorId and medicines are required' });

    await connection.beginTransaction();

    const [countRows] = await connection.query('SELECT COUNT(*) as count FROM prescriptions');
    const newId = `PRX-${2200 + countRows[0].count + 1}`;
    const today = new Date().toISOString().slice(0,10);

    // Insert main prescription
    await connection.query(
      `INSERT INTO prescriptions (id, consultation_id, patient_id, doctor_id, diagnosis, notes, status, issued_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, consultationId || null, patientId, doctorId, diagnosis || null, notes || null, 'active', today]
    );

    // Insert prescription items
    for (const med of medicines) {
      await connection.query(
        `INSERT INTO prescription_items (prescription_id, medicine_name) VALUES (?, ?)`,
        [newId, typeof med === 'string' ? med : med.name]
      );
    }

    await connection.commit();
    res.status(201).json({ id: newId, patientId, doctorId, medicines, status: 'active', date: today });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: 'Database error', message: err.message });
  } finally {
    connection.release();
  }
});

// PATCH /api/prescriptions/:id/verify — pharmacy verification
router.patch('/:id/verify', auth, async (req, res) => {
  try {
    await db.query(
      `UPDATE prescriptions SET verified_by = ?, verified_at = CURRENT_TIMESTAMP, status = 'verified' WHERE id = ?`,
      [req.user.id, req.params.id]
    );
    
    const [rows] = await db.query('SELECT * FROM prescriptions WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

module.exports = router;
