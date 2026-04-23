const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../config/db');

// GET /api/schedules/doctor/:doctorId/month
// Get all schedules for a doctor in a specific month/year
router.get('/doctor/:doctorId/month', auth, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year required' });
    }

    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const [rows] = await db.query(
      `SELECT * FROM doctor_schedules 
       WHERE doctor_id = ? AND slot_date BETWEEN ? AND ?
       ORDER BY slot_date, slot_time`,
      [doctorId, startDate, endDate]
    );

    res.json({ count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// GET /api/schedules/doctor/:doctorId/available
// Get available slots for a doctor on a specific date
router.get('/doctor/:doctorId/available', auth, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date required' });
    }

    const [rows] = await db.query(
      `SELECT * FROM doctor_schedules 
       WHERE doctor_id = ? AND slot_date = ? AND is_available = 1
       ORDER BY slot_time`,
      [doctorId, date]
    );

    res.json({ count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// POST /api/schedules/doctor/:doctorId/create-slots
// Create multiple schedule slots for a doctor
router.post('/doctor/:doctorId/create-slots', auth, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, startTime, endTime, intervalMins = 30 } = req.body;
    
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Date, startTime, and endTime required' });
    }

    const [start] = startTime.split(':');
    const [end] = endTime.split(':');
    
    const slots = [];
    for (let hour = parseInt(start); hour < parseInt(end); hour++) {
      for (let min = 0; min < 60; min += intervalMins) {
        const slotTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
        slots.push([doctorId, date, slotTime, 1, null]);
      }
    }

    const placeholders = slots.map(() => '(?, ?, ?, ?, ?)').join(',');
    const flatValues = slots.flat();

    await db.query(
      `INSERT IGNORE INTO doctor_schedules (doctor_id, slot_date, slot_time, is_available, booked_by) 
       VALUES ${placeholders}`,
      flatValues
    );

    res.status(201).json({ message: 'Slots created', count: slots.length });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// PATCH /api/schedules/:scheduleId/book
// Book a schedule slot for a patient
router.patch('/:scheduleId/book', auth, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { patientId } = req.body;
    
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID required' });
    }

    await db.query(
      'UPDATE doctor_schedules SET is_available = 0, booked_by = ? WHERE id = ?',
      [patientId, scheduleId]
    );

    const [rows] = await db.query('SELECT * FROM doctor_schedules WHERE id = ?', [scheduleId]);
    if (!rows.length) return res.status(404).json({ error: 'Schedule not found' });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// PATCH /api/schedules/:scheduleId/release
// Release a booked schedule slot
router.patch('/:scheduleId/release', auth, async (req, res) => {
  try {
    const { scheduleId } = req.params;

    await db.query(
      'UPDATE doctor_schedules SET is_available = 1, booked_by = NULL WHERE id = ?',
      [scheduleId]
    );

    const [rows] = await db.query('SELECT * FROM doctor_schedules WHERE id = ?', [scheduleId]);
    if (!rows.length) return res.status(404).json({ error: 'Schedule not found' });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

module.exports = router;
