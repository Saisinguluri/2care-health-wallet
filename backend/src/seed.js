import bcrypt from 'bcryptjs';
import db from './config/database.js';

const password = bcrypt.hashSync('demo1234', 12);

const insertUser = db.prepare(
  'INSERT OR IGNORE INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
);

const owner = insertUser.run('owner@2care.demo', password, 'Alex Morgan', 'owner');
const doctor = insertUser.run('doctor@2care.demo', password, 'Dr. Sarah Chen', 'viewer');
const family = insertUser.run('family@2care.demo', password, 'Jamie Morgan', 'viewer');

const ownerId = db.prepare('SELECT id FROM users WHERE email = ?').get('owner@2care.demo').id;

const insertReport = db.prepare(`
  INSERT INTO reports (user_id, title, report_type, file_path, file_name, file_mime, file_size, report_date, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertVital = db.prepare(`
  INSERT INTO vitals (user_id, report_id, vital_type, value, unit, recorded_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Demo reports (placeholder paths - no actual files)
const r1 = insertReport.run(
  ownerId, 'Annual Blood Panel 2025', 'blood_test',
  `${ownerId}/demo-blood-test.pdf`, 'blood-panel-2025.pdf', 'application/pdf', 245000,
  '2025-03-15', 'Routine annual checkup'
);

const r2 = insertReport.run(
  ownerId, 'Chest X-Ray', 'x_ray',
  `${ownerId}/demo-xray.png`, 'chest-xray.png', 'image/png', 890000,
  '2025-01-20', 'Follow-up imaging'
);

const reportId1 = r1.lastInsertRowid;

const vitals = [
  ['blood_sugar', 95, 'mg/dL', '2025-01-10T08:00:00.000Z'],
  ['blood_sugar', 102, 'mg/dL', '2025-02-10T08:00:00.000Z'],
  ['blood_sugar', 98, 'mg/dL', '2025-03-15T08:00:00.000Z'],
  ['blood_sugar', 105, 'mg/dL', '2025-04-10T08:00:00.000Z'],
  ['blood_sugar', 99, 'mg/dL', '2025-05-10T08:00:00.000Z'],
  ['heart_rate', 72, 'bpm', '2025-01-10T08:00:00.000Z'],
  ['heart_rate', 68, 'bpm', '2025-02-10T08:00:00.000Z'],
  ['heart_rate', 75, 'bpm', '2025-03-15T08:00:00.000Z'],
  ['heart_rate', 70, 'bpm', '2025-04-10T08:00:00.000Z'],
  ['heart_rate', 73, 'bpm', '2025-05-10T08:00:00.000Z'],
  ['blood_pressure_systolic', 118, 'mmHg', '2025-03-15T08:00:00.000Z', reportId1],
  ['blood_pressure_diastolic', 76, 'mmHg', '2025-03-15T08:00:00.000Z', reportId1],
  ['cholesterol', 185, 'mg/dL', '2025-03-15T08:00:00.000Z', reportId1],
  ['hemoglobin', 14.2, 'g/dL', '2025-03-15T08:00:00.000Z', reportId1],
  ['weight', 72.5, 'kg', '2025-01-10T08:00:00.000Z'],
  ['weight', 72.1, 'kg', '2025-03-15T08:00:00.000Z'],
  ['weight', 71.8, 'kg', '2025-05-10T08:00:00.000Z'],
  ['oxygen_saturation', 98, '%', '2025-05-10T08:00:00.000Z'],
];

for (const [type, value, unit, date, reportId] of vitals) {
  insertVital.run(ownerId, reportId || null, type, value, unit, date);
}

const doctorId = db.prepare('SELECT id FROM users WHERE email = ?').get('doctor@2care.demo').id;
const familyId = db.prepare('SELECT id FROM users WHERE email = ?').get('family@2care.demo').id;

db.prepare('INSERT OR IGNORE INTO shares (report_id, owner_id, viewer_id) VALUES (?, ?, ?)').run(reportId1, ownerId, doctorId);
db.prepare('INSERT OR IGNORE INTO shares (report_id, owner_id, viewer_id) VALUES (?, ?, ?)').run(r2.lastInsertRowid, ownerId, familyId);

console.log('Seed complete!');
console.log('Demo accounts (password: demo1234):');
console.log('  Owner:  owner@2care.demo');
console.log('  Doctor: doctor@2care.demo');
console.log('  Family: family@2care.demo');
