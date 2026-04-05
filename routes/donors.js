const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

// Get all donors (with optional blood type filter)
router.get('/', (req, res) => {
  const { blood_type, city, available } = req.query;
  let query = `SELECT d.*, u.name, u.email, u.phone FROM donors d JOIN users u ON d.user_id=u.id WHERE 1=1`;
  const params = [];
  if (blood_type) { query += ' AND d.blood_type=?'; params.push(blood_type); }
  if (city) { query += ' AND LOWER(d.city) LIKE ?'; params.push('%' + city.toLowerCase() + '%'); }
  if (available === '1') { query += ' AND d.is_available=1'; }
  query += ' ORDER BY d.total_donations DESC';
  const donors = db.prepare(query).all(...params);
  res.json(donors);
});

// Get single donor
router.get('/:id', (req, res) => {
  const donor = db.prepare(`SELECT d.*, u.name, u.email, u.phone FROM donors d JOIN users u ON d.user_id=u.id WHERE d.id=?`).get(req.params.id);
  if (!donor) return res.status(404).json({ error: 'Donor not found' });
  res.json(donor);
});

// Update donor profile
router.put('/:id', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const donor = db.prepare('SELECT * FROM donors WHERE id=? AND user_id=?').get(req.params.id, req.session.userId);
  if (!donor) return res.status(403).json({ error: 'Forbidden' });

  const { city, state, age, weight, gender, is_available, blood_type, health_conditions } = req.body;
  db.prepare(`UPDATE donors SET city=COALESCE(?,city), state=COALESCE(?,state), age=COALESCE(?,age), weight=COALESCE(?,weight), gender=COALESCE(?,gender), is_available=COALESCE(?,is_available), blood_type=COALESCE(?,blood_type), health_conditions=COALESCE(?,health_conditions), updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(city, state, age, weight, gender, is_available !== undefined ? (is_available ? 1 : 0) : null, blood_type, health_conditions, req.params.id);
  res.json({ success: true });
});

// Log a donation
router.post('/:id/donate', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const donor = db.prepare('SELECT * FROM donors WHERE id=? AND user_id=?').get(req.params.id, req.session.userId);
  if (!donor) return res.status(403).json({ error: 'Forbidden' });

  const { blood_bank, hemoglobin_level, volume_ml, notes, request_id } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const vol = parseInt(volume_ml) || 450;

  const donId = uuidv4();
  db.prepare('INSERT INTO donations (id,donor_id,request_id,donation_date,volume_ml,blood_bank,hemoglobin_level,notes) VALUES (?,?,?,?,?,?,?,?)').run(donId, req.params.id, request_id || null, today, vol, blood_bank || '', parseFloat(hemoglobin_level) || null, notes || '');
  db.prepare(`UPDATE donors SET total_donations=total_donations+1, total_volume_ml=total_volume_ml+?, last_donation_date=?, is_available=0, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(vol, today, req.params.id);

  // Notification
  db.prepare('INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)').run(uuidv4(), req.session.userId, 'Donation Logged ✅', `Your donation of ${vol}ml has been recorded. Thank you for saving lives!`, 'success');

  res.json({ success: true, donation_id: donId });
});

// Donor donations history
router.get('/:id/donations', (req, res) => {
  const donations = db.prepare('SELECT * FROM donations WHERE donor_id=? ORDER BY donation_date DESC').all(req.params.id);
  res.json(donations);
});

// ML Prediction
router.post('/predict', (req, res) => {
  const { recency, frequency, monetary, time_months, age_group, blood_type } = req.body;
  const R = parseFloat(recency) || 0;
  const F = parseFloat(frequency) || 0;
  const M = parseFloat(monetary) || 0;
  const T = parseFloat(time_months) || 1;

  // RFMTC model simulation
  const rScore = R <= 2 ? 100 : R <= 6 ? 82 : R <= 12 ? 62 : R <= 24 ? 40 : 18;
  const fScore = Math.min(F * 9, 100);
  const mScore = Math.min(M / 35, 100);
  const tScore = T > 0 ? Math.min((F / T) * 1000, 100) : 0;
  const ageBonus = age_group === '26-35' ? 5 : age_group === '36-45' ? 3 : 0;
  const universalBonus = blood_type === 'O-' ? 4 : blood_type === 'AB+' ? -2 : 0;
  const raw = (rScore * 0.3 + fScore * 0.25 + mScore * 0.2 + tScore * 0.25) + ageBonus + universalBonus;
  const score = Math.min(Math.max(Math.round(raw), 5), 97);

  const segments = score >= 75 ? 'Champion' : score >= 55 ? 'Loyal' : score >= 35 ? 'At Risk' : 'Lapsed';
  const advice = score >= 75 ? 'High-probability donor. Send VIP appreciation + scheduled reminder at day 60.'
    : score >= 55 ? 'Moderate engagement. Send social proof campaigns and community impact stories.'
    : score >= 35 ? 'Lapsing donor. Trigger win-back sequence with personalised impact data.'
    : 'Lapsed donor. Consider barrier-removal outreach and educational content.';

  res.json({ score, segment: segments, recency_score: rScore, frequency_score: Math.round(fScore), monetary_score: Math.round(mScore), time_score: Math.round(tScore), advice });
});

module.exports = router;
