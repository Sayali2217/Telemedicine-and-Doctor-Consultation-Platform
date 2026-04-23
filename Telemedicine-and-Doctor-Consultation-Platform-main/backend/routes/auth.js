const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');

const SECRET = process.env.JWT_SECRET || 'mediconnect_secret_2026';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.is_active)
      return res.status(403).json({ error: 'Account suspended' });

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET, { expiresIn: '8h' });
    res.json({ token, role: user.role, name: user.name, id: user.id });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// GET /api/auth/me
const auth = require('../middleware/auth');
router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, email, role, name, phone, is_active FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

module.exports = router;
