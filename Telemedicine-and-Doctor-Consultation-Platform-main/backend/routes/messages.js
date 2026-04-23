const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../config/db');

// GET /api/messages/consultation/:consultationId
// Get all messages for a consultation
router.get('/consultation/:consultationId', auth, async (req, res) => {
  try {
    const { consultationId } = req.params;

    const [rows] = await db.query(
      `SELECT id, consultation_id as consultationId, sender_id as senderId, sender_role as senderRole, 
              message_text as messageText, sent_at as sentAt
       FROM consultation_messages 
       WHERE consultation_id = ?
       ORDER BY sent_at ASC`,
      [consultationId]
    );

    res.json({ count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// POST /api/messages/send
// Send a message in a consultation
router.post('/send', auth, async (req, res) => {
  try {
    const { consultationId, senderId, senderRole, messageText } = req.body;

    if (!consultationId || !senderId || !senderRole || !messageText) {
      return res.status(400).json({ 
        error: 'consultationId, senderId, senderRole, and messageText are required' 
      });
    }

    if (!['patient', 'doctor'].includes(senderRole)) {
      return res.status(400).json({ error: 'Invalid sender role. Must be patient or doctor' });
    }

    await db.query(
      `INSERT INTO consultation_messages 
       (consultation_id, sender_id, sender_role, message_text) 
       VALUES (?, ?, ?, ?)`,
      [consultationId, senderId, senderRole, messageText]
    );

    const [rows] = await db.query(
      `SELECT id, consultation_id as consultationId, sender_id as senderId, 
              sender_role as senderRole, message_text as messageText, sent_at as sentAt
       FROM consultation_messages 
       WHERE consultation_id = ? 
       ORDER BY sent_at DESC LIMIT 1`,
      [consultationId]
    );

    if (rows.length === 0) {
      return res.status(500).json({ error: 'Failed to retrieve saved message' });
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// DELETE /api/messages/:messageId
// Delete a message (only own messages)
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    await db.query('DELETE FROM consultation_messages WHERE id = ?', [messageId]);

    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

module.exports = router;
