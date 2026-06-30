const { getAll, getOne, runQuery, tables, getEmployees, getEmployeeById, saveEmployee } = require('../../utils/db');

// =============================================
// مُحوِّل حقول النموذج → أعمدة قاعدة البيانات
// =============================================
function mapFormToDb(body) {
  const nameParts = (body.name || '').trim().split(/\s+/)
  const firstName = nameParts[0] || body.first_name || ''
  const lastName = nameParts.slice(1).join(' ') || body.last_name || firstName

  return {
    id: body.id,
    employee_id: body.code || body.employee_id || `EMP-${Date.now()}`,
    first_name: firstName,
    last_name: lastName,
    email: body.email || null,
    phone: body.phone || null,
    address: body.address || null,
    birth_date: body.birthDate || body.birth_date || null,
    hire_date: body.hireDate || body.hire_date || new Date().toISOString().split('T')[0],
    department_id: body.department_id || null,
    position_id: body.position_id || null,
    salary: parseFloat(body.basicSalary || body.salary || 0) || 0,
    image: body.image || null,
    status: body.status || 'active',
    contract_type: body.contractType || body.contract_type || null,
    allowances: parseFloat(body.allowances || 0) || 0,
    gender: body.gender || null,
    national_id: body.nationalId || body.national_id || null,
    marital_status: body.maritalStatus || body.marital_status || null,
    governorate: body.governorate || null,
    department_name: body.department || body.department_name || null,
    position_name: body.position || body.position_name || null,
    shift_id: body.shift_id || body.shiftId || null,
  }
}


export default async function handler(req, res) {
  try {
    switch (req.method) {

      case 'GET':
        if (req.query.id) {
          const one = await getEmployeeById(req.query.id)
          if (one.success) {
            res.status(200).json({ success: true, data: one.data })
          } else {
            res.status(500).json({ success: false, error: one.error })
          }
        } else {
          const all = await getEmployees()
          if (all.success) {
            res.status(200).json({ success: true, data: all.data })
          } else {
            res.status(500).json({ success: false, error: all.error })
          }
        }
        break

      case 'POST': {
        const mapped = mapFormToDb(req.body)
        const result = await saveEmployee(mapped)
        if (result.success) {
          res.status(201).json({ success: true, message: 'تم إضافة الموظف بنجاح', id: result.data.lastInsertRowid })
        } else {
          res.status(500).json({ success: false, error: result.error })
        }
        break
      }

      case 'PUT': {
        const mapped = mapFormToDb(req.body)
        const result = await saveEmployee(mapped)
        if (result.success) {
          res.status(200).json({ success: true, message: 'تم تحديث الموظف بنجاح' })
        } else {
          res.status(500).json({ success: false, error: result.error })
        }
        break
      }

      case 'DELETE': {
        const mapped = mapFormToDb({ ...req.body, status: 'inactive' })
        const result = await saveEmployee(mapped)
        if (result.success) {
          res.status(200).json({ success: true, message: 'تم أرشفة الموظف بنجاح' })
        } else {
          res.status(500).json({ success: false, error: result.error })
        }
        break
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}
