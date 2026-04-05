const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

// Get all requests
router.get('/', (req, res) => {
  const { status, blood_type, urgency, city } = req.query;
  let query = `SELECT r.*, u.name as requester_name FROM blood_requests r LEFT JOIN users u ON r.requester_id=u.id WHERE 1=1`;
  const params = [];
  if (status) { query += ' AND r.status=?'; params.push(status); }
  else { query += " AND r.status='open'"; }
  if (blood_type) { query += ' AND r.blood_type=?'; params.push(blood_type); }
  if (urgency) { query += ' AND r.urgency=?'; params.push(urgency); }
  if (city) { query += ' AND LOWER(r.city) LIKE ?'; params.push('%' + city.toLowerCase() + '%'); }
  query += ' ORDER BY CASE r.urgency WHEN "critical" THEN 1 WHEN "urgent" THEN 2 ELSE 3 END, r.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// Create request
router.post('/', (req, res) => {
  const { patient_name, blood_type, units_needed, urgency, hospital, city, contact_name, contact_phone, reason } = req.body;
  if (!patient_name || !blood_type || !units_needed || !hospital || !city || !contact_name || !contact_phone) return res.status(400).json({ error: 'Missing required fields' });

  const rid = uuidv4();
  db.prepare('INSERT INTO blood_requests (id,patient_name,blood_type,units_needed,urgency,hospital,city,contact_name,contact_phone,reason,requester_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(rid, patient_name, blood_type, parseInt(units_needed), urgency || 'normal', hospital, city, contact_name, contact_phone, reason || '', req.session.userId || null);

  // Notify matching available donors
  const compat = getCompatibleTypes(blood_type);
  const matchingDonors = db.prepare(`SELECT d.user_id FROM donors d WHERE d.blood_type IN (${compat.map(() => '?').join(',')}) AND d.is_available=1 AND LOWER(d.city) LIKE ?`).all(...compat, '%' + city.toLowerCase() + '%');
  
  const urgencyLabel = urgency === 'critical' ? '🚨 CRITICAL' : urgency === 'urgent' ? '⚡ Urgent' : 'ℹ️ New';
  matchingDonors.forEach(d => {
    db.prepare('INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)').run(uuidv4(), d.user_id, `${urgencyLabel} Blood Request`, `${blood_type} blood needed at ${hospital}, ${city}. Patient: ${patient_name}. ${units_needed} unit(s). Contact: ${contact_phone}`, urgency === 'critical' ? 'error' : urgency === 'urgent' ? 'warning' : 'info');
  });

  res.json({ success: true, id: rid, matched_donors: matchingDonors.length });
});

// Get single request
router.get('/:id', (req, res) => {
  const req2 = db.prepare('SELECT r.*, u.name as requester_name FROM blood_requests r LEFT JOIN users u ON r.requester_id=u.id WHERE r.id=?').get(req.params.id);
  if (!req2) return res.status(404).json({ error: 'Not found' });
  const responses = db.prepare('SELECT dr.*, d.blood_type, u.name, u.phone FROM donor_responses dr JOIN donors d ON dr.donor_id=d.id JOIN users u ON d.user_id=u.id WHERE dr.request_id=?').all(req.params.id);
  res.json({ ...req2, responses });
});

// Respond to request (donor volunteers)
router.post('/:id/respond', (req, res) => {
  if (!req.session.donorId) return res.status(401).json({ error: 'Must be logged in as donor' });
  const existing = db.prepare('SELECT id FROM donor_responses WHERE donor_id=? AND request_id=?').get(req.session.donorId, req.params.id);
  if (existing) return res.status(409).json({ error: 'Already responded' });

  const respId = uuidv4();
  db.prepare('INSERT INTO donor_responses (id,donor_id,request_id,status) VALUES (?,?,?,?)').run(respId, req.session.donorId, req.params.id, 'pending');
  
  const request = db.prepare('SELECT * FROM blood_requests WHERE id=?').get(req.params.id);
  if (request?.requester_id) {
    const donor = db.prepare('SELECT u.name, d.blood_type FROM donors d JOIN users u ON d.user_id=u.id WHERE d.id=?').get(req.session.donorId);
    db.prepare('INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)').run(uuidv4(), request.requester_id, 'Donor Responded! 🩸', `${donor?.name} (${donor?.blood_type}) has agreed to donate for ${request.patient_name}. Contact them via your request details.`, 'success');
  }

  res.json({ success: true });
});

// Update request status
router.patch('/:id/status', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const { status } = req.body;
  db.prepare('UPDATE blood_requests SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, req.params.id);
  res.json({ success: true });
});

function getCompatibleTypes(bloodType) {
  const compat = {
    'O-': ['O-'], 'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'], 'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'], 'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'], 'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
  };
  return compat[bloodType] || [bloodType];
}

module.exports = router;
