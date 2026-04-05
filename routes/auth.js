const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

// Register
router.post('/register', (req, res) => {
  const { name, email, phone, password, blood_type, city, state, age, weight, gender, last_donation_date, total_donations } = req.body;
  if (!name || !email || !phone || !password || !blood_type || !city) return res.status(400).json({ error: 'Missing required fields' });

  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const uid = uuidv4();
  const did = uuidv4();

  db.prepare('INSERT INTO users (id,name,email,phone,password_hash) VALUES (?,?,?,?,?)').run(uid, name, email, phone, hash);

  const firstDon = last_donation_date || null;
  const totalDon = parseInt(total_donations) || 0;
  const volMl = totalDon * 450;
  db.prepare('INSERT INTO donors (id,user_id,blood_type,city,state,age,weight,gender,last_donation_date,first_donation_date,total_donations,total_volume_ml) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(did, uid, blood_type, city, state || '', parseInt(age) || null, parseFloat(weight) || null, gender || null, firstDon, firstDon, totalDon, volMl);

  // Welcome notification
  db.prepare('INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)').run(uuidv4(), uid, 'Welcome to BloodPoint! 🩸', `Hi ${name}, you're now registered as a donor. You'll be notified when someone near you needs ${blood_type} blood.`, 'success');

  req.session.userId = uid;
  req.session.donorId = did;
  req.session.name = name;

  res.json({ success: true, user: { id: uid, name, email, blood_type, city } });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });

  const donor = db.prepare('SELECT * FROM donors WHERE user_id=?').get(user.id);
  req.session.userId = user.id;
  req.session.donorId = donor?.id;
  req.session.name = user.name;

  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, blood_type: donor?.blood_type, city: donor?.city, donor_id: donor?.id } });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Me
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  const user = db.prepare('SELECT id,name,email,phone,role,created_at FROM users WHERE id=?').get(req.session.userId);
  const donor = db.prepare('SELECT * FROM donors WHERE user_id=?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ user, donor });
});

module.exports = router;
