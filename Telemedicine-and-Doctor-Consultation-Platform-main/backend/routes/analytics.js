const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../config/db');

// GET /api/analytics/overview
router.get('/overview', auth, async (req, res) => {
  try {
    const [[{patients}]] = await db.query('SELECT COUNT(*) as patients FROM patients');
    const [[{doctors}]]  = await db.query('SELECT COUNT(*) as doctors FROM doctors');
    const [[{consultations}]] = await db.query('SELECT COUNT(*) as consultations FROM consultations');
    const [[{orders}]]   = await db.query('SELECT COUNT(*) as orders FROM orders');
    const [[{prescriptions}]] = await db.query('SELECT COUNT(*) as prescriptions FROM prescriptions');
    const [[{totalRevenue}]] = await db.query('SELECT SUM(total_amount) as totalRevenue FROM orders WHERE status != "cancelled"');
    const [[{lowStockItems}]] = await db.query('SELECT COUNT(*) as lowStockItems FROM inventory WHERE qty < min_qty');

    res.json({
      patients, doctors, consultations, orders, prescriptions, 
      totalRevenue: totalRevenue || 0, 
      lowStockItems
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// GET /api/analytics/consultations/weekly
router.get('/consultations/weekly', auth, (_req, res) => {
  // Simulated weekly data for demo
  res.json({
    labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    data:   [42, 58, 50, 74, 66, 30, 18],
    total:  338,
    avgPerDay: 48,
  });
});

// GET /api/analytics/revenue/monthly
router.get('/revenue/monthly', auth, (_req, res) => {
  res.json({
    labels: ['Jan','Feb','Mar','Apr'],
    data:   [280000, 310000, 352000, 420000],
    growth: '+19%',
  });
});

// GET /api/analytics/doctors/performance
router.get('/doctors/performance', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, speciality, rating, total_patients FROM doctors');
    // For demo purposes, we extrapolate revenue
    res.json(rows.map(d => ({
      id: d.id, name: d.name, speciality: d.speciality,
      consultations: Math.floor(Math.random() * 50) + 10,
      avgDuration: (Math.random() * 10 + 10).toFixed(1),
      rating: d.rating,
      revenue: Math.floor(Math.random() * 50000) + 20000,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// GET /api/analytics/pharmacy/revenue
router.get('/pharmacy/revenue', auth, (_req, res) => {
  res.json({
    today:    18400,
    thisWeek: 126000,
    mtd:      420000,
    breakdown: {
      consultationFees: 180000,
      pharmacy:         210000,
      labReports:       30000,
    },
  });
});

module.exports = router;
