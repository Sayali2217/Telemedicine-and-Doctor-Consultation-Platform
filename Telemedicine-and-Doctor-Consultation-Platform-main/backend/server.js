/* ════════════════════════════════════════════
   MEDICONNECT — EXPRESS API SERVER
   Port: 5000
════════════════════════════════════════════ */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors());
app.use(express.json());

/* ─── Routes ─── */
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/patients',    require('./routes/patients'));
app.use('/api/doctors',     require('./routes/doctors'));
app.use('/api/consultations',require('./routes/consultations'));
app.use('/api/prescriptions',require('./routes/prescriptions'));
app.use('/api/orders',      require('./routes/orders'));
app.use('/api/inventory',   require('./routes/inventory'));
app.use('/api/analytics',   require('./routes/analytics'));
app.use('/api/schedules',   require('./routes/schedules'));
app.use('/api/messages',    require('./routes/messages'));

/* ─── Health check ─── */
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'MediConnect API',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}));

/* ─── 404 handler ─── */
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

/* ─── Error handler ─── */
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🏥 MediConnect API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});

module.exports = app;
