
import { getAllEmployees, addEmployee, updateEmployee } from '../../utils/attendance-db';

export default function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':
        // الحصول على جميع الموظفين
        const result = getAllEmployees();
        if (result.success) {
          res.status(200).json({ success: true, data: result.data });
        } else {
          res.status(500).json({ success: false, error: result.error });
        }
        break;

      case 'POST':
        // إضافة موظف جديد
        const employeeResult = addEmployee(req.body);
        if (employeeResult.success) {
          res.status(201).json({ 
            success: true, 
            message: 'Employee added successfully', 
            id: employeeResult.data.lastInsertRowid 
          });
        } else {
          res.status(500).json({ success: false, error: employeeResult.error });
        }
        break;

      case 'PUT':
        // تحديث موظف موجود
        const { id, ...employeeData } = req.body;
        const updateResult = updateEmployee(id, employeeData);
        if (updateResult.success) {
          res.status(200).json({ 
            success: true, 
            message: 'Employee updated successfully' 
          });
        } else {
          res.status(500).json({ success: false, error: updateResult.error });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
