const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  if (!req.session.userId) return res.json([]);
  const notes = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.session.userId);
  res.json(notes);
});

router.patch('/:id/read', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(req.params.id, req.session.userId);
  res.json({ success: true });
});

router.patch('/read-all', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(req.session.userId);
  res.json({ success: true });
});

router.get('/unread-count', (req, res) => {
  if (!req.session.userId) return res.json({ count: 0 });
  const count = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND is_read=0').get(req.session.userId);
  res.json({ count: count.c });
});

module.exports = router;
