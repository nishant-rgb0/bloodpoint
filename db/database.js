const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'bloodpoint.db.json');

let _db = null;

function loadData() {
  if (fs.existsSync(DB_PATH)) {
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch {}
  }
  return { users: [], donors: [], blood_requests: [], donations: [], blood_banks: [], inventory: [], notifications: [], donor_responses: [] };
}

function saveData() { fs.writeFileSync(DB_PATH, JSON.stringify(_db, null, 2)); }

function now() { return new Date().toISOString(); }

function initDB() {
  _db = loadData();
  seedBanks();
  seedDemo();
}

function seedBanks() {
  if (_db.blood_banks.length > 0) return;
  const banks = [
    { id: uuidv4(), name: 'AIIMS Blood Bank', address: 'Ansari Nagar, New Delhi', city: 'Delhi', phone: '011-26588500', email: 'blood@aiims.edu', is_24h: true, latitude: 28.5672, longitude: 77.2100 },
    { id: uuidv4(), name: 'Red Cross Society', address: 'Connaught Place, New Delhi', city: 'Delhi', phone: '011-23716441', email: 'info@redcrossdelhi.org', is_24h: false, latitude: 28.6315, longitude: 77.2167 },
    { id: uuidv4(), name: 'Apollo Hospital Blood Bank', address: 'Sarita Vihar, New Delhi', city: 'Delhi', phone: '011-26825858', email: 'blood@apollo.com', is_24h: true, latitude: 28.5355, longitude: 77.2906 },
    { id: uuidv4(), name: 'Safdarjung Blood Bank', address: 'Safdarjung Hospital, New Delhi', city: 'Delhi', phone: '011-26707444', email: 'blood@safdarjung.org', is_24h: false, latitude: 28.5679, longitude: 77.2067 },
    { id: uuidv4(), name: 'Sir Ganga Ram Blood Bank', address: 'Old Rajinder Nagar, New Delhi', city: 'Delhi', phone: '011-25750000', email: 'blood@sgrh.com', is_24h: true, latitude: 28.6421, longitude: 77.1883 },
  ];
  const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
  banks.forEach(b => {
    _db.blood_banks.push({ ...b, opening_time: '08:00', closing_time: '20:00', created_at: now() });
    bloodTypes.forEach(bt => {
      _db.inventory.push({ id: uuidv4(), bank_id: b.id, blood_type: bt, units_available: Math.floor(Math.random() * 28) + 3, units_reserved: 0, updated_at: now() });
    });
  });
  saveData();
}

function seedDemo() {
  if (_db.users.find(u => u.email === 'demo@bloodpoint.in')) return;
  const uid = uuidv4(), did = uuidv4();
  _db.users.push({ id: uid, name: 'Demo User', email: 'demo@bloodpoint.in', phone: '9876543210', password_hash: bcrypt.hashSync('demo123', 10), role: 'donor', created_at: now() });
  _db.donors.push({ id: did, user_id: uid, blood_type: 'O+', city: 'Delhi', state: 'Delhi', age: 28, weight: 70, gender: 'male', is_available: true, last_donation_date: '2024-08-10', first_donation_date: '2022-01-15', total_donations: 5, total_volume_ml: 2250, health_conditions: '', latitude: 0, longitude: 0, created_at: now(), updated_at: now() });
  _db.notifications.push({ id: uuidv4(), user_id: uid, title: 'Welcome to BloodPoint! 🩸', message: 'You are registered as a donor. You will be notified when someone needs O+ blood.', type: 'success', is_read: false, created_at: now() });
  saveData();
}

// ── Public API (mirrors better-sqlite3 sync interface) ────────────────────────

const db = {
  prepare(sql) {
    return {
      get: (...p) => runQuery(sql, flatten(p), 'get'),
      all: (...p) => runQuery(sql, flatten(p), 'all'),
      run: (...p) => { runQuery(sql, flatten(p), 'run'); return { changes: 1 }; },
    };
  },
  exec() {},
  pragma() {},
};

function flatten(p) { return p.flat ? p.flat(Infinity) : [].concat(...p); }

function runQuery(sql, params, mode) {
  const s = sql.trim().toLowerCase();
  if (s.startsWith('select')) return runSelect(sql, s, params, mode);
  if (s.startsWith('insert')) { runInsert(s, params); saveData(); }
  if (s.startsWith('update')) { runUpdate(s, params); saveData(); }
  if (s.startsWith('delete')) { runDelete(s, params); saveData(); }
}

// ── SELECT ────────────────────────────────────────────────────────────────────

