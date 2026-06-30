/**
 * ═══════════════════════════════════════════════════════════════
 * ENTERPRISE ATTENDANCE ENGINE (Event-Driven)
 * ═══════════════════════════════════════════════════════════════
 *
 * Core architecture:
 *   Every attendance movement saves ONE record → attendance_events
 *   Everything else (daily summary, absence, late, overtime) is
 *   CALCULATED automatically from events.
 *
 * Inspired by: SAP SuccessFactors, Oracle HCM, Workday, Dynamics 365
 *
 * ═══════════════════════════════════════════════════════════════
 */

const { getAll, getOne, runQuery, tables } = require('./db');

// ──────────────────────────────────────────────────────────────
// 1. EVENT TYPE CONSTANTS
// ──────────────────────────────────────────────────────────────
const EVENT_TYPES = {
  CHECK_IN: 'CHECK_IN',
  CHECK_OUT: 'CHECK_OUT',
  BREAK_START: 'BREAK_START',
  BREAK_END: 'BREAK_END',
  MISSION_START: 'MISSION_START',
  MISSION_END: 'MISSION_END',
  REMOTE_START: 'REMOTE_START',
  REMOTE_END: 'REMOTE_END',
  OVERTIME_START: 'OVERTIME_START',
  OVERTIME_END: 'OVERTIME_END',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',
  ABSENT_AUTO: 'ABSENT_AUTO',
  LEAVE_APPROVED: 'LEAVE_APPROVED',
  HOLIDAY: 'HOLIDAY',
  WEEKEND: 'WEEKEND',
  DEVICE_SYNC: 'DEVICE_SYNC',
  BIOMETRIC: 'BIOMETRIC',
  FACE_SCAN: 'FACE_SCAN',
  RFID: 'RFID',
  GPS_CHECKIN: 'GPS_CHECKIN',
  GPS_CHECKOUT: 'GPS_CHECKOUT',
};

const EVENT_SOURCES = {
  BIOMETRIC: 'BIOMETRIC',
  MANUAL: 'MANUAL',
  SYSTEM: 'SYSTEM',
  GPS: 'GPS',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',
  DEVICE: 'DEVICE',
  FACE_SCAN: 'FACE_SCAN',
  RFID: 'RFID',
};

// Status values for daily summary
const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  ON_LEAVE: 'On Leave',
  HOLIDAY: 'Holiday',
  WEEKEND: 'Weekend',
  MISSING_CHECK_IN: 'Missing Check In',
  MISSING_CHECK_OUT: 'Missing Check Out',
  REMOTE: 'Remote',
  MISSION: 'Mission',
};

