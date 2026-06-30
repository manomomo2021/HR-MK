
import { addAttendance, hasAnyAttendanceRecord, getAttendanceSettings } from '../../utils/attendance-db';

export default function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, message: 'Method not allowed' });
      return;
    }

    const { employeeId, date, checkIn, checkOut, deviceId } = req.body;

    if (!employeeId || !date) {
      res.status(400).json({ 
        success: false, 
        error: 'Employee ID and date are required' 
      });
      return;
    }

    // الحصول على إعدادات الحضور
    const settingsResult = getAttendanceSettings();
    let allowDuplicate = false;

    if (settingsResult.success) {
      const settings = settingsResult.data;
      // إذا كان تسجيل الحضور، تحقق من إعدادات تكرار الحضور
      if (checkIn && !checkOut) {
        allowDuplicate = settings.allow_duplicate_checkin === 'true';
      }
      // إذا كان تسجيل الانصراف، تحقق من إعدادات تكرار الانصراف
      else if (!checkIn && checkOut) {
        allowDuplicate = settings.allow_duplicate_checkout === 'true';
      }
    }

    // إذا لم يكن مسموحًا بالتكرار، تحقق من وجود سجل سابق
    if (!allowDuplicate) {
      const existingRecord = hasAnyAttendanceRecord(employeeId, date);

      if (existingRecord.success) {
        // إذا كان هناك سجل حضور بالفعل ولا يسمح بالتكرار
        if (existingRecord.data.total > 0) {
          res.status(400).json({ 
            success: false, 
            error: 'Attendance record already exists for this employee on this date' 
          });
          return;
        }
      } else {
        res.status(500).json({ 
          success: false, 
          error: existingRecord.error 
        });
        return;
      }
    }

    // إضافة سجل الحضور
    const result = addAttendance(employeeId, date, checkIn, checkOut, deviceId);

    if (result.success) {
      res.status(201).json({ 
        success: true, 
        message: 'Attendance record added successfully',
        id: result.data.lastInsertRowid
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