function runSelect(sql, sl, params, mode) {
  let rows = [];

  // users
  if (sl.includes('from users')) {
    rows = _db.users.map(u => ({ ...u }));
    if (sl.includes('email=?')) { const v = params.find(p => typeof p === 'string' && p.includes('@')); if (v) rows = rows.filter(r => r.email === v); }
    if (sl.includes('where') && sl.includes('id=?') && !sl.includes('user_id')) { const v = params[0]; rows = rows.filter(r => r.id === v); }
    if (sl.includes('id,name,email,phone,role')) rows = rows.map(r => ({ id: r.id, name: r.name, email: r.email, phone: r.phone, role: r.role, created_at: r.created_at }));
  }

  // donors
  else if (sl.includes('from donors') && !sl.includes('donor_responses')) {
    rows = _db.donors.map(d => { const u = _db.users.find(u => u.id === d.user_id) || {}; return { ...d, name: u.name, email: u.email, phone: u.phone }; });
    rows = whereFilter(rows, sl, params);
    if (sl.includes('order by') && sl.includes('total_donations')) rows.sort((a, b) => b.total_donations - a.total_donations);
    if (sl.includes('limit 10')) rows = rows.slice(0, 10);
  }

  // blood_requests
  else if (sl.includes('from blood_requests')) {
    rows = _db.blood_requests.map(r => { const u = _db.users.find(u => u.id === r.requester_id) || {}; return { ...r, requester_name: u.name }; });
    rows = whereFilter(rows, sl, params);
    const uo = { critical: 1, urgent: 2, normal: 3 };
    rows.sort((a, b) => (uo[a.urgency] || 3) - (uo[b.urgency] || 3) || new Date(b.created_at) - new Date(a.created_at));
  }

  // donations
  else if (sl.includes('from donations')) {
    rows = _db.donations.map(d => ({ ...d }));
    rows = whereFilter(rows, sl, params);
    rows.sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date));
  }

  // blood_banks
  else if (sl.includes('from blood_banks')) {
    rows = _db.blood_banks.map(b => ({ ...b }));
    if (sl.includes('city') && sl.includes('like')) {
      const v = params.find(p => typeof p === 'string' && p.includes('%'));
      if (v) { const c = v.replace(/%/g, '').toLowerCase(); rows = rows.filter(r => r.city && r.city.toLowerCase().includes(c)); }
    }
  }

  // inventory grouped
  else if (sl.includes('from inventory') && sl.includes('group by blood_type')) {
    const g = {};
    _db.inventory.forEach(i => {
      if (!g[i.blood_type]) g[i.blood_type] = { blood_type: i.blood_type, total_available: 0, total_reserved: 0 };
      g[i.blood_type].total_available += i.units_available;
      g[i.blood_type].total_reserved += i.units_reserved;
    });
    rows = Object.values(g).sort((a, b) => a.blood_type.localeCompare(b.blood_type));
  }

  // inventory plain
  else if (sl.includes('from inventory')) {
    rows = _db.inventory.map(i => ({ ...i }));
    rows = whereFilter(rows, sl, params);
    if (sl.includes('order by blood_type')) rows.sort((a, b) => a.blood_type.localeCompare(b.blood_type));
  }

  // notifications
  else if (sl.includes('from notifications')) {
    rows = _db.notifications.map(n => ({ ...n }));
    rows = whereFilter(rows, sl, params);
    rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sl.includes('limit 50')) rows = rows.slice(0, 50);
  }

  // donor_responses
  else if (sl.includes('from donor_responses')) {
    rows = _db.donor_responses.map(dr => { const d = _db.donors.find(d => d.id === dr.donor_id) || {}; const u = _db.users.find(u => u.id === d.user_id) || {}; return { ...dr, blood_type: d.blood_type, name: u.name, phone: u.phone }; });
    rows = whereFilter(rows, sl, params);
  }

  // COUNT(*)
  if (sl.includes('count(*)')) { const c = rows.length; return mode === 'get' ? { c } : [{ c }]; }

  // SUM(volume_ml)
  if (sl.includes('sum(volume_ml)')) { const v = rows.reduce((a, r) => a + (Number(r.volume_ml) || 0), 0); return mode === 'get' ? { v } : [{ v }]; }

  // Analytics: blood type distribution
  if (sl.includes('group by blood_type') && sl.includes('from donors')) {
    const g = {}; _db.donors.forEach(d => { g[d.blood_type] = (g[d.blood_type] || 0) + 1; });
    rows = Object.entries(g).map(([blood_type, count]) => ({ blood_type, count })).sort((a, b) => b.count - a.count);
  }

  // Analytics: city distribution
  if (sl.includes('group by') && sl.includes('city') && sl.includes('from donors')) {
    const g = {}; _db.donors.forEach(d => { if (d.city) g[d.city] = (g[d.city] || 0) + 1; });
    rows = Object.entries(g).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }

  // Analytics: monthly donations
  if (sl.includes("strftime")) {
    const g = {}; _db.donations.forEach(d => { const m = (d.donation_date || '').substring(0, 7) || 'unknown'; g[m] = (g[m] || 0) + 1; });
    rows = Object.entries(g).map(([month, count]) => ({ month, count })).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12);
  }

  // Top donors
  if (sl.includes('order by') && sl.includes('total_donations desc') && sl.includes('limit 10')) {
    rows = _db.donors.map(d => { const u = _db.users.find(u => u.id === d.user_id) || {}; return { id: d.id, name: u.name, blood_type: d.blood_type, city: d.city, total_donations: d.total_donations, total_volume_ml: d.total_volume_ml }; }).sort((a, b) => b.total_donations - a.total_donations).slice(0, 10);
  }

  return mode === 'get' ? (rows[0] || null) : rows;
}

