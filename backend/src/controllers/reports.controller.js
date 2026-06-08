import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import db from '../config/database.js';
import { REPORT_TYPES, VITAL_TYPES } from '../constants.js';
import { canAccessReport } from '../middleware/auth.js';
import { uploadsRoot } from '../middleware/upload.js';

const reportSchema = z.object({
  title: z.string().min(1).max(200),
  report_type: z.enum(REPORT_TYPES),
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(1000).optional(),
});

const vitalEntrySchema = z.object({
  vital_type: z.string(),
  value: z.coerce.number(),
  unit: z.string().optional(),
  recorded_at: z.string().optional(),
});

export function getReportTypes(_req, res) {
  res.json({ reportTypes: REPORT_TYPES, vitalTypes: VITAL_TYPES });
}

export function createReport(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Report file is required' });
    }

    const data = reportSchema.parse(req.body);
    let vitalsData = [];
    if (req.body.vitals) {
      try {
        const parsed = JSON.parse(req.body.vitals);
        vitalsData = z.array(vitalEntrySchema).parse(parsed);
      } catch {
        return res.status(400).json({ error: 'Invalid vitals JSON' });
      }
    }

    const insertReport = db.prepare(`
      INSERT INTO reports (user_id, title, report_type, file_path, file_name, file_mime, file_size, report_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertVital = db.prepare(`
      INSERT INTO vitals (user_id, report_id, vital_type, value, unit, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      const relativePath = path.relative(uploadsRoot, req.file.path).replace(/\\/g, '/');
      const result = insertReport.run(
        req.user.id,
        data.title,
        data.report_type,
        relativePath,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        data.report_date,
        data.notes || null
      );

      const reportId = result.lastInsertRowid;
      for (const v of vitalsData) {
        const vitalMeta = VITAL_TYPES.find((t) => t.value === v.vital_type);
        insertVital.run(
          req.user.id,
          reportId,
          v.vital_type,
          v.value,
          v.unit || vitalMeta?.unit || '',
          v.recorded_at || `${data.report_date}T12:00:00.000Z`
        );
      }
      return reportId;
    });

    const reportId = transaction();
    const report = getReportById(reportId);
    res.status(201).json({ report });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: err.message || 'Failed to upload report' });
  }
}

function getReportById(id) {
  const report = db.prepare(`
    SELECT r.*, u.name as owner_name, u.email as owner_email
    FROM reports r
    JOIN users u ON u.id = r.user_id
    WHERE r.id = ?
  `).get(id);

  if (!report) return null;

  const vitals = db.prepare(`
    SELECT * FROM vitals WHERE report_id = ? ORDER BY recorded_at
  `).all(id);

  return { ...report, vitals };
}

export function listReports(req, res) {
  const { dateFrom, dateTo, reportType, vitalType, search } = req.query;
  const userId = req.user.id;

  let sql = `
    SELECT DISTINCT r.*, u.name as owner_name
    FROM reports r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN vitals v ON v.report_id = r.id
    WHERE (r.user_id = ? OR r.id IN (SELECT report_id FROM shares WHERE viewer_id = ?))
  `;
  const params = [userId, userId];

  if (dateFrom) {
    sql += ' AND r.report_date >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += ' AND r.report_date <= ?';
    params.push(dateTo);
  }
  if (reportType) {
    sql += ' AND r.report_type = ?';
    params.push(reportType);
  }
  if (vitalType) {
    sql += ' AND v.vital_type = ?';
    params.push(vitalType);
  }
  if (search) {
    sql += ' AND (r.title LIKE ? OR r.notes LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY r.report_date DESC, r.created_at DESC';

  const reports = db.prepare(sql).all(...params);
  res.json({ reports });
}

export function getReport(req, res) {
  const reportId = Number(req.params.id);
  const access = canAccessReport(req.user.id, reportId);

  if (!access.allowed) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const report = getReportById(reportId);
  res.json({ report, access: access.access });
}

export function updateReport(req, res) {
  try {
    const reportId = Number(req.params.id);
    const report = db.prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?').get(reportId, req.user.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const data = reportSchema.partial().parse(req.body);
    const fields = [];
    const values = [];

    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        fields.push(`${key} = ?`);
        values.push(val);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(reportId);
    db.prepare(`UPDATE reports SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    res.json({ report: getReportById(reportId) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Update failed' });
  }
}

export function deleteReport(req, res) {
  const reportId = Number(req.params.id);
  const report = db.prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?').get(reportId, req.user.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const filePath = path.join(uploadsRoot, report.file_path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM reports WHERE id = ?').run(reportId);
  res.json({ message: 'Report deleted' });
}

export function downloadReport(req, res) {
  const reportId = Number(req.params.id);
  const access = canAccessReport(req.user.id, reportId);

  if (!access.allowed) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
  const filePath = path.join(uploadsRoot, report.file_path);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on server' });
  }

  res.download(filePath, report.file_name);
}
