import { z } from 'zod';
import db from '../config/database.js';
import { canAccessReport } from '../middleware/auth.js';

const shareSchema = z.object({
  report_id: z.coerce.number(),
  viewer_email: z.string().email(),
});

export function createShare(req, res) {
  try {
    const data = shareSchema.parse(req.body);

    const report = db
      .prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?')
      .get(data.report_id, req.user.id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const viewer = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(data.viewer_email.toLowerCase());

    if (!viewer) {
      return res.status(404).json({ error: 'User with this email not found. They must register first.' });
    }

    if (viewer.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot share with yourself' });
    }

    const existing = db
      .prepare('SELECT id FROM shares WHERE report_id = ? AND viewer_id = ?')
      .get(data.report_id, viewer.id);

    if (existing) {
      return res.status(409).json({ error: 'Report already shared with this user' });
    }

    const result = db
      .prepare(
        'INSERT INTO shares (report_id, owner_id, viewer_id) VALUES (?, ?, ?)'
      )
      .run(data.report_id, req.user.id, viewer.id);

    const share = getShareById(result.lastInsertRowid);
    res.status(201).json({ share });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to share report' });
  }
}

function getShareById(id) {
  return db.prepare(`
    SELECT s.*,
           r.title as report_title, r.report_type, r.report_date,
           viewer.name as viewer_name, viewer.email as viewer_email,
           owner.name as owner_name, owner.email as owner_email
    FROM shares s
    JOIN reports r ON r.id = s.report_id
    JOIN users viewer ON viewer.id = s.viewer_id
    JOIN users owner ON owner.id = s.owner_id
    WHERE s.id = ?
  `).get(id);
}

export function listSentShares(req, res) {
  const shares = db.prepare(`
    SELECT s.*,
           r.title as report_title, r.report_type, r.report_date,
           viewer.name as viewer_name, viewer.email as viewer_email
    FROM shares s
    JOIN reports r ON r.id = s.report_id
    JOIN users viewer ON viewer.id = s.viewer_id
    WHERE s.owner_id = ?
    ORDER BY s.created_at DESC
  `).all(req.user.id);

  res.json({ shares });
}

export function listReceivedShares(req, res) {
  const shares = db.prepare(`
    SELECT s.*,
           r.title as report_title, r.report_type, r.report_date, r.file_mime,
           owner.name as owner_name, owner.email as owner_email
    FROM shares s
    JOIN reports r ON r.id = s.report_id
    JOIN users owner ON owner.id = s.owner_id
    WHERE s.viewer_id = ?
    ORDER BY s.created_at DESC
  `).all(req.user.id);

  res.json({ shares });
}

export function revokeShare(req, res) {
  const shareId = Number(req.params.id);
  const result = db
    .prepare('DELETE FROM shares WHERE id = ? AND owner_id = ?')
    .run(shareId, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Share not found' });
  }

  res.json({ message: 'Access revoked' });
}

export function getSharedReport(req, res) {
  const reportId = Number(req.params.reportId);
  const access = canAccessReport(req.user.id, reportId);

  if (!access.allowed || access.access !== 'viewer') {
    if (access.access === 'owner') {
      return res.status(400).json({ error: 'Use /reports/:id for owned reports' });
    }
    return res.status(404).json({ error: 'Shared report not found' });
  }

  const report = db.prepare(`
    SELECT r.*, u.name as owner_name, u.email as owner_email
    FROM reports r
    JOIN users u ON u.id = r.user_id
    WHERE r.id = ?
  `).get(reportId);

  const vitals = db.prepare('SELECT * FROM vitals WHERE report_id = ?').all(reportId);

  res.json({ report: { ...report, vitals }, access: 'viewer' });
}
