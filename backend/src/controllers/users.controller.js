import db from '../config/database.js';

export function searchUsers(req, res) {
  const { email } = req.query;
  if (!email || email.length < 3) {
    return res.status(400).json({ error: 'Email query must be at least 3 characters' });
  }

  const users = db
    .prepare(
      `SELECT id, name, email, role FROM users
       WHERE email LIKE ? AND id != ?
       LIMIT 10`
    )
    .all(`%${email.toLowerCase()}%`, req.user.id);

  res.json({ users });
}

export function getDashboardStats(req, res) {
  const userId = req.user.id;

  const reportCount = db
    .prepare('SELECT COUNT(*) as count FROM reports WHERE user_id = ?')
    .get(userId).count;

  const vitalCount = db
    .prepare('SELECT COUNT(*) as count FROM vitals WHERE user_id = ?')
    .get(userId).count;

  const sharedCount = db
    .prepare('SELECT COUNT(*) as count FROM shares WHERE owner_id = ?')
    .get(userId).count;

  const receivedCount = db
    .prepare('SELECT COUNT(*) as count FROM shares WHERE viewer_id = ?')
    .get(userId).count;

  const recentReports = db.prepare(`
    SELECT id, title, report_type, report_date, created_at
    FROM reports WHERE user_id = ?
    ORDER BY report_date DESC LIMIT 5
  `).all(userId);

  const recentVitals = db.prepare(`
    SELECT vital_type, value, unit, recorded_at
    FROM vitals WHERE user_id = ?
    ORDER BY recorded_at DESC LIMIT 5
  `).all(userId);

  res.json({
    stats: { reportCount, vitalCount, sharedCount, receivedCount },
    recentReports,
    recentVitals,
  });
}
