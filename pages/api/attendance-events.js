/**
 * ═══════════════════════════════════════════════════════════════
 * ENTERPRISE ATTENDANCE EVENTS API
 * ═══════════════════════════════════════════════════════════════
 * 
 * The ONLY way to create attendance data is through events.
 * Events are immutable records of employee movements.
 * 
 * Endpoints:
 *   GET    /api/attendance-events        → List events (with filters)
 *   GET    /api/attendance-events?employee=X&date=Y  → Filtered events
 *   GET    /api/attendance-events?timeline=1&employee=X&date=Y → Timeline
 *   POST   /api/attendance-events        → Create new attendance event
 *   DELETE /api/attendance-events        → Soft-delete event (with reason)
 * ═══════════════════════════════════════════════════════════════
 */

const { getAll, getOne, runQuery, tables } = require('../../utils/db');
const { 
  logAttendanceEvent, 
  getAttendanceTimeline, 
  getAttendanceHistory,
  EVENT_TYPES,
  EVENT_SOURCES,
  logAuditTrail,
  recalculateDailySummary
} = require('../../utils/attendanceEngine');

const formatDates = (obj) => {
  if (!obj) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => formatDates(item));
  }
  if (typeof obj === 'object') {
    const formatted = { ...obj };
    for (const key in formatted) {
      if (formatted[key] instanceof Date) {
        const d = formatted[key];
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        formatted[key] = `${year}-${month}-${day}`;
      } else if (typeof formatted[key] === 'object' && formatted[key] !== null) {
        formatted[key] = formatDates(formatted[key]);
      }
    }
    return formatted;
  }
  return obj;
};

export default async function handler(req, res) {
  try {
    // ── GET: List events with optional filters ──
    if (req.method === 'GET') {
      const { employee, date, startDate, endDate, type, source, limit, timeline } = req.query;

      // If timeline mode, return grouped timeline data
      if (timeline === '1' && employee && date) {
        const result = await getAttendanceTimeline(employee, date, date);
        res.status(200).json({ success: true, data: formatDates(result.data) || [] });
        return;
      }

      let query = `
        SELECT ae.*, 
               e.first_name, e.last_name, e.employee_id as emp_code,
               d.name as department
        FROM attendance_events ae
        LEFT JOIN ${tables.employees} e ON ae.employee_id = e.id
        LEFT JOIN ${tables.departments} d ON e.department_id = d.id
        WHERE ae.status = 'active'
      `;
      const params = [];

      if (employee) {
        query += ` AND ae.employee_id = ?`;
        params.push(employee);
      }
      if (date) {
        query += ` AND ae.date = ?`;
        params.push(date);
      }
      if (startDate) {
        query += ` AND ae.date >= ?`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND ae.date <= ?`;
        params.push(endDate);
      }
      if (type) {
        query += ` AND ae.event_type = ?`;
        params.push(type);
      }
      if (source) {
        query += ` AND ae.source = ?`;
        params.push(source);
      }

      query += ` ORDER BY ae.date DESC, ae.time DESC`;

      if (limit) {
        query += ` LIMIT ?`;
        params.push(parseInt(limit) || 100);
      }

      const result = await getAll(query, params);
      res.status(200).json({ success: true, data: formatDates(result.data) || [] });
      return;
    }

    // ── POST: Create a new attendance event ──
    if (req.method === 'POST') {
      const { 
        employee_id, 
        event_type, 
        source, 
        date, 
        time,
        device_name,
        ip_address,
        mac_address,
        latitude,
        longitude,
        notes,
        reason,
        created_by
      } = req.body;

      // Validation
      if (!employee_id || !event_type || !date || !time) {
        res.status(400).json({ 
          success: false, 
          error: 'Required fields: employee_id, event_type, date, time' 
        });
        return;
      }

      // Validate event type
      const validTypes = Object.values(EVENT_TYPES);
      if (!validTypes.includes(event_type)) {
        res.status(400).json({ 
          success: false, 
          error: `Invalid event_type. Must be one of: ${validTypes.join(', ')}` 
        });
        return;
      }

      const result = await logAttendanceEvent({
        employee_id,
        event_type,
        source: source || 'MANUAL',
        date,
        time,
        device_name: device_name || null,
        ip_address: ip_address || null,
        mac_address: mac_address || null,
        latitude: latitude || null,
        longitude: longitude || null,
        notes: notes || null,
        reason: reason || null,
        created_by: created_by || null,
      });

      if (result.success) {
        // Log audit trail
        await logAuditTrail({
          table_name: 'attendance_events',
          record_id: result.event_id,
          action: 'CREATE',
          new_value: { employee_id, event_type, date, time, source },
          changed_by: created_by,
          reason: 'Manual attendance event creation',
        });

        res.status(201).json({ 
          success: true, 
          message: 'Attendance event recorded successfully',
          event_id: result.event_id 
        });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
      return;
    }

    // ── DELETE: Soft-delete an event ──
    if (req.method === 'DELETE') {
      const { id, reason, changed_by } = req.body;

      if (!id) {
        res.status(400).json({ success: false, error: 'Event ID is required' });
        return;
      }

      // Get the event first for audit
      const event = await getOne(`SELECT * FROM attendance_events WHERE id = ?`, [id]);
      if (!event.success || !event.data) {
        res.status(404).json({ success: false, error: 'Event not found' });
        return;
      }

      // Soft delete
      const result = await runQuery(`
        UPDATE attendance_events SET status = 'deleted' WHERE id = ?
      `, [id]);

      if (result.success) {
        // Log audit trail
        await logAuditTrail({
          table_name: 'attendance_events',
          record_id: id,
          action: 'DELETE',
          old_value: event.data,
          changed_by: changed_by || null,
          reason: reason || 'Event deleted',
        });

        // Recalculate daily summary for the affected employee and date
        await recalculateDailySummary(event.data.employee_id, event.data.date);

        res.status(200).json({ success: true, message: 'Event deleted successfully' });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
      return;
    }

    // ── Method not allowed ──
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error) {
    console.error('[AttendanceEvents API] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
