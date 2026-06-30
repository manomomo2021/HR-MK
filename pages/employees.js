import { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import Layout from '../components/Layout'
import EmployeeModal from '../components/EmployeeModal'
import EmployeeImportModal from '../components/EmployeeImportModal'
import ProtectedRoute from '../components/ProtectedRoute'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { downloadCSV } from '../utils/excel'
import { formatCurrency } from '../utils/currency'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const row     = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { duration: 0.3 } } }

export default function Employees() {
  const { employees, loading, addEmployee, updateEmployee, deleteEmployee } = useData()
  const { logActivity } = useAuth()
  const { language } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [searchQuery, setSearchQuery]   = useState('')
  const [departmentFilter, setDeptF]   = useState('')
  const [contractFilter, setContractF] = useState('')
  const [isModalOpen, setIsModalOpen]  = useState(false)
  const [selectedEmployee, setSelected] = useState(null)
  const [isImportOpen, setImportOpen]  = useState(false)
  const [departments, setDepts]        = useState([])

  useEffect(() => {
    if (employees.length > 0) {
      setDepts([...new Set(employees.map(e => e.department))].filter(Boolean))
    }
    let filtered = [...employees]
    if (searchQuery) {
      filtered = filtered.filter(e =>
        [e.name, e.code, e.nationalId, e.department, e.position]
          .some(v => v?.toString().toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }
    if (departmentFilter) filtered = filtered.filter(e => e.department === departmentFilter)
    if (contractFilter)   filtered = filtered.filter(e => e.contractType === contractFilter)
    setFilteredEmployees(filtered)
  }, [employees, searchQuery, departmentFilter, contractFilter])

  const handleEdit   = (emp) => { setSelected(emp); setIsModalOpen(true) }
  const handleAdd    = ()    => { setSelected(null); setIsModalOpen(true) }
  const handleDelete = (emp) => {
    if (confirm(ar(`هل أنت متأكد من حذف سجل "${emp.name}"؟`, `Are you sure you want to delete "${emp.name}"?`))) {
      deleteEmployee(emp.id).then(r => {
        if (r?.success) logActivity('employee_delete', ar(`حذف: ${emp.name}`, `Deleted: ${emp.name}`))
      })
    }
  }

  const handleSave = async (data) => {
    try {
      const r = selectedEmployee ? await updateEmployee(selectedEmployee.id, data) : await addEmployee(data)
      if (r?.success) { setIsModalOpen(false); logActivity(selectedEmployee ? 'employee_update' : 'employee_add', data.name) }
    } catch { toast.error(ar('حدث خطأ أثناء الحفظ', 'Error saving')) }
  }

  const handleExport = () => {
    try {
      const tid = toast.loading(ar('جارٍ التصدير...', 'Exporting...'))
      const csv = '\ufeff' + Object.keys(filteredEmployees[0] || {}).join(',') + '\n'
        + filteredEmployees.map(e => Object.values(e).map(v => `"${v||''}"`).join(',')).join('\n')
      downloadCSV(csv, `employees_${new Date().toISOString().split('T')[0]}.csv`)
      toast.dismiss(tid)
      toast.success(ar(`تم تصدير ${filteredEmployees.length} موظف`, `Exported ${filteredEmployees.length} employees`))
    } catch { toast.error(ar('فشل التصدير', 'Export failed')) }
  }

  const handleImport = async (imported) => {
    const tid = toast.loading(ar('جارٍ الاستيراد...', 'Importing...'))
    for (const e of imported) await addEmployee(e)
    toast.dismiss(tid)
    toast.success(ar(`تم استيراد ${imported.length} موظف`, `Imported ${imported.length} employees`))
    setImportOpen(false)
  }

  const contractLabel = (c) => c === 'permanent'
    ? { label: ar('دائم', 'Permanent'), cls: 'badge-success' }
    : { label: ar('مؤقت', 'Temporary'), cls: 'badge-warning' }

  if (loading) return (
    <ProtectedRoute><Layout>
      <div className="flex items-center justify-center h-64">
        <div className="spinner" style={{ borderTopColor: '#4f46e5' }}></div>
      </div>
    </Layout></ProtectedRoute>
  )

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="page-title">{ar('الموظفون', 'Employees')}</h1>
              <p className="page-description">{ar('إدارة وتتبع جميع بيانات الموظفين', 'Manage and track all employee data')}</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={handleAdd} className="btn btn-primary btn-md">
                <i className="fas fa-user-plus text-sm"></i> {ar('إضافة موظف', 'Add Employee')}
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => setImportOpen(true)} className="btn btn-secondary btn-md">
                <i className="fas fa-file-import text-sm"></i> {ar('استيراد', 'Import')}
              </motion.button>
              {filteredEmployees.length > 0 && (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleExport} className="btn btn-secondary btn-md">
                  <i className="fas fa-download text-sm"></i> {ar('تصدير', 'Export')}
                </motion.button>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: ar('إجمالي الموظفين', 'Total Employees'), value: employees.length, icon: 'fa-users', color: 'bg-brand-50 text-brand-600' },
              { label: ar('نشطون', 'Active'), value: employees.filter(e => e.status !== 'inactive').length, icon: 'fa-circle-check', color: 'bg-emerald-50 text-emerald-600' },
              { label: ar('عقود دائمة', 'Permanent'), value: employees.filter(e => e.contractType === 'permanent').length, icon: 'fa-shield-halved', color: 'bg-sky-50 text-sky-600' },
              { label: ar('عقود مؤقتة', 'Temporary'), value: employees.filter(e => e.contractType === 'temporary').length, icon: 'fa-hourglass-half', color: 'bg-amber-50 text-amber-600' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-surface-200 p-5 flex items-center gap-4" style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
                <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center flex-shrink-0`}>
                  <i className={`fas ${s.icon}`}></i>
                </div>
                <div>
                  <p className="text-xl font-black text-surface-900 leading-none">{s.value}</p>
                  <p className="text-xs font-bold text-surface-500 mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-surface-200 p-5" style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1 relative">
                <i className="fas fa-magnifying-glass absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none"></i>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder={ar('بحث بالاسم أو الكود أو القسم...', 'Search by name, code, or department...')} className="input pr-10 text-sm" />
              </div>
              <select value={departmentFilter} onChange={e => setDeptF(e.target.value)} className="select text-sm">
                <option value="">{ar('جميع الأقسام', 'All Departments')}</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="flex gap-2">
                <select value={contractFilter} onChange={e => setContractF(e.target.value)} className="select text-sm flex-1">
                  <option value="">{ar('جميع العقود', 'All Contracts')}</option>
                  <option value="permanent">{ar('دائم', 'Permanent')}</option>
                  <option value="temporary">{ar('مؤقت', 'Temporary')}</option>
                </select>
                {(searchQuery || departmentFilter || contractFilter) && (
                  <button onClick={() => { setSearchQuery(''); setDeptF(''); setContractF('') }}
                    className="btn btn-ghost btn-md px-3" style={{ color: '#e11d48' }} title={ar('مسح الفلاتر', 'Clear filters')}>
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="table-container">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                  <i className="fas fa-table-list text-brand-600 text-sm"></i>
                </div>
                <span className="text-sm font-black text-surface-700">{ar('سجلات الموظفين', 'Employee Records')}</span>
              </div>
              <span className="badge badge-neutral">{ar(`${filteredEmployees.length} من ${employees.length}`, `${filteredEmployees.length} of ${employees.length}`)}</span>
            </div>

            {filteredEmployees.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{ar('الكود', 'Code')}</th><th>{ar('الموظف', 'Employee')}</th><th>{ar('القسم / الوظيفة', 'Dept / Position')}</th>
                      <th>{ar('الراتب', 'Salary')}</th><th>{ar('نوع العقد', 'Contract')}</th><th className="text-center">{ar('الإجراءات', 'Actions')}</th>
                    </tr>
                  </thead>
                  <motion.tbody variants={stagger} initial="hidden" animate="show">
                    {filteredEmployees.map((emp) => {
                      const ct = contractLabel(emp.contractType)
                      return (
                        <motion.tr key={emp.id} variants={row} className="group">
                          <td>
                            <span className="font-mono text-xs font-black text-brand-600 bg-brand-50 px-2.5 py-1.5 rounded-lg border border-brand-100">
                              {emp.code || `EMP-${String(emp.id).padStart(3,'0')}`}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)', color: '#4f46e5' }}>
                                {(emp.name || emp.first_name || '?').charAt(0)}
                              </div>
                              <div>
                                <p className="font-black text-surface-900 text-sm">{emp.name || emp.first_name}</p>
                                <p className="text-xs text-surface-400 font-medium mt-0.5">{emp.email || ar('لا يوجد بريد', 'No email')}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <p className="font-bold text-surface-800 text-sm">{emp.department || '—'}</p>
                            <p className="text-xs font-bold mt-1" style={{ color: '#4f46e5' }}>{emp.position || '—'}</p>
                          </td>
                          <td>
                            <span className="font-black text-sm" style={{ color: '#059669' }}>
                              {emp.salary ? formatCurrency(emp.salary, 'EGP') : '—'}
                            </span>
                          </td>
                          <td><span className={`badge ${ct.cls}`}>{ct.label}</span></td>
                          <td>
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleEdit(emp)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                                style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}
                                onMouseEnter={e => { e.currentTarget.style.background='#4f46e5'; e.currentTarget.style.color='white' }}
                                onMouseLeave={e => { e.currentTarget.style.background='#eef2ff'; e.currentTarget.style.color='#4f46e5' }}
                                title={ar('تعديل', 'Edit')}>
                                <i className="fas fa-pen text-xs"></i>
                              </button>
                              <button onClick={() => handleDelete(emp)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                                style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3' }}
                                onMouseEnter={e => { e.currentTarget.style.background='#e11d48'; e.currentTarget.style.color='white' }}
                                onMouseLeave={e => { e.currentTarget.style.background='#fff1f2'; e.currentTarget.style.color='#e11d48' }}
                                title={ar('حذف', 'Delete')}>
                                <i className="fas fa-trash text-xs"></i>
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </motion.tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><i className="fas fa-users-slash"></i></div>
                <h3 className="empty-title">{ar('لا يوجد موظفون', 'No employees')}</h3>
                <p className="empty-desc mb-6">
                  {searchQuery || departmentFilter || contractFilter
                    ? ar('لا توجد نتائج مطابقة للفلاتر المحددة', 'No matching results')
                    : ar('ابدأ بإضافة أول موظف في النظام', 'Start by adding your first employee')}
                </p>
                {!searchQuery && !departmentFilter && !contractFilter && (
                  <button onClick={handleAdd} className="btn btn-primary btn-md">
                    <i className="fas fa-user-plus"></i> {ar('إضافة موظف جديد', 'Add New Employee')}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
        <EmployeeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} employee={selectedEmployee} onSave={handleSave} />
        <EmployeeImportModal isOpen={isImportOpen} onClose={() => setImportOpen(false)} onImport={handleImport} existingEmployees={employees} />
      </Layout>
    </ProtectedRoute>
  )
}
