import { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Reports() {
  const { employees, attendance, leaves, devices, loading } = useData()
  const { logActivity } = useAuth()
  const { language } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e
  const [selectedReport, setSelectedReport] = useState('')
  const [reportData, setReportData] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    employeeId: '', department: ''
  })

  const reportTypes = [
    { id: 'attendance', name: ar('تقرير الحضور والانصراف', 'Attendance Report'), description: ar('تقرير شامل عن حضور وانصراف الموظفين', 'Comprehensive attendance report'), icon: 'fas fa-clock', color: 'text-blue-500' },
    { id: 'leaves', name: ar('تقرير الأجازات', 'Leave Report'), description: ar('تقرير عن طلبات الأجازات وأرصدة الموظفين', 'Leave requests and balances report'), icon: 'fas fa-calendar-alt', color: 'text-green-500' },
    { id: 'employees', name: ar('تقرير الموظفين', 'Employee Report'), description: ar('تقرير شامل عن بيانات الموظفين', 'Comprehensive employee data report'), icon: 'fas fa-users', color: 'text-purple-500' },
    { id: 'summary', name: ar('التقرير الإجمالي', 'Summary Report'), description: ar('تقرير شامل عن جميع أنشطة النظام', 'System-wide activity summary'), icon: 'fas fa-chart-bar', color: 'text-orange-500' }
  ]

  const generateReport = async (reportType) => {
    setIsGenerating(true); setSelectedReport(reportType)
    const loadingToast = toast.loading(ar('جاري إنشاء التقرير...', 'Generating report...'))
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      let data = null
      if (reportType === 'attendance') {
        const filtered = attendance.filter(r => new Date(r.date) >= new Date(filters.startDate) && new Date(r.date) <= new Date(filters.endDate) && (!filters.employeeId || r.employeeId?.toString() === filters.employeeId))
        data = { type: 'attendance', title: ar('تقرير الحضور والانصراف', 'Attendance Report'), period: ar(`من ${filters.startDate} إلى ${filters.endDate}`, `From ${filters.startDate} to ${filters.endDate}`), stats: { [ar('إجمالي السجلات', 'Total Records')]: filtered.length, [ar('موظفين فريدين', 'Unique Employees')]: new Set(filtered.map(r => r.employeeId)).size }, records: filtered.slice(0, 10), summary: ar(`تم تسجيل ${filtered.length} سجل حضور`, `${filtered.length} attendance records`) }
      } else if (reportType === 'leaves') {
        const filtered = leaves.filter(l => new Date(l.startDate) >= new Date(filters.startDate) && new Date(l.startDate) <= new Date(filters.endDate) && (!filters.employeeId || l.employeeId?.toString() === filters.employeeId))
        data = { type: 'leaves', title: ar('تقرير الأجازات', 'Leave Report'), period: ar(`من ${filters.startDate} إلى ${filters.endDate}`, `From ${filters.startDate} to ${filters.endDate}`), stats: { [ar('إجمالي الطلبات', 'Total Requests')]: filtered.length, [ar('أيام الإجازة', 'Leave Days')]: filtered.reduce((s, l) => s + (l.days || 0), 0) }, records: filtered.slice(0, 10), summary: ar(`تم تسجيل ${filtered.length} طلب إجازة`, `${filtered.length} leave requests`) }
      } else if (reportType === 'employees') {
        const filtered = filters.department ? employees.filter(e => e.department === filters.department) : employees
        data = { type: 'employees', title: ar('تقرير الموظفين', 'Employee Report'), period: ar('جميع البيانات', 'All Data'), stats: { [ar('إجمالي الموظفين', 'Total')]: filtered.length, [ar('الأقسام', 'Departments')]: new Set(filtered.map(e => e.department)).size }, records: filtered.slice(0, 10), summary: ar(`يوجد ${filtered.length} موظف`, `${filtered.length} employees`) }
      } else if (reportType === 'summary') {
        data = { type: 'summary', title: ar('التقرير الإجمالي للنظام', 'System Summary'), period: ar('جميع البيانات', 'All Data'), stats: { [ar('إجمالي الموظفين', 'Total Employees')]: employees.length, [ar('الأجهزة', 'Devices')]: devices.length, [ar('سجلات الحضور', 'Attendance Records')]: attendance.length, [ar('طلبات الإجازة', 'Leave Requests')]: leaves.length }, records: [], summary: ar(`النظام يحتوي على ${employees.length} موظف و ${devices.length} جهاز`, `System has ${employees.length} employees and ${devices.length} devices`) }
      }
      setReportData(data)
      toast.dismiss(loadingToast)
      toast.success(ar('تم إنشاء التقرير بنجاح', 'Report generated'))
      logActivity('report_generate', ar(`تم إنشاء تقرير: ${reportTypes.find(r => r.id === reportType)?.name}`, `Report generated: ${reportTypes.find(r => r.id === reportType)?.name}`))
    } catch (e) { toast.dismiss(loadingToast); toast.error(ar('حدث خطأ أثناء إنشاء التقرير', 'Error generating report')) }
    finally { setIsGenerating(false) }
  }

  if (loading) return <ProtectedRoute><Layout><div className="flex items-center justify-center h-64"><div className="spinner"></div></div></Layout></ProtectedRoute>

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="page-title">{ar('التقارير', 'Reports')}</h1>
              <p className="page-description">{ar('إنشاء وتصدير التقارير المختلفة', 'Generate and export reports')}</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-surface-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-surface-700 mb-4">{ar('اختر نوع التقرير', 'Select Report Type')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {reportTypes.map((report, index) => (
                <motion.div key={report.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}
                  className="bg-surface-50 border border-surface-200 hover:border-brand-200 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md text-center"
                  onClick={() => generateReport(report.id)}>
                  <i className={`${report.icon} text-4xl ${report.color} mb-4`}></i>
                  <h4 className="font-black text-surface-900 text-sm mb-1">{report.name}</h4>
                  <p className="text-xs text-surface-500 font-medium mb-4">{report.description}</p>
                  <button disabled={isGenerating && selectedReport === report.id}
                    className="btn btn-primary btn-sm w-full">
                    {isGenerating && selectedReport === report.id ? ar('جاري الإنشاء...', 'Generating...') : <><i className="fas fa-chart-line"></i> {ar('إنشاء التقرير', 'Generate')}</>}
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-surface-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-surface-700 mb-4">{ar('فلاتر التقرير', 'Report Filters')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-surface-500 mb-1.5 block">{ar('من تاريخ', 'From Date')}</label>
                <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="input text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-surface-500 mb-1.5 block">{ar('إلى تاريخ', 'To Date')}</label>
                <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="input text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-surface-500 mb-1.5 block">{ar('الموظف', 'Employee')}</label>
                <select value={filters.employeeId} onChange={e => setFilters({ ...filters, employeeId: e.target.value })} className="select text-sm">
                  <option value="">{ar('جميع الموظفين', 'All Employees')}</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-surface-500 mb-1.5 block">{ar('القسم', 'Department')}</label>
                <select value={filters.department} onChange={e => setFilters({ ...filters, department: e.target.value })} className="select text-sm">
                  <option value="">{ar('جميع الأقسام', 'All Departments')}</option>
                  {[...new Set(employees.map(e => e.department))].filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </motion.div>

          {reportData && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-surface-200 rounded-2xl p-6 shadow-sm">
              <div className="border-b border-surface-200 pb-4 mb-6">
                <h2 className="text-xl font-black text-surface-900">{reportData.title}</h2>
                <p className="text-sm text-surface-500 mt-1">{reportData.period}</p>
                <p className="text-xs text-surface-400 mt-1">{reportData.summary}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {Object.entries(reportData.stats).map(([key, value]) => (
                  <div key={key} className="text-center p-4 bg-surface-50 border border-surface-200 rounded-xl">
                    <div className="text-2xl font-black text-brand-600">{value}</div>
                    <div className="text-xs font-bold text-surface-500 mt-1">{key}</div>
                  </div>
                ))}
              </div>
              {reportData.records?.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead><tr className="bg-surface-50 border-b border-surface-200">
                      {Object.keys(reportData.records[0]).map(key => <th key={key} className="py-3 px-4 font-bold text-surface-500 text-xs">{key}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-surface-100">
                      {reportData.records.map((record, i) => (
                        <tr key={i} className="hover:bg-surface-50/50">
                          {Object.values(record).map((val, j) => <td key={j} className="py-3 px-4 text-surface-700 text-xs">{String(val)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
