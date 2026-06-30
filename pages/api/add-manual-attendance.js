
import { addManualAttendance, hasManualAttendanceRecord, getAttendanceSettings } from '../../utils/attendance-db';

export default function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, message: 'Method not allowed' });
      return;
    }

    const { employeeId, date, checkIn, checkOut, typeId, notes, createdBy } = req.body;

    if (!employeeId || !date || !typeId) {
      res.status(400).json({ 
        success: false, 
        error: 'Employee ID, date, and type ID are required' 
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

    // إذا لم يكن مسموحًا بالتكرار، تحقق من وجود سجل سابق من نفس النوع
    if (!allowDuplicate) {
      const existingRecord = hasManualAttendanceRecord(employeeId, date, typeId);

      if (existingRecord.success) {
        // إذا كان هناك سجل حضور بالفعل ولا يسمح بالتكرار
        if (existingRecord.data.count > 0) {
          res.status(400).json({ 
            success: false, 
            error: 'Manual attendance record already exists for this employee on this date with the same type' 
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

    // إضافة سجل الحضور اليدوي
    const result = addManualAttendance(employeeId, date, checkIn, checkOut, typeId, notes, createdBy);

    if (result.success) {
      res.status(201).json({ 
        success: true, 
        message: 'Manual attendance record added successfully',
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
