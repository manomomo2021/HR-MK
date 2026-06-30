
import { getEmployeeAllAttendance, getAllEmployees, getAttendanceSettings } from '../../utils/attendance-db';

export default function handler(req, res) {
  try {
    const { employeeId, year, month } = req.query;

    // إذا تم تحديد موظف معين، احصل على سجلاته
    if (employeeId) {
      const currentYear = year || new Date().getFullYear();
      const currentMonth = month || (new Date().getMonth() + 1);

      const result = getEmployeeAllAttendance(employeeId, currentYear, currentMonth);
      if (result.success) {
        res.status(200).json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } else {
      // إذا لم يتم تحديد موظف، احصل على قائمة جميع الموظفين
      const employeesResult = getAllEmployees();
      if (employeesResult.success) {
        res.status(200).json({ success: true, data: employeesResult.data });
      } else {
        res.status(500).json({ success: false, error: employeesResult.error });
      }
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
