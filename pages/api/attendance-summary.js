/**
 * ═══════════════════════════════════════════════════════════════
 * ENTERPRISE ATTENDANCE SUMMARY API
 * ═══════════════════════════════════════════════════════════════
 *
 * Endpoints:
 *   GET /api/attendance-summary?employee=X&date=Y       → Single employee daily summary
 *   GET /api/attendance-summary?date=Y                   → All employees daily summary (dashboard)
 *   GET /api/attendance-summary?employee=X&month=Y&year=Z  → Monthly summary
 *   POST /api/attendance-summary?recalculate=1&date=Y    → Recalculate all summaries for date
 *   POST /api/attendance-summary?run-absence=1           → Run absence engine
 *   GET /api/attendance-summary?stats=1&date=Y           → Dashboard statistics
 * ═══════════════════════════════════════════════════════════════
 */

const { getAll, getOne, runQuery, tables } = require('../../utils/db');
const {
  calculateMonthlySummary,
  getDashboardStats,
  recalculateAllDailySummaries,
  runAbsenceEngine,
  getEmployeeMonthlyStats,
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
    // ── POST: Recalculate or Run Absence Engine ──
    if (req.method === 'POST') {
      // Recalculate all summaries for a date
      if (req.query.recalculate === '1') {
        const { date } = req.body;
        const targetDate = date || new Date().toISOString().split('T')[0];
        const result = await recalculateAllDailySummaries(targetDate);
        res.status(200).json(result);
        return;
      }

      // Run absence engine
      if (req.query['run-absence'] === '1') {
        const result = await runAbsenceEngine();
        res.status(200).json(result);
        return;
      }

      res.status(400).json({ success: false, error: 'Invalid action. Use ?recalculate=1 or ?run-absence=1' });
      return;
    }

    // ── GET: Read summaries ──
    if (req.method === 'GET') {
      const { employee, date, startDate, endDate, month, year, stats } = req.query;

      // Dashboard stats
      if (stats === '1') {
        const dashboardData = await getDashboardStats(date);
        res.status(200).json({ success: true, data: formatDates(dashboardData) });
        return;
      }

      // Monthly summary for an employee
      if (employee && month && year) {
        const result = await getEmployeeMonthlyStats(employee, parseInt(year), parseInt(month));
        res.status(200).json({ success: true, data: formatDates(result) });
        return;
      }

      // Daily summaries for all employees on a date
      if (date) {
        const result = await getAll(`
          SELECT s.*, e.first_name, e.last_name, e.employee_id as emp_code,
                 d.name as department, e.salary
          FROM daily_attendance_summary s
          LEFT JOIN ${tables.employees} e ON s.employee_id = e.id
          LEFT JOIN ${tables.departments} d ON e.department_id = d.id
          WHERE s.date = ?
          ORDER BY s.first_check_in ASC NULLS LAST
        `, [date]);

        // Calculate aggregates
        const summaries = result.data || [];
        const present = summaries.filter(s => 
          ['Present', 'Late', 'Missing Check In', 'Missing Check Out'].includes(s.status)
        ).length;
        const absent = summaries.filter(s => s.status === 'Absent').length;
        const late = summaries.filter(s => s.status === 'Late').length;
        const onLeave = summaries.filter(s => s.status === 'On Leave').length;

        res.status(200).json({
          success: true,
          data: formatDates(summaries),
          meta: {
            total: summaries.length,
            present,
            absent,
            late,
            onLeave,
            date,
          }
        });
        return;
      }

      // Single employee daily summary
      if (employee && date) {
        const result = await getOne(`
          SELECT s.*, e.first_name, e.last_name, e.employee_id as emp_code
          FROM daily_attendance_summary s
          LEFT JOIN ${tables.employees} e ON s.employee_id = e.id
          WHERE s.employee_id = ? AND s.date = ?
        `, [employee, date]);

        res.status(200).json({ success: true, data: formatDates(result.data) || null });
        return;
      }

      // Range query: all summaries between dates
      if (startDate && endDate) {
        let query = `
          SELECT s.*, e.first_name, e.last_name, e.employee_id as emp_code,
                 d.name as department
          FROM daily_attendance_summary s
          LEFT JOIN ${tables.employees} e ON s.employee_id = e.id
          LEFT JOIN ${tables.departments} d ON e.department_id = d.id
          WHERE s.date >= ? AND s.date <= ?
          ORDER BY s.date DESC, s.employee_id
        `;
        const params = [startDate, endDate];

        if (employee) {
          query = query.replace('WHERE', 'WHERE s.employee_id = ? AND');
          params.unshift(employee);
        }

        const result = await getAll(query, params);
        res.status(200).json({ success: true, data: formatDates(result.data) || [] });
        return;
      }

      // Default: return today's summaries
      const today = new Date().toISOString().split('T')[0];
      const result = await getAll(`
        SELECT s.*, e.first_name, e.last_name, e.employee_id as emp_code,
               d.name as department
        FROM daily_attendance_summary s
        LEFT JOIN ${tables.employees} e ON s.employee_id = e.id
        LEFT JOIN ${tables.departments} d ON e.department_id = d.id
        WHERE s.date = ?
        ORDER BY s.first_check_in ASC NULLS LAST
      `, [today]);

      res.status(200).json({ success: true, data: formatDates(result.data) || [] });
      return;
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error) {
    console.error('[AttendanceSummary API] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
