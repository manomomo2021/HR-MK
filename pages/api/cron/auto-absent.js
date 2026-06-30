import { getAll, runQuery, tables } from '../../../utils/db';
import { logAttendanceEvent, EVENT_TYPES, EVENT_SOURCES } from '../../../utils/attendanceEngine';

export default async function handler(req, res) {
  try {
    // Only allow POST or GET (GET for cron services usually)
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    // Safety check: is it past 12:00 PM? (Optional: allow bypass via query param)
    if (now.getHours() < 12 && req.query.force !== 'true') {
      return res.status(200).json({ 
        success: true, 
        message: 'Too early. Auto-absent runs after 12:00 PM.',
        time: now.toLocaleTimeString()
      });
    }

    // 1. Get all active employees
    const employeesResult = await getAll(`
      SELECT id FROM ${tables.employees} 
      WHERE status = 'Active' OR status = 'نشط'
    `);
    const employees = employeesResult.data || [];

    if (employees.length === 0) {
      return res.status(200).json({ success: true, message: 'No active employees found.' });
    }

    let absentsLogged = 0;
    const missing = [];

    // 2. Loop through employees to check attendance events for today
    for (const emp of employees) {
      // Check if employee has ANY events today
      const eventsResult = await getAll(`
        SELECT event_type FROM attendance_events
        WHERE employee_id = ? AND date = ? AND status = 'active'
      `, [emp.id, today]);

      const events = eventsResult.data || [];

      // If no check_in and no approved leaves/holidays, log auto-absent
      const hasCheckIn = events.some(e => e.event_type === EVENT_TYPES.CHECK_IN || e.event_type === EVENT_TYPES.BIOMETRIC);
      const hasLeaveOrHoliday = events.some(e => 
        e.event_type === EVENT_TYPES.LEAVE_APPROVED || 
        e.event_type === EVENT_TYPES.HOLIDAY ||
        e.event_type === EVENT_TYPES.WEEKEND
      );
      const alreadyAbsent = events.some(e => e.event_type === EVENT_TYPES.ABSENT_AUTO);

      if (!hasCheckIn && !hasLeaveOrHoliday && !alreadyAbsent) {
        // Log absent event
        await logAttendanceEvent({
          employee_id: emp.id,
          event_type: EVENT_TYPES.ABSENT_AUTO,
          source: EVENT_SOURCES.SYSTEM,
          date: today,
          time: '12:00', // Logged at noon
          notes: 'غياب تلقائي لعدم تسجيل الدخول (Auto Absent)',
        });
        absentsLogged++;
        missing.push(emp.id);
      }
    }

    res.status(200).json({
      success: true,
      message: `Auto-absent process completed. Logged ${absentsLogged} absentees.`,
      absentees: missing,
      date: today
    });

  } catch (error) {
    console.error('[Auto Absent Cron] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
