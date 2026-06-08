import { z } from 'zod';
import db from '../config/database.js';
import { VITAL_TYPES, getVitalUnit } from '../constants.js';

const vitalSchema = z.object({
  vital_type: z.string(),
  value: z.coerce.number(),
  unit: z.string().optional(),
  recorded_at: z.string(),
  notes: z.string().max(500).optional(),
  report_id: z.coerce.number().optional(),
});

export function createVital(req, res) {
  try {
    const data = vitalSchema.parse(req.body);

    if (data.report_id) {
      const report = db
        .prepare('SELECT id FROM reports WHERE id = ? AND user_id = ?')
        .get(data.report_id, req.user.id);
      if (!report) {
        return res.status(404).json({ error: 'Linked report not found' });
      }
    }

    const unit = data.unit || getVitalUnit(data.vital_type);
    const result = db
      .prepare(
        `INSERT INTO vitals (user_id, report_id, vital_type, value, unit, recorded_at, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.user.id,
        data.report_id || null,
        data.vital_type,
        data.value,
        unit,
        data.recorded_at,
        data.notes || null
      );

    const vital = db.prepare('SELECT * FROM vitals WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ vital });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to create vital' });
  }
}

export function listVitals(req, res) {
  const { vitalType, dateFrom, dateTo } = req.query;
  let sql = 'SELECT * FROM vitals WHERE user_id = ?';
  const params = [req.user.id];

  if (vitalType) {
    sql += ' AND vital_type = ?';
    params.push(vitalType);
  }
  if (dateFrom) {
    sql += ' AND date(recorded_at) >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += ' AND date(recorded_at) <= ?';
    params.push(dateTo);
  }

  sql += ' ORDER BY recorded_at ASC';

  const vitals = db.prepare(sql).all(...params);
  res.json({ vitals });
}

export function getVitalTrends(req, res) {
  const { vitalType, dateFrom, dateTo } = req.query;

  if (!vitalType) {
    return res.status(400).json({ error: 'vitalType query parameter is required' });
  }

  let sql = `
    SELECT id, value, unit, recorded_at
    FROM vitals
    WHERE user_id = ? AND vital_type = ?
  `;
  const params = [req.user.id, vitalType];

  if (dateFrom) {
    sql += ' AND date(recorded_at) >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += ' AND date(recorded_at) <= ?';
    params.push(dateTo);
  }

  sql += ' ORDER BY recorded_at ASC';

  const data = db.prepare(sql).all(...params);
  const meta = VITAL_TYPES.find((v) => v.value === vitalType);

  res.json({
    vitalType,
    label: meta?.label || vitalType,
    unit: meta?.unit || data[0]?.unit || '',
    data,
  });
}

export function deleteVital(req, res) {
  const vitalId = Number(req.params.id);
  const result = db
    .prepare('DELETE FROM vitals WHERE id = ? AND user_id = ?')
    .run(vitalId, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Vital not found' });
  }

  res.json({ message: 'Vital deleted' });
}

export function getVitalSummary(req, res) {
  const summary = db.prepare(`
    SELECT vital_type, COUNT(*) as count, MAX(recorded_at) as latest_reading,
           (SELECT value FROM vitals v2 WHERE v2.user_id = vitals.user_id AND v2.vital_type = vitals.vital_type ORDER BY recorded_at DESC LIMIT 1) as latest_value,
           (SELECT unit FROM vitals v2 WHERE v2.user_id = vitals.user_id AND v2.vital_type = vitals.vital_type ORDER BY recorded_at DESC LIMIT 1) as unit
    FROM vitals
    WHERE user_id = ?
    GROUP BY vital_type
  `).all(req.user.id);

  res.json({ summary });
}