// ── WHERE helper ──────────────────────────────────────────────────────────────

function whereFilter(rows, sl, params) {
  if (!sl.includes('where')) return rows;

  // id=? (simple)
  if (sl.match(/where\s+\w+\.?id\s*=\s*\?/) && !sl.includes('user_id') && !sl.includes('and')) {
    const v = params[0]; if (v) rows = rows.filter(r => r.id === v);
  }
  // id=? AND user_id=?
  if (sl.includes('id=?') && sl.includes('user_id=?')) {
    rows = rows.filter(r => r.id === params[0] && r.user_id === params[1]);
  }
  // user_id=?
  else if (sl.includes('user_id=?') && !sl.includes('id=?')) {
    const v = params[0]; if (v) rows = rows.filter(r => r.user_id === v);
  }
  // donor_id=? AND request_id=?
  if (sl.includes('donor_id=?') && sl.includes('request_id=?')) {
    rows = rows.filter(r => r.donor_id === params[0] && r.request_id === params[1]);
  } else {
    if (sl.includes('donor_id=?')) { const v = params[0]; if (v) rows = rows.filter(r => r.donor_id === v); }
    if (sl.includes('request_id=?')) { const v = params[0]; if (v) rows = rows.filter(r => r.request_id === v); }
  }
  if (sl.includes('bank_id=?')) { const v = params[0]; if (v) rows = rows.filter(r => r.bank_id === v); }

  // blood_type IN (...)
  if (sl.includes('blood_type in')) {
    const types = params.filter(p => ['O+','O-','A+','A-','B+','B-','AB+','AB-'].includes(p));
    if (types.length) rows = rows.filter(r => types.includes(r.blood_type));
  } else if (sl.includes('blood_type=?')) {
    const v = params.find(p => ['O+','O-','A+','A-','B+','B-','AB+','AB-'].includes(p));
    if (v) rows = rows.filter(r => r.blood_type === v);
  }

  // city LIKE
  if (sl.includes('city') && sl.includes('like')) {
    const v = params.find(p => typeof p === 'string' && p.includes('%'));
    if (v) { const c = v.replace(/%/g,'').toLowerCase(); rows = rows.filter(r => r.city && r.city.toLowerCase().includes(c)); }
  }

  // is_available
  if (sl.includes('is_available=1')) rows = rows.filter(r => r.is_available === true || r.is_available === 1);

  // status
  if (sl.includes("status='open'")) rows = rows.filter(r => r.status === 'open');
  if (sl.includes('status=?')) { const v = params.find(p => ['open','closed','fulfilled','pending','completed'].includes(p)); if (v) rows = rows.filter(r => r.status === v); }

  // urgency
  if (sl.includes("urgency in ('urgent','critical')")) rows = rows.filter(r => ['urgent','critical'].includes(r.urgency));
  else if (sl.includes('urgency=?')) { const v = params.find(p => ['normal','urgent','critical'].includes(p)); if (v) rows = rows.filter(r => r.urgency === v); }

  // is_read
  if (sl.includes('is_read=0')) rows = rows.filter(r => !r.is_read);

  // id=? (notifications / generic single)
  if (sl.includes('where') && sl.includes('id=?') && !sl.includes('user_id') && !sl.includes('donor_id') && rows.length > 1) {
    const v = params[params.length - 1]; if (v) rows = rows.filter(r => r.id === v);
  }

  return rows;
}

