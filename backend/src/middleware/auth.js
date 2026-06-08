import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import { sanitizeUser } from '../utils/auth.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = sanitizeUser(user);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireOwner(req, res, next) {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required' });
  }
  next();
}

export function canAccessReport(userId, reportId) {
  const report = db
    .prepare('SELECT id, user_id FROM reports WHERE id = ?')
    .get(reportId);

  if (!report) return { allowed: false, report: null };
  if (report.user_id === userId) return { allowed: true, report, access: 'owner' };

  const share = db
    .prepare('SELECT id FROM shares WHERE report_id = ? AND viewer_id = ?')
    .get(reportId, userId);

  if (share) return { allowed: true, report, access: 'viewer' };

  return { allowed: false, report: null };
}
