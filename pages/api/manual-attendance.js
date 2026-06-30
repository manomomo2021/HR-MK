/**
 * ═══════════════════════════════════════════════════════════════
 * Manual Attendance API (Enterprise-Integrated)
 * ═══════════════════════════════════════════════════════════════
 *
 * GET  /api/manual-attendance → Returns daily attendance summaries
 * POST /api/manual-attendance → Creates attendance event + manual record
 *
 * Accepts both legacy format (camelCase) and enterprise format (snake_case):
 *   { employeeId, type, date, time, notes }  ← legacy UI
 *   { employee_id, check_in, check_out, date, notes }  ← enterprise UI
 * ═══════════════════════════════════════════════════════════════
 */

const { getAll, runQuery, tables } = require('../../utils/db');
const { logAttendanceEvent, EVENT_TYPES, EVENT_SOURCES } = require('../../utils/attendanceEngine');

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
    // ── GET: Return daily attendance summaries ──
    if (req.method === 'GET') {
      const result = await getAll(`
        SELECT s.*, e.first_name, e.last_name, e.employee_id as emp_code,
               d.name as department
        FROM daily_attendance_summary s
        LEFT JOIN ${tables.employees} e ON s.employee_id = e.id
        LEFT JOIN ${tables.departments} d ON e.department_id = d.id
        ORDER BY s.date DESC, COALESCE(s.first_check_in, '24:00') DESC
        LIMIT 500
      `);

      const records = (result.data || []).map(r => ({
        id: r.id,
        employee_id: r.employee_id,
        employeeId: r.employee_id,
        emp_code: r.emp_code,
        first_name: r.first_name,
        last_name: r.last_name,
        name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        date: r.date,
        first_check_in: r.first_check_in,
        last_check_out: r.last_check_out,
        status: r.status,
        working_minutes: r.working_minutes,
        net_working_minutes: r.net_working_minutes,
        late_minutes: r.late_minutes,
        overtime_minutes: r.overtime_minutes,
        break_minutes: r.break_minutes,
        department: r.department,
        // Legacy compat fields
        checkIn: r.first_check_in,
        checkOut: r.last_check_out,
        inTime: r.first_check_in,
        outTime: r.last_check_out,
      }));

      res.status(200).json({
        success: true,
        data: formatDates(records),
        records: formatDates(records),
        total: records.length,
        message: `Retrieved ${records.length} attendance records`,
      });
      return;
    }

    // ── POST validation ──
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
      return;
    }

    // Normalize incoming fields
    const body = req.body;
    const date          = body.date;
    const notes         = body.notes || '';

    // Handle check_in / check_out (enterprise) OR type + time (legacy)
    const check_in  = body.check_in  || (body.type === 'check-in'  ? body.time : null);
    const check_out = body.check_out || (body.type === 'check-out' ? body.time : null);
    const time      = check_in || check_out;

    let rawEmployees = body.employee_ids || body.employeeId || body.employee_id;
    if (!rawEmployees) {
      res.status(400).json({ success: false, error: 'Employee ID(s) and date are required' });
      return;
    }

    let employeeIds = [];
    if (Array.isArray(rawEmployees)) {
      employeeIds = rawEmployees.map(String);
    } else if (typeof rawEmployees === 'string') {
      employeeIds = rawEmployees.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      employeeIds = [String(rawEmployees)];
    }

    if (employeeIds.length === 0 || !date) {
      res.status(400).json({ success: false, error: 'Employee ID(s) and date are required' });
      return;
    }

    if (!time) {
      res.status(400).json({ success: false, error: 'Time is required (check_in or check_out)' });
      return;
    }

    const eventType = check_out ? EVENT_TYPES.CHECK_OUT : EVENT_TYPES.CHECK_IN;
    const results = [];

    for (const empId of employeeIds) {
      // ── Create the attendance event via the engine ──
      const eventResult = await logAttendanceEvent({
        employee_id: empId,
        event_type: eventType,
        source: EVENT_SOURCES.MANUAL_ADJUSTMENT,
        date,
        time,
        notes: notes || 'تعديل يدوي',
      });

      if (!eventResult.success) {
        results.push({ employee_id: empId, success: false, error: eventResult.error });
        continue;
      }

      // ── Also save to manual_attendance table (legacy compat) ──
      await runQuery(`
        INSERT INTO ${tables.manual_attendance} (employee_id, date, check_in, check_out, notes)
        VALUES (?, ?, ?, ?, ?)
      `, [empId, date, check_in || null, check_out || null, notes || 'تعديل يدوي']);

      results.push({
        employee_id: empId,
        success: true,
        isDuplicate: eventResult.isDuplicate,
        event_id: eventResult.event_id,
        message: eventResult.isDuplicate 
          ? 'تكرار بصمة خلال 10 دقائق (تم التجاهل وتسجيل خطأ)'
          : 'تم تسجيل الحركة بنجاح'
      });
    }

    const hasAnySuccess = results.some(r => r.success && !r.isDuplicate);
    const hasAnyDuplicate = results.some(r => r.isDuplicate);

    res.status(200).json({
      success: true,
      message: `Processed ${employeeIds.length} employee logs`,
      results,
      hasAnySuccess,
      hasAnyDuplicate
    });

  } catch (error) {
    console.error('[ManualAttendance API] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