// ── INSERT ────────────────────────────────────────────────────────────────────

function runInsert(sl, p) {
  if (sl.includes('into users'))
    _db.users.push({ id: p[0], name: p[1], email: p[2], phone: p[3], password_hash: p[4], role: p[5] || 'donor', created_at: now() });
  else if (sl.includes('into donors'))
    _db.donors.push({ id: p[0], user_id: p[1], blood_type: p[2], city: p[3], state: p[4]||'', age: p[5]||null, weight: p[6]||null, gender: p[7]||null, is_available: true, last_donation_date: p[8]||null, first_donation_date: p[9]||null, total_donations: p[10]||0, total_volume_ml: p[11]||0, health_conditions: '', latitude: 0, longitude: 0, created_at: now(), updated_at: now() });
  else if (sl.includes('into blood_requests'))
    _db.blood_requests.push({ id: p[0], patient_name: p[1], blood_type: p[2], units_needed: p[3], urgency: p[4]||'normal', hospital: p[5], city: p[6], contact_name: p[7], contact_phone: p[8], reason: p[9]||'', requester_id: p[10]||null, status: 'open', created_at: now(), updated_at: now() });
  else if (sl.includes('into donations'))
    _db.donations.push({ id: p[0], donor_id: p[1], request_id: p[2]||null, donation_date: p[3], volume_ml: p[4]||450, blood_bank: p[5]||'', hemoglobin_level: p[6]||null, notes: p[7]||'', status: 'completed', created_at: now() });
  else if (sl.includes('into notifications'))
    _db.notifications.push({ id: p[0], user_id: p[1], title: p[2], message: p[3], type: p[4]||'info', is_read: false, created_at: now() });
  else if (sl.includes('into donor_responses'))
    _db.donor_responses.push({ id: p[0], donor_id: p[1], request_id: p[2], status: p[3]||'pending', responded_at: now() });
  else if (sl.includes('into blood_banks'))
    _db.blood_banks.push({ id: p[0], name: p[1], address: p[2], city: p[3], phone: p[4], email: p[5], is_24h: !!p[6], latitude: p[7], longitude: p[8], opening_time: '08:00', closing_time: '20:00', created_at: now() });
  else if (sl.includes('into inventory') || sl.includes('insert or ignore into inventory')) {
    if (!_db.inventory.find(i => i.bank_id === p[1] && i.blood_type === p[2]))
      _db.inventory.push({ id: p[0], bank_id: p[1], blood_type: p[2], units_available: p[3]||0, units_reserved: p[4]||0, updated_at: now() });
  }
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

function runUpdate(sl, p) {
  if (sl.includes('update donors') && sl.includes('total_donations=total_donations+1')) {
    const d = _db.donors.find(d => d.id === p[p.length-1]);
    if (d) { d.total_donations++; d.total_volume_ml += Number(p[0])||450; d.last_donation_date = p[1]; d.is_available = false; d.updated_at = now(); }
  } else if (sl.includes('update donors')) {
    const d = _db.donors.find(d => d.id === p[p.length-1]);
    if (d) {
      const set = (val, key) => { if (val !== undefined && val !== null) d[key] = val; };
      set(p[0], 'city'); set(p[1], 'state'); set(p[2], 'age'); set(p[3], 'weight'); set(p[4], 'gender');
      if (p[5] !== undefined && p[5] !== null) d.is_available = p[5] === 1 || p[5] === true;
      set(p[6], 'blood_type'); set(p[7], 'health_conditions');
      d.updated_at = now();
    }
  } else if (sl.includes('update notifications') && !sl.includes('id=?')) {
    const uid = p[0]; _db.notifications.filter(n => n.user_id === uid).forEach(n => n.is_read = true);
  } else if (sl.includes('update notifications')) {
    const n = _db.notifications.find(n => n.id === p[p.length-1]); if (n) n.is_read = true;
  } else if (sl.includes('update blood_requests')) {
    const r = _db.blood_requests.find(r => r.id === p[p.length-1]); if (r) { r.status = p[0]; r.updated_at = now(); }
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

function runDelete(sl, p) {
  if (sl.includes('from users')) _db.users = _db.users.filter(u => u.id !== p[0]);
  if (sl.includes('from donors')) _db.donors = _db.donors.filter(d => d.id !== p[0]);
}

// ── Boot ──────────────────────────────────────────────────────────────────────

initDB();
module.exports = db;