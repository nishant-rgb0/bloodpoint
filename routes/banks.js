const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

// Get all banks with inventory
router.get('/', (req, res) => {
  const { city } = req.query;
  let q = 'SELECT * FROM blood_banks WHERE 1=1';
  const p = [];
  if (city) { q += ' AND LOWER(city) LIKE ?'; p.push('%' + city.toLowerCase() + '%'); }
  const banks = db.prepare(q).all(...p);
  const result = banks.map(b => {
    const inv = db.prepare('SELECT blood_type, units_available, units_reserved FROM inventory WHERE bank_id=? ORDER BY blood_type').all(b.id);
    return { ...b, inventory: inv };
  });
  res.json(result);
});

// Get inventory summary (all banks, all types)
router.get('/inventory/summary', (req, res) => {
  const summary = db.prepare(`SELECT blood_type, SUM(units_available) as total_available, SUM(units_reserved) as total_reserved FROM inventory GROUP BY blood_type ORDER BY blood_type`).all();
  res.json(summary);
});

// Analytics
router.get('/analytics/stats', (req, res) => {
  const totalDonors = db.prepare('SELECT COUNT(*) as c FROM donors').get().c;
  const availableDonors = db.prepare('SELECT COUNT(*) as c FROM donors WHERE is_available=1').get().c;
  const totalDonations = db.prepare('SELECT COUNT(*) as c FROM donations').get().c;
  const openRequests = db.prepare("SELECT COUNT(*) as c FROM blood_requests WHERE status='open'").get().c;
  const urgentRequests = db.prepare("SELECT COUNT(*) as c FROM blood_requests WHERE status='open' AND urgency IN ('urgent','critical')").get().c;
  const totalVolume = db.prepare('SELECT SUM(volume_ml) as v FROM donations').get().v || 0;
  const bloodTypeDistribution = db.prepare('SELECT blood_type, COUNT(*) as count FROM donors GROUP BY blood_type ORDER BY count DESC').all();
  const cityDistribution = db.prepare('SELECT city, COUNT(*) as count FROM donors GROUP BY city ORDER BY count DESC LIMIT 8').all();
  const monthlyDonations = db.prepare(`SELECT strftime('%Y-%m', donation_date) as month, COUNT(*) as count FROM donations GROUP BY month ORDER BY month DESC LIMIT 12`).all();
  const topDonors = db.prepare(`SELECT d.id, u.name, d.blood_type, d.city, d.total_donations, d.total_volume_ml FROM donors d JOIN users u ON d.user_id=u.id ORDER BY d.total_donations DESC LIMIT 10`).all();

  res.json({ totalDonors, availableDonors, totalDonations, openRequests, urgentRequests, totalVolume, bloodTypeDistribution, cityDistribution, monthlyDonations, topDonors });
});

module.exports = router;
