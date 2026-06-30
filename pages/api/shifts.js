/**
 * ═══════════════════════════════════════════════════════════════
 * Shifts Configuration API (Enterprise Attendance)
 * ═══════════════════════════════════════════════════════════════
 * CRUD for shift definitions used by the Attendance Engine.
 * Each employee can be assigned a shift_id to determine
 * their scheduled start/end time, grace period, and break time.
 * ═══════════════════════════════════════════════════════════════
 */

const { getAll, getOne, runQuery } = require('../../utils/db');

function mapShift(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    name_ar: row.name_ar,
    startTime: row.start_time,
    endTime: row.end_time,
    graceMinutes: row.grace_minutes,
    breakMinutes: row.break_minutes,
    workingDays: row.working_days,
    isDefault: !!row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET': {
        // GET /api/shifts — list all shifts
        // GET /api/shifts?id=1 — get single shift
        // GET /api/shifts?default=1 — get default shift
        let result;

        if (req.query.id) {
          result = await getOne('SELECT * FROM shifts WHERE id = ?', [req.query.id]);
          if (result.data) {
            res.status(200).json({ success: true, data: mapShift(result.data) });
          } else {
            res.status(404).json({ success: false, error: 'Shift not found' });
          }
          return;
        }

        if (req.query.default) {
          result = await getOne('SELECT * FROM shifts WHERE is_default = 1 LIMIT 1');
          if (result.data) {
            res.status(200).json({ success: true, data: mapShift(result.data) });
          } else {
            // Fallback to first shift
            result = await getAll('SELECT * FROM shifts ORDER BY id ASC LIMIT 1');
            if (result.data && result.data.length > 0) {
              res.status(200).json({ success: true, data: mapShift(result.data[0]) });
            } else {
              // Return a hardcoded default
              res.status(200).json({
                success: true,
                data: { id: null, name: 'Morning', startTime: '08:00', endTime: '17:00', graceMinutes: 15, breakMinutes: 60, workingDays: 5 },
              });
            }
          }
          return;
        }

        result = await getAll('SELECT * FROM shifts ORDER BY is_default DESC, name ASC');
        res.status(200).json({ success: true, data: (result.data || []).map(mapShift) });
        break;
      }

      case 'POST': {
        // POST /api/shifts — create new shift
        const { name, name_ar, startTime, endTime, graceMinutes, breakMinutes, workingDays, isDefault } = req.body;

        if (!name || !startTime || !endTime) {
          res.status(400).json({ success: false, error: 'Name, startTime, and endTime are required' });
          return;
        }

        // If setting as default, unset all other defaults first
        if (isDefault) {
          await runQuery('UPDATE shifts SET is_default = 0');
        }

        const result = await runQuery(`
          INSERT INTO shifts (name, name_ar, start_time, end_time, grace_minutes, break_minutes, working_days, is_default)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          name, name_ar || null,
          startTime, endTime,
          graceMinutes || 15, breakMinutes || 60,
          workingDays || 5, isDefault ? 1 : 0
        ]);

        if (result.success) {
          res.status(201).json({ success: true, data: { id: result.data.lastInsertRowid }, message: 'Shift created' });
        } else {
          res.status(500).json({ success: false, error: result.error });
        }
        break;
      }

      case 'PUT': {
        // PUT /api/shifts?id=1 — update existing shift
        const { name, name_ar, startTime, endTime, graceMinutes, breakMinutes, workingDays, isDefault } = req.body;
        const id = req.query.id || req.body.id;

        if (!id) {
          res.status(400).json({ success: false, error: 'Shift ID is required' });
          return;
        }

        // Check shift exists
        const existing = await getOne('SELECT id FROM shifts WHERE id = ?', [id]);
        if (!existing.data) {
          res.status(404).json({ success: false, error: 'Shift not found' });
          return;
        }

        // If setting as default, unset all other defaults first
        if (isDefault) {
          await runQuery('UPDATE shifts SET is_default = 0');
        }

        const result = await runQuery(`
          UPDATE shifts SET
            name = COALESCE(?, name),
            name_ar = COALESCE(?, name_ar),
            start_time = COALESCE(?, start_time),
            end_time = COALESCE(?, end_time),
            grace_minutes = COALESCE(?, grace_minutes),
            break_minutes = COALESCE(?, break_minutes),
            working_days = COALESCE(?, working_days),
            is_default = COALESCE(?, is_default),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          name || null, name_ar || null,
          startTime || null, endTime || null,
          graceMinutes || null, breakMinutes || null,
          workingDays || null, isDefault !== undefined ? (isDefault ? 1 : 0) : null,
          id
        ]);

        if (result.success) {
          res.status(200).json({ success: true, message: 'Shift updated' });
        } else {
          res.status(500).json({ success: false, error: result.error });
        }
        break;
      }

      case 'DELETE': {
        // DELETE /api/shifts?id=1 — delete a shift
        const id = req.query.id;

        if (!id) {
          res.status(400).json({ success: false, error: 'Shift ID is required' });
          return;
        }

        // Check if employees are using this shift
        const empCheck = await getOne('SELECT COUNT(*) as count FROM employees WHERE shift_id = ?', [id]);
        const assignedCount = empCheck.data ? empCheck.data.count : 0;

        if (assignedCount > 0) {
          res.status(400).json({
            success: false,
            error: `Cannot delete shift: ${assignedCount} employee(s) are assigned to it. Reassign them first.`,
            assignedEmployees: assignedCount,
          });
          return;
        }

        const result = await runQuery('DELETE FROM shifts WHERE id = ?', [id]);

        if (result.success && result.data.changes > 0) {
          res.status(200).json({ success: true, message: 'Shift deleted' });
        } else {
          res.status(404).json({ success: false, error: 'Shift not found' });
        }
        break;
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Shifts API error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
