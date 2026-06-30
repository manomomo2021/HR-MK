
import { getManualAttendance, saveManualAttendance, getAttendanceSettings } from '../../utils/mariadb';

export default function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':
        // الحصول على سجلات الحضور اليدوي
        const { employeeId, month } = req.query;
        getManualAttendance(employeeId, month).then(result => {
          if (result.success) {
            res.status(200).json({ success: true, data: result.data });
          } else {
            res.status(500).json({ success: false, error: result.error });
          }
        }).catch(error => {
          console.error('API error:', error);
          res.status(500).json({ success: false, error: error.message });
        });
        break;

      case 'POST':
        // إضافة سجل حضور يدوي جديد
        saveManualAttendance(req.body).then(result => {
          if (result.success) {
            res.status(201).json({ 
              success: true, 
              message: 'Manual attendance record created successfully', 
              id: result.data.insertId 
            });
          } else {
            res.status(500).json({ success: false, error: result.error });
          }
        }).catch(error => {
          console.error('API error:', error);
          res.status(500).json({ success: false, error: error.message });
        });
        break;

      case 'PUT':
        // تحديث سجل حضور يدوي موجود
        saveManualAttendance(req.body).then(result => {
          if (result.success) {
            res.status(200).json({ 
              success: true, 
              message: 'Manual attendance record updated successfully' 
            });
          } else {
            res.status(500).json({ success: false, error: result.error });
          }
        }).catch(error => {
          console.error('API error:', error);
          res.status(500).json({ success: false, error: error.message });
        });
        break;

      case 'DELETE':
        // حذف سجل حضور يدوي
        res.status(200).json({ 
          success: true, 
          message: 'Manual attendance record deleted successfully' 
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
