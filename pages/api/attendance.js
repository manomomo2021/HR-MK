let ZKLib = null;

try {
  ZKLib = require('node-zklib');
} catch (error) {
  console.warn('node-zklib is missing:', error.message);
}

import { getAll, runQuery, tables } from '../../utils/db';
import { logAttendanceEvent } from '../../utils/attendanceEngine';

function getDeviceSettings() {
  return [
    {
      id: '1',
      name: 'جهاز البصمة الرئيسي',
      ip: process.env.BIOMETRIC_IP || '127.0.0.1',
      port: parseInt(process.env.BIOMETRIC_PORT) || 4370,
      timeout: parseInt(process.env.BIOMETRIC_TIMEOUT) || 5000,
      inport: parseInt(process.env.BIOMETRIC_INPORT) || 4000,
      isActive: true
    }
  ];
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method Not Allowed' });
    return;
  }

  let activeDevices = getDeviceSettings();
  
  if (req.method === 'POST') {
    const { devices } = req.body || {};
    if (devices && Array.isArray(devices) && devices.length > 0) {
      activeDevices = devices.filter(d => d.isActive);
    }
  }

  if (req.query.test === 'true') {
    if (!ZKLib) {
      return res.status(200).json({ success: false, error: 'مكتبة node-zklib غير مثبتة' });
    }
    const deviceStatusList = [];
    for (const device of activeDevices) {
      try {
        const zk = new ZKLib(device.ip, device.port, device.timeout, device.inport);
        await zk.createSocket();
        await zk.disconnect();
        deviceStatusList.push({ device: device.name || device.ip, success: true });
      } catch (err) {
        deviceStatusList.push({ device: device.name || device.ip, success: false, error: err.message });
      }
    }
    return res.status(200).json({ success: true, devices: deviceStatusList });
  }

  let syncResults = [];
  let anySuccess = false;

  // 1. Sync from Biometric Devices
  if (ZKLib && activeDevices.length > 0) {
    // Get all active employees to map device UID to employee ID
    let empMap = {};
    try {
      const employeesRes = await getAll(`SELECT id, employee_id FROM ${tables.employees} WHERE status = 'active'`);
      (employeesRes.data || []).forEach(emp => {
        empMap[emp.employee_id] = emp.id;
      });
    } catch (e) {
      console.warn("Could not fetch employees for biometric mapping", e);
    }

    for (const device of activeDevices) {
      try {
        const zk = new ZKLib(device.ip, device.port, device.timeout, device.inport);
        await zk.createSocket();
        const logsResult = await zk.getAttendances();
        const rawLogs = Array.isArray(logsResult) ? logsResult : (logsResult?.data || []);
        
        let newEvents = 0;

        // Filter logs and group by employee and day
        for (const att of rawLogs) {
          const uid = String(att.deviceUserId ?? att.userid ?? att.uid ?? '');
          const empDbId = empMap[uid];
          if (!empDbId) continue;

          const timestamp = att.recordTime ? new Date(att.recordTime) : null;
          if (!timestamp || isNaN(timestamp)) continue;

          const dateIso = timestamp.toISOString().split('T')[0];
          const timeIso = timestamp.toTimeString().slice(0, 5); // HH:MM

          // Determine type based on hour
          const hour = timestamp.getHours();
          const type = hour < 12 ? 'CHECK_IN' : 'CHECK_OUT';

          // Check if event already exists
          const exists = await getAll(`
            SELECT id FROM attendance_events 
            WHERE employee_id = ? AND date = ? AND time = ? AND source = 'BIOMETRIC'
          `, [empDbId, dateIso, timeIso]);

          if (exists.data && exists.data.length === 0) {
            await logAttendanceEvent({
              employee_id: empDbId,
              event_type: type,
              source: 'BIOMETRIC',
              date: dateIso,
              time: timeIso,
              notes: `تم السحب من: ${device.name || device.ip}`
            });
            newEvents++;
          }
        }
        await zk.disconnect();
        syncResults.push({ device: device.name || device.ip, success: true, newEvents });
        anySuccess = true;
      } catch (err) {
        console.warn(`Biometric sync failed for ${device.ip}:`, err.message);
        syncResults.push({ device: device.name || device.ip, success: false, error: err.message });
      }
    }
  } else if (!ZKLib) {
    syncResults.push({ success: false, error: 'مكتبة البصمة غير مثبتة' });
  }

  // 2. Fetch the Enterprise Daily Summary to show in UI
  try {
    const summaryRes = await getAll(`
      SELECT s.*, e.first_name, e.last_name, e.employee_id as emp_code, e.salary
      FROM daily_attendance_summary s
      LEFT JOIN ${tables.employees} e ON s.employee_id = e.id
      ORDER BY s.date DESC, s.first_check_in DESC
      LIMIT 200
    `);

    const attendance = (summaryRes.data || []).map(row => {
      return {
        userId: row.emp_code || String(row.employee_id),
        userName: row.first_name ? `${row.first_name} ${row.last_name || ''}`.trim() : `موظف ${row.employee_id}`,
        salary: row.salary || 0,
        date: row.date,
        inTime: row.first_check_in ? row.first_check_in : 'لم يسجل حضور',
        outTime: row.last_check_out ? row.last_check_out : 'لم يسجل انصراف',
        workDuration: row.working_minutes > 0 ? `${Math.floor(row.working_minutes / 60)} ساعة ${row.working_minutes % 60} دقيقة` : '0',
        overtime: `${row.overtime_minutes} دقيقة`,
        overtimeMinutes: row.overtime_minutes,
        late: `${row.late_minutes} دقيقة`,
        lateMinutes: row.late_minutes,
        verifyMode: 'محرك الأحداث (Enterprise)',
        status: row.status
      };
    });

    res.status(200).json({
      success: true,
      attendance,
      syncResults,
      syncStatus: anySuccess ? 'تم المزامنة بنجاح من الأجهزة' : 'اكتملت المزامنة مع وجود أخطاء أو لا توجد أجهزة نشطة',
      summary: {
        totalRecords: attendance.length,
        totalEmployees: new Set(attendance.map(a => a.userId)).size,
      }
    });

  } catch (dbErr) {
    console.error("DB Fetch Error:", dbErr);
    res.status(500).json({ success: false, error: dbErr.message });
  }
}