// ──────────────────────────────────────────────────────────────
// 2. LOG AN ATTENDANCE EVENT (the ONLY way to create data)
// ──────────────────────────────────────────────────────────────
async function logAttendanceEvent({
  employee_id,
  event_type,
  source = 'MANUAL',
  date,
  time,
  device_name = null,
  ip_address = null,
  mac_address = null,
  latitude = null,
  longitude = null,
  notes = null,
  reason = null,
  status = 'active',
  created_by = null,
}) {
  // Generate unique event ID
  const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  let finalStatus = status;
  let finalNotes = notes;

  if (status === 'active') {
    const existingEvents = await getAll(`
      SELECT time, event_type, status FROM attendance_events 
      WHERE employee_id = ? AND date = ? AND status = 'active'
    `, [employee_id, date]);

    if (existingEvents.data && existingEvents.data.length > 0) {
      const toMinutes = (tStr) => {
        if (!tStr) return 0;
        const parts = tStr.split(':').map(Number);
        return parts[0] * 60 + (parts[1] || 0);
      };
      
      const newMins = toMinutes(time);
      const hasDuplicate = existingEvents.data.some(evt => {
        const diff = Math.abs(toMinutes(evt.time) - newMins);
        return diff < 10;
      });

      if (hasDuplicate) {
        finalStatus = 'error';
        finalNotes = (notes ? notes + ' | ' : '') + 'بصمة مكررة خلال 10 دقائق (تجاهل)';
      }
    }
  }

  const result = await runQuery(`
    INSERT INTO attendance_events 
    (event_id, employee_id, event_type, source, date, time, 
     device_name, ip_address, mac_address, latitude, longitude,
     notes, reason, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    eventId, employee_id, event_type, source, date, time,
    device_name, ip_address, mac_address, latitude, longitude,
    finalNotes, reason, finalStatus, created_by
  ]);

  if (result.success) {
    // After logging event, trigger daily summary recalculation
    await recalculateDailySummary(employee_id, date);
    return { success: true, event_id: eventId, isDuplicate: finalStatus === 'error' };
  }

  return { success: false, error: result.error };
}

// ──────────────────────────────────────────────────────────────
// 2B. GET EMPLOYEE SHIFT (per-employee shift configuration)
// ──────────────────────────────────────────────────────────────
async function getEmployeeShift(employeeId) {
  // Try to get employee's assigned shift
  const empRes = await getOne(`
    SELECT e.shift_id FROM ${tables.employees} e WHERE e.id = ?
  `, [employeeId]);

  if (empRes.data && empRes.data.shift_id) {
    const shiftRes = await getOne(`
      SELECT * FROM shifts WHERE id = ?
    `, [empRes.data.shift_id]);
    if (shiftRes.data) {
      return shiftRes.data;
    }
  }

  // Fallback: get default shift
  const defaultRes = await getOne(`
    SELECT * FROM shifts WHERE is_default = true LIMIT 1
  `);
  if (defaultRes.data) {
    return defaultRes.data;
  }

  // Fallback: get first shift
  const firstRes = await getOne(`
    SELECT * FROM shifts ORDER BY id ASC LIMIT 1
  `);
  if (firstRes.data) {
    return firstRes.data;
  }

  // Hardcoded fallback
  return {
    start_time: '08:00',
    end_time: '17:00',
    grace_minutes: 15,
    break_minutes: 60,
    name: 'Morning',
  };
}

// ──────────────────────────────────────────────────────────────
// 3. RECALCULATE DAILY SUMMARY FROM EVENTS
// ──────────────────────────────────────────────────────────────
async function recalculateDailySummary(employeeId, date) {
  try {
    // Load employee's shift configuration
    const shift = await getEmployeeShift(employeeId);
    const scheduledStart = parseTime(shift.start_time || '08:00');
    const scheduledEnd = parseTime(shift.end_time || '17:00');
    const graceMinutes = shift.grace_minutes || 15;
    const shiftName = shift.name || 'Default';

    // Fetch all active events for this employee on this date
    const eventsRes = await getAll(`
      SELECT * FROM attendance_events 
      WHERE employee_id = ? AND date = ? AND status = 'active'
      ORDER BY time ASC
    `, [employeeId, date]);

    const events = eventsRes.data || [];

    // If no events, mark as absent if not a holiday/weekend/leave
    if (events.length === 0) {
      await saveEmptyDaySummary(employeeId, date);
      return;
    }

    // Extract key events
    const checkInEvent = events.find(e => 
      e.event_type === EVENT_TYPES.CHECK_IN || 
      e.event_type === EVENT_TYPES.GPS_CHECKIN
    );
    const checkOutEvent = events.find(e => 
      e.event_type === EVENT_TYPES.CHECK_OUT || 
      e.event_type === EVENT_TYPES.GPS_CHECKOUT
    );
    const breakEvents = events.filter(e => 
      e.event_type === EVENT_TYPES.BREAK_START || 
      e.event_type === EVENT_TYPES.BREAK_END
    );
    const absentEvent = events.find(e => e.event_type === EVENT_TYPES.ABSENT_AUTO);
    const leaveEvent = events.find(e => e.event_type === EVENT_TYPES.LEAVE_APPROVED);
    const holidayEvent = events.find(e => e.event_type === EVENT_TYPES.HOLIDAY);
    const weekendEvent = events.find(e => e.event_type === EVENT_TYPES.WEEKEND);
    const missionEvent = events.find(e => 
      e.event_type === EVENT_TYPES.MISSION_START || 
      e.event_type === EVENT_TYPES.MISSION_END
    );
    const remoteEvent = events.find(e => 
      e.event_type === EVENT_TYPES.REMOTE_START || 
      e.event_type === EVENT_TYPES.REMOTE_END
    );

    // Calculate working minutes
    let workingMinutes = 0;
    if (checkInEvent && checkOutEvent) {
      const inTime = parseTime(checkInEvent.time);
      const outTime = parseTime(checkOutEvent.time);
      workingMinutes = outTime - inTime;
    }

    // Calculate break minutes from events
    let breakMinutes = 0;
    for (let i = 0; i < breakEvents.length - 1; i += 2) {
      const start = parseTime(breakEvents[i].time);
      const end = parseTime(breakEvents[i + 1].time);
      if (!isNaN(start) && !isNaN(end)) {
        breakMinutes += end - start;
      }
    }

    const netWorkingMinutes = Math.max(0, workingMinutes - breakMinutes);

    // Late detection — using employee's shift schedule
    let lateMinutes = 0;
    if (checkInEvent) {
      const actualIn = parseTime(checkInEvent.time);
      lateMinutes = Math.max(0, actualIn - scheduledStart - graceMinutes);
    }

    // Early leave detection — using employee's shift schedule
    let earlyLeaveMinutes = 0;
    if (checkOutEvent) {
      const actualOut = parseTime(checkOutEvent.time);
      earlyLeaveMinutes = Math.max(0, scheduledEnd - actualOut);
    }

    // Overtime — based on shift schedule
    let overtimeMinutes = 0;
    if (checkInEvent && checkOutEvent) {
      const inTime = parseTime(checkInEvent.time);
      const outTime = parseTime(checkOutEvent.time);
      const scheduledMinutes = scheduledEnd - scheduledStart;
      overtimeMinutes = Math.max(0, (outTime - inTime) - scheduledMinutes - breakMinutes);
    }

    // Determine status
    let status;
    if (absentEvent) status = ATTENDANCE_STATUS.ABSENT;
    else if (leaveEvent) status = ATTENDANCE_STATUS.ON_LEAVE;
    else if (holidayEvent) status = ATTENDANCE_STATUS.HOLIDAY;
    else if (weekendEvent) status = ATTENDANCE_STATUS.WEEKEND;
    else if (remoteEvent) status = ATTENDANCE_STATUS.REMOTE;
    else if (missionEvent) status = ATTENDANCE_STATUS.MISSION;
    else if (!checkInEvent && checkOutEvent) status = ATTENDANCE_STATUS.MISSING_CHECK_IN;
    else if (checkInEvent && !checkOutEvent) status = ATTENDANCE_STATUS.MISSING_CHECK_OUT;
    else if (lateMinutes > 0) status = ATTENDANCE_STATUS.LATE;
    else status = ATTENDANCE_STATUS.PRESENT;

    const missingCheckIn = !checkInEvent ? 1 : 0;
    const missingCheckOut = !checkOutEvent ? 1 : 0;

    // Upsert daily summary
    await runQuery(`
      INSERT INTO daily_attendance_summary 
      (employee_id, date, first_check_in, last_check_out, 
       working_minutes, break_minutes, net_working_minutes,
       late_minutes, early_leave_minutes, overtime_minutes,
       status, missing_check_in, missing_check_out, last_calculated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(employee_id, date) DO UPDATE SET
        first_check_in = COALESCE(?, daily_attendance_summary.first_check_in),
        last_check_out = COALESCE(?, daily_attendance_summary.last_check_out),
        working_minutes = ?,
        break_minutes = ?,
        net_working_minutes = ?,
        late_minutes = ?,
        early_leave_minutes = ?,
        overtime_minutes = ?,
        status = ?,
        missing_check_in = ?,
        missing_check_out = ?,
        last_calculated_at = CURRENT_TIMESTAMP
    `, [
      employeeId, date,
      checkInEvent?.time || null,
      checkOutEvent?.time || null,
      workingMinutes, breakMinutes, netWorkingMinutes,
      lateMinutes, earlyLeaveMinutes, overtimeMinutes,
      status, missingCheckIn, missingCheckOut,
      // Update values
      checkInEvent?.time || null,
      checkOutEvent?.time || null,
      workingMinutes, breakMinutes, netWorkingMinutes,
      lateMinutes, earlyLeaveMinutes, overtimeMinutes,
      status, missingCheckIn, missingCheckOut
    ]);

    return { success: true, status };
  } catch (error) {
    console.error('[AttendanceEngine] Error recalculating daily summary:', error);
    return { success: false, error: error.message };
  }
}

// ──────────────────────────────────────────────────────────────
// 4. SAVE EMPTY DAY SUMMARY (no events = absent or leave)
// ──────────────────────────────────────────────────────────────
async function saveEmptyDaySummary(employeeId, date) {
  // Check if it's a weekend (Friday/Saturday in EG)
  const dayOfWeek = new Date(date).getDay();
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday

  // Check if employee has approved leave for this date
  const leaveRes = await getOne(`
    SELECT id FROM ${tables.leaves} 
    WHERE employee_id = ? AND status = 'approved'
      AND start_date <= ? AND end_date >= ?
  `, [employeeId, date, date]);

  const onLeave = leaveRes.data ? true : false;

  let status;
  if (isWeekend) status = ATTENDANCE_STATUS.WEEKEND;
  else if (onLeave) status = ATTENDANCE_STATUS.ON_LEAVE;
  else status = ATTENDANCE_STATUS.ABSENT;

  await runQuery(`
    INSERT INTO daily_attendance_summary 
    (employee_id, date, working_minutes, break_minutes, net_working_minutes,
     late_minutes, early_leave_minutes, overtime_minutes,
     status, missing_check_in, missing_check_out, last_calculated_at)
    VALUES (?, ?, 0, 0, 0, 0, 0, 0, ?, 1, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(employee_id, date) DO UPDATE SET
      status = ?,
      missing_check_in = 1,
      missing_check_out = 1,
      last_calculated_at = CURRENT_TIMESTAMP
  `, [employeeId, date, status, status]);
}

// ──────────────────────────────────────────────────────────────
// 5. AUTOMATIC ABSENCE ENGINE (runs at 12:00 PM)
// ──────────────────────────────────────────────────────────────
async function runAbsenceEngine() {
  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().getDay();
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

  // Skip weekends
  if (isWeekend) {
    return { success: true, message: 'Weekend — no absence engine run' };
  }

  // Get all active employees
  const employeesRes = await getAll(`
    SELECT id, first_name, last_name FROM ${tables.employees} WHERE status = 'active'
  `);

  if (!employeesRes.success) {
    return { success: false, error: employeesRes.error };
  }

  const employees = employeesRes.data || [];
  let absentCount = 0;

  for (const emp of employees) {
    // Check if employee already has any event today
    const eventRes = await getAll(`
      SELECT id, event_type FROM attendance_events 
      WHERE employee_id = ? AND date = ? AND status = 'active'
    `, [emp.id, today]);

    const events = eventRes.data || [];
    const hasCheckIn = events.some(e => 
      e.event_type === EVENT_TYPES.CHECK_IN || 
      e.event_type === EVENT_TYPES.GPS_CHECKIN
    );
    const hasAbsentAuto = events.some(e => e.event_type === EVENT_TYPES.ABSENT_AUTO);
    const hasLeaveEvent = events.some(e => e.event_type === EVENT_TYPES.LEAVE_APPROVED);

    // Also check the leaves table directly for legacy approved leaves
    // (covers pre-existing leaves that don't have a LEAVE_APPROVED event yet)
    let hasApprovedLeave = hasLeaveEvent;
    if (!hasApprovedLeave) {
      const leaveRes = await getOne(`
        SELECT id FROM ${tables.leaves} 
        WHERE employee_id = ? AND status = 'approved'
          AND start_date <= ? AND end_date >= ?
      `, [emp.id, today, today]);
      if (leaveRes.data) {
        hasApprovedLeave = true;
        // Create LEAVE_APPROVED event for future runs
        await logAttendanceEvent({
          employee_id: emp.id,
          event_type: EVENT_TYPES.LEAVE_APPROVED,
          source: EVENT_SOURCES.SYSTEM,
          date: today,
          time: '12:00',
          reason: 'Auto-detected from approved leave',
          notes: `تلقائي: إجازة معتمدة موجودة في النظام`
        });
      }
    }

    // If no check-in and no leave, mark as absent
    if (!hasCheckIn && !hasApprovedLeave && !hasAbsentAuto) {
      await logAttendanceEvent({
        employee_id: emp.id,
        event_type: EVENT_TYPES.ABSENT_AUTO,
        source: EVENT_SOURCES.SYSTEM,
        date: today,
        time: '12:00',
        reason: 'No attendance before 12:00 PM',
        notes: `تلقائي: لم يسجل حضور قبل 12:00 ظهراً — ${emp.first_name} ${emp.last_name || ''}`
      });
      absentCount++;
    }
  }

  // Log engine run
  console.log(`[AbsenceEngine] Run complete. ${absentCount} employees marked absent.`);
  return { success: true, absentCount };
}

// ──────────────────────────────────────────────────────────────
// 6. GET ATTENDANCE TIMELINE (visual timeline data)
// ──────────────────────────────────────────────────────────────
async function getAttendanceTimeline(employeeId, startDate, endDate) {
  const result = await getAll(`
    SELECT ae.*, 
           e.first_name, e.last_name, e.employee_id as emp_code,
           d.name as department
    FROM attendance_events ae
    LEFT JOIN ${tables.employees} e ON ae.employee_id = e.id
    LEFT JOIN ${tables.departments} d ON e.department_id = d.id
    WHERE ae.employee_id = ? AND ae.date >= ? AND ae.date <= ?
      AND ae.status = 'active'
    ORDER BY ae.date DESC, ae.time ASC
  `, [employeeId, startDate, endDate]);

  return result;
}

// ──────────────────────────────────────────────────────────────
// 7. MONTHLY SUMMARY CALCULATION (for payroll)
// ──────────────────────────────────────────────────────────────
async function calculateMonthlySummary(employeeId, year, month) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const result = await getAll(`
    SELECT * FROM daily_attendance_summary 
    WHERE employee_id = ? 
      AND strftime('%Y-%m', date) = ?
    ORDER BY date
  `, [employeeId, monthStr]);

  const summaries = result.data || [];

  // Calculate aggregations
  let totalWorkingMinutes = 0;
  let totalBreakMinutes = 0;
  let totalNetWorkingMinutes = 0;
  let totalLateMinutes = 0;
  let totalEarlyLeaveMinutes = 0;
  let totalOvertimeMinutes = 0;
  let presentDays = 0;
  let absentDays = 0;
  let lateDays = 0;
  let leaveDays = 0;
  let holidayDays = 0;
  let weekendDays = 0;
  let missingCheckInDays = 0;
  let missingCheckOutDays = 0;
  let remoteDays = 0;
  let missionDays = 0;

  for (const s of summaries) {
    totalWorkingMinutes += s.working_minutes || 0;
    totalBreakMinutes += s.break_minutes || 0;
    totalNetWorkingMinutes += s.net_working_minutes || 0;
    totalLateMinutes += s.late_minutes || 0;
    totalEarlyLeaveMinutes += s.early_leave_minutes || 0;
    totalOvertimeMinutes += s.overtime_minutes || 0;

    switch (s.status) {
      case ATTENDANCE_STATUS.PRESENT:
      case ATTENDANCE_STATUS.LATE:
        presentDays++;
        if (s.status === ATTENDANCE_STATUS.LATE) lateDays++;
        break;
      case ATTENDANCE_STATUS.ABSENT:
        absentDays++;
        break;
      case ATTENDANCE_STATUS.ON_LEAVE:
        leaveDays++;
        break;
      case ATTENDANCE_STATUS.HOLIDAY:
        holidayDays++;
        break;
      case ATTENDANCE_STATUS.WEEKEND:
        weekendDays++;
        break;
      case ATTENDANCE_STATUS.MISSING_CHECK_IN:
        missingCheckInDays++;
        presentDays++;
        break;
      case ATTENDANCE_STATUS.MISSING_CHECK_OUT:
        missingCheckOutDays++;
        presentDays++;
        break;
      case ATTENDANCE_STATUS.REMOTE:
        remoteDays++;
        presentDays++;
        break;
      case ATTENDANCE_STATUS.MISSION:
        missionDays++;
        presentDays++;
        break;
    }
  }

  const totalDays = summaries.length;
  const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

  return {
    employee_id: employeeId,
    year,
    month,
    totalDays,
    presentDays,
    absentDays,
    lateDays,
    leaveDays,
    holidayDays,
    weekendDays,
    missingCheckInDays,
    missingCheckOutDays,
    remoteDays,
    missionDays,
    totalWorkingMinutes,
    totalBreakMinutes,
    totalNetWorkingMinutes,
    totalLateMinutes,
    totalEarlyLeaveMinutes,
    totalOvertimeMinutes,
    attendanceRate: parseFloat(attendanceRate),
    workingHours: (totalNetWorkingMinutes / 60).toFixed(1),
    overtimeHours: (totalOvertimeMinutes / 60).toFixed(1),
    lateHours: (totalLateMinutes / 60).toFixed(1),
  };
}

// ──────────────────────────────────────────────────────────────
// 8. DASHBOARD STATISTICS
// ──────────────────────────────────────────────────────────────
async function getDashboardStats(date) {
  const today = date || new Date().toISOString().split('T')[0];

  // Get today's summary for all employees
  const todaySummary = await getAll(`
    SELECT s.*, e.first_name, e.last_name, e.employee_id as emp_code,
           d.name as department,
           sh.name as shift_name, sh.start_time as shift_start, sh.end_time as shift_end
    FROM daily_attendance_summary s
    LEFT JOIN ${tables.employees} e ON s.employee_id = e.id
    LEFT JOIN ${tables.departments} d ON e.department_id = d.id
    LEFT JOIN shifts sh ON e.shift_id = sh.id
    WHERE s.date = ?
    ORDER BY s.first_check_in ASC
  `, [today]);

  const allSummaries = todaySummary.data || [];

  // Calculate statistics
  let presentToday = 0;
  let absentToday = 0;
  let lateToday = 0;
  let checkedOut = 0;
  let workingNow = 0;
  let missingCheckOut = 0;
  let missingCheckIn = 0;
  let overtimeToday = 0;
  let onLeaveToday = 0;
  let firstCheckIn = null;
  let lastCheckOut = null;
  let totalNetMinutes = 0;

  for (const s of allSummaries) {
    if (s.status === ATTENDANCE_STATUS.PRESENT || 
        s.status === ATTENDANCE_STATUS.LATE ||
        s.status === ATTENDANCE_STATUS.MISSING_CHECK_OUT ||
        s.status === ATTENDANCE_STATUS.MISSING_CHECK_IN) {
      presentToday++;
    }
    if (s.status === ATTENDANCE_STATUS.ABSENT) absentToday++;
    if (s.status === ATTENDANCE_STATUS.LATE) lateToday++;
    if (s.status === ATTENDANCE_STATUS.ON_LEAVE) onLeaveToday++;
    if (s.status === ATTENDANCE_STATUS.MISSING_CHECK_OUT) missingCheckOut++;
    if (s.status === ATTENDANCE_STATUS.MISSING_CHECK_IN) missingCheckIn++;
    if (s.missing_check_out === 0 && s.first_check_in) {
      checkedOut++;
    }
    if (s.missing_check_out === 1 && s.first_check_in) {
      workingNow++;
    }

    overtimeToday += s.overtime_minutes || 0;
    totalNetMinutes += s.net_working_minutes || 0;

    if (!firstCheckIn || (s.first_check_in && s.first_check_in < firstCheckIn)) {
      firstCheckIn = s.first_check_in;
    }
    if (!lastCheckOut || (s.last_check_out && s.last_check_out > lastCheckOut)) {
      lastCheckOut = s.last_check_out;
    }
  }

  const totalEmployees = allSummaries.length;
  const avgNetMinutes = presentToday > 0 ? Math.round(totalNetMinutes / presentToday) : 0;

  // Department comparison
  const deptMap = {};
  for (const s of allSummaries) {
    const dept = s.department || 'Unspecified';
    if (!deptMap[dept]) {
      deptMap[dept] = { total: 0, present: 0, absent: 0, late: 0 };
    }
    deptMap[dept].total++;
    if (s.status === ATTENDANCE_STATUS.PRESENT || 
        s.status === ATTENDANCE_STATUS.LATE ||
        s.status === ATTENDANCE_STATUS.MISSING_CHECK_OUT) {
      deptMap[dept].present++;
    }
    if (s.status === ATTENDANCE_STATUS.ABSENT) deptMap[dept].absent++;
    if (s.status === ATTENDANCE_STATUS.LATE) deptMap[dept].late++;
  }

  return {
    date: today,
    totalEmployees,
    presentToday,
    absentToday,
    lateToday,
    checkedOut,
    workingNow,
    missingCheckOut,
    missingCheckIn,
    overtimeToday,
    onLeaveToday,
    firstCheckIn,
    lastCheckOut,
    averageNetMinutes: avgNetMinutes,
    averageArrival: firstCheckIn,
    averageDeparture: lastCheckOut,
    departments: deptMap,
    employees: allSummaries.map(s => ({
      id: s.employee_id,
      name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
      code: s.emp_code,
      department: s.department,
      shift_name: s.shift_name || null,
      shift_start: s.shift_start || null,
      shift_end: s.shift_end || null,
      checkIn: s.first_check_in,
      checkOut: s.last_check_out,
      status: s.status,
      workingMinutes: s.net_working_minutes,
      lateMinutes: s.late_minutes,
      overtimeMinutes: s.overtime_minutes,
    })),
  };
}

// ──────────────────────────────────────────────────────────────
// 9. AUDIT TRAIL
// ──────────────────────────────────────────────────────────────
async function logAuditTrail({
  table_name,
  record_id,
  action,
  old_value = null,
  new_value = null,
  changed_by = null,
  reason = null,
  ip_address = null,
}) {
  return await runQuery(`
    INSERT INTO audit_logs 
    (table_name, record_id, action, old_value, new_value, 
     changed_by, reason, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [table_name, record_id, action, 
    old_value ? JSON.stringify(old_value) : null,
    new_value ? JSON.stringify(new_value) : null,
    changed_by, reason, ip_address
  ]);
}

// ──────────────────────────────────────────────────────────────
// 10. GET ATTENDANCE HISTORY (ALL events for an employee)
// ──────────────────────────────────────────────────────────────
async function getAttendanceHistory(employeeId, limit = 100, offset = 0) {
  return await getAll(`
    SELECT ae.*, e.first_name, e.last_name, e.employee_id as emp_code
    FROM attendance_events ae
    LEFT JOIN ${tables.employees} e ON ae.employee_id = e.id
    WHERE ae.employee_id = ? AND ae.status = 'active'
    ORDER BY ae.date DESC, ae.time DESC
    LIMIT ? OFFSET ?
  `, [employeeId, limit, offset]);
}

// ──────────────────────────────────────────────────────────────
// 11. HELPER: Parse time string "HH:MM" to minutes from midnight
// ──────────────────────────────────────────────────────────────
function parseTime(timeStr) {
  if (!timeStr) return NaN;
  const parts = timeStr.split(':');
  if (parts.length < 2) return NaN;
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

// ──────────────────────────────────────────────────────────────
// 12. BULK RECALCULATE ALL SUMMARIES FOR A DATE
// ──────────────────────────────────────────────────────────────
async function recalculateAllDailySummaries(date) {
  const employeesRes = await getAll(`
    SELECT id FROM ${tables.employees} WHERE status = 'active'
  `);

  if (!employeesRes.success) {
    return { success: false, error: employeesRes.error };
  }

  const employees = employeesRes.data || [];
  let count = 0;

  for (const emp of employees) {
    await recalculateDailySummary(emp.id, date);
    count++;
  }

  return { success: true, recalculated: count };
}

// ──────────────────────────────────────────────────────────────
// 13. EMPLOYEE MONTHLY STATISTICS (for reports/analytics)
// ──────────────────────────────────────────────────────────────
async function getEmployeeMonthlyStats(employeeId, year, month) {
  const monthlySummary = await calculateMonthlySummary(employeeId, year, month);

  // Get all events for the month
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const eventsRes = await getAll(`
    SELECT * FROM attendance_events 
    WHERE employee_id = ? AND date LIKE ? AND status = 'active'
    ORDER BY date ASC, time ASC
  `, [employeeId, `${monthStr}%`]);

  const events = eventsRes.data || [];
  const checkInTimes = events.filter(e => e.event_type === EVENT_TYPES.CHECK_IN).map(e => e.time);
  const checkOutTimes = events.filter(e => e.event_type === EVENT_TYPES.CHECK_OUT).map(e => e.time);

  // Calculate averages
  const avgCheckIn = checkInTimes.length > 0
    ? averageTime(checkInTimes)
    : null;
  const avgCheckOut = checkOutTimes.length > 0
    ? averageTime(checkOutTimes)
    : null;

  return {
    ...monthlySummary,
    totalEvents: events.length,
    avgCheckIn,
    avgCheckOut,
  };
}

// Helper: Calculate average time from array of "HH:MM" strings
function averageTime(times) {
  if (times.length === 0) return null;
  let totalMinutes = 0;
  for (const t of times) {
    totalMinutes += parseTime(t);
  }
  const avgMinutes = Math.round(totalMinutes / times.length);
  const hours = Math.floor(avgMinutes / 60);
  const minutes = avgMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// ──────────────────────────────────────────────────────────────
// EXPORTS
// ──────────────────────────────────────────────────────────────
module.exports = {
  EVENT_TYPES,
  EVENT_SOURCES,
  ATTENDANCE_STATUS,
  logAttendanceEvent,
  getEmployeeShift,
  recalculateDailySummary,
  recalculateAllDailySummaries,
  saveEmptyDaySummary,
  runAbsenceEngine,
  getAttendanceTimeline,
  calculateMonthlySummary,
  getDashboardStats,
  logAuditTrail,
  getAttendanceHistory,
  getEmployeeMonthlyStats,
};
