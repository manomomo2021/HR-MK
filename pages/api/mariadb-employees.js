
import { getEmployees, getEmployeeById, saveEmployee } from '../../utils/mariadb';

export default function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':
        // الحصول على جميع الموظفين أو موظف محدد
        if (req.query.id) {
          getEmployeeById(req.query.id).then(result => {
            if (result.success) {
              res.status(200).json({ success: true, data: result.data });
            } else {
              res.status(500).json({ success: false, error: result.error });
            }
          }).catch(error => {
            console.error('API error:', error);
            res.status(500).json({ success: false, error: error.message });
          });
        } else {
          getEmployees().then(result => {
            if (result.success) {
              res.status(200).json({ success: true, data: result.data });
            } else {
              res.status(500).json({ success: false, error: result.error });
            }
          }).catch(error => {
            console.error('API error:', error);
            res.status(500).json({ success: false, error: error.message });
          });
        }
        break;

      case 'POST':
        // إضافة موظف جديد
        saveEmployee(req.body).then(result => {
          if (result.success) {
            res.status(201).json({ 
              success: true, 
              message: 'Employee created successfully', 
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
        // تحديث موظف موجود
        saveEmployee(req.body).then(result => {
          if (result.success) {
            res.status(200).json({ 
              success: true, 
              message: 'Employee updated successfully' 
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
        // حذف موظف (تغيير الحالة إلى غير نشط بدلاً من الحذف الفعلي)
        const employeeData = { ...req.body, status: 'inactive' };
        saveEmployee(employeeData).then(result => {
          if (result.success) {
            res.status(200).json({ 
              success: true, 
              message: 'Employee deleted successfully' 
            });
          } else {
            res.status(500).json({ success: false, error: result.error });
          }
        }).catch(error => {
          console.error('API error:', error);
          res.status(500).json({ success: false, error: error.message });
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
