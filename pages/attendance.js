import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import { motion, AnimatePresence } from 'framer-motion'
import { useData } from '../contexts/DataContext'
import { useLanguage } from '../contexts/LanguageContext'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export default function Attendance() {
  const { employees } = useData()
  const { language, isRtl, locale } = useLanguage()
  const [attendance, setAttendance] = useState([])
  const [biometricUsers, setBiometricUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchName, setSearchName] = useState("")
  const [searchMonth, setSearchMonth] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [employeeStats, setEmployeeStats] = useState(null)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState('today')
  const [employeeMapping, setEmployeeMapping] = useState({})
  const L = language
  const ar = (a, e) => L === 'ar' ? a : e

  useEffect(() => {
    fetchAttendanceData()
    fetchBiometricUsers()
    createEmployeeMapping()
  }, [])

  useEffect(() => { createEmployeeMapping() }, [employees, biometricUsers])

  const fetchBiometricUsers = async () => {
    try {
      const res = await fetch('/api/biometric-users')
      const result = await res.json()
      if (result.success) setBiometricUsers(result.users || [])
    } catch (err) {
      console.warn('⚠️ ' + ar('تعذر جلب بيانات البصمة', 'Failed to fetch biometric data'), err.message)
    }
  }

  const createEmployeeMapping = () => {
    const mapping = {}
    employees.forEach(emp => {
      const info = { name: emp.name, id: emp.id, source: 'local_db', salary: emp.salary || 0, department: emp.department || ar('غير محدد', 'Unspecified') }
      if (emp.code) mapping[emp.code] = info
      if (emp.id) mapping[emp.id.toString()] = info
    })
    biometricUsers.forEach(user => {
      const userId = user.userId?.toString()
      if (userId && !mapping[userId]) {
        mapping[userId] = { name: user.name || ar(`موظف ${userId}`, `Employee ${userId}`), id: user.userId, source: 'biometric_device', salary: 0, department: ar('غير محدد', 'Unspecified') }
      }
    })
    setEmployeeMapping(mapping)
  }

  const getEmployeeName = (userId) => {
    const employee = employeeMapping[userId?.toString()]
    return employee ? { ...employee } : { name: ar(`غير معروف (${userId})`, `Unknown (${userId})`), salary: 0, department: '-', source: 'unknown' }
  }

  const fetchAttendanceData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/attendance')
      const result = await res.json()
      if (!result.success) throw new Error(result.message || ar('فشل الاتصال بجهاز البصمة', 'Failed to connect to biometric device'))
      const enhanced = (result.attendance || []).map(record => {
        const info = getEmployeeName(record.userId)
        return { ...record, userName: info.name, salary: info.salary, department: info.department, employeeSource: info.source }
      })
      setAttendance(enhanced)
      toast.success(ar(`تم استيراد ${enhanced.length} حركة من نقاط الوصول`, `Imported ${enhanced.length} records from access points`))
    } catch (err) {
      setError(err.message)
      toast.error(ar('لم يتم الاتصال بالوحدة المركزية للبصمة', 'Could not connect to the central biometric system'))
    } finally { setLoading(false) }
  }

  const refreshData = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchAttendanceData(), fetchBiometricUsers()])
    setIsRefreshing(false)
  }

  const exportToExcel = () => {
    const loadToast = toast.loading(ar('إعداد مصفوفة المخرجات...', 'Preparing export matrix...'))
    try {
      const exportData = filtered.map(row => ({
        [ar('الكود', 'Code')]: row.userId,
        [ar('الكادر', 'Name')]: row.userName,
        [ar('القطاع', 'Department')]: row.department,
        [ar('المصدر', 'Source')]: row.employeeSource === 'local_db' ? ar('القاعدة المحلية', 'Local DB') : row.employeeSource === 'biometric_device' ? ar('وحدة البصمة', 'Device') : ar('مبهم', 'Unknown'),
        [ar('تاريخ الحركة', 'Date')]: row.date,
        [ar('تسجيل دخول', 'Check In')]: row.inTime,
        [ar('تسجيل خروج', 'Check Out')]: row.outTime,
        [ar('مدة التواجد', 'Duration')]: row.workDuration,
        [ar('زمن إضافي', 'Overtime')]: row.overtime,
        [ar('تأخير', 'Late')]: row.late,
        [ar('طريقة المصادقة', 'Method')]: row.verifyMode
      }))
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, ar('تقرير الحضور', 'Attendance Report'))
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      saveAs(new Blob([wbout], { type: "application/octet-stream" }), `LEX-ATTENDANCE_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.dismiss(loadToast)
      toast.success(ar(`تصدير ناجح لـ ${filtered.length} سجل`, `Successfully exported ${filtered.length} records`))
    } catch (err) { toast.dismiss(loadToast); toast.error(ar('أفشل النظام أمر التصدير', 'Export failed')) }
  }

  const filtered = attendance.filter(row => {
    const matchesName = searchName ? row.userName.toLowerCase().includes(searchName.toLowerCase()) : true
    const matchesMonth = searchMonth ? row.date.slice(0, 7).includes(searchMonth) : true
    const matchesDate = viewMode === 'today' ? row.date === selectedDate : true
    return matchesName && matchesMonth && matchesDate
  })

  const todayRecords = attendance.filter(r => r.date === new Date().toISOString().split('T')[0])
  const totalIn = todayRecords.filter(r => r.inTime !== ar('لم يسجل حضور', 'No check-in')).length
  const totalOut = todayRecords.filter(r => r.outTime !== ar('لم يسجل انصراف', 'No check-out')).length
  const totalOvertime = todayRecords.reduce((sum, r) => sum + (r.overtimeMinutes || 0), 0)
  const totalLate = todayRecords.reduce((sum, r) => sum + (r.lateMinutes || 0), 0)

  const formatMinutes = (m) => m >= 60 ? ar(`${Math.floor(m / 60)} س ${m % 60} د`, `${Math.floor(m / 60)}h ${m % 60}m`) : ar(`${m} د`, `${m}m`)

  const handleEmployeeClick = (name) => {
    const records = attendance.filter(r => r.userName === name)
    const present = records.length
    const absent = Math.max(0, 30 - present)
    const avgWorkHours = records.length > 0 ? records.reduce((sum, r) => {
      const match = r.workDuration?.match(/(\d+) ساعة (\d+) دقيقة/)
      return match ? sum + parseInt(match[1]) + parseInt(match[2]) / 60 : sum
    }, 0) / records.length : 0
    setEmployeeStats({
      name, presentDays: present, absentDays: absent,
      totalOvertime: records.reduce((s, r) => s + (r.overtimeMinutes || 0), 0),
      totalLate: records.reduce((s, r) => s + (r.lateMinutes || 0), 0),
      avgWorkHours: avgWorkHours.toFixed(1),
      attendanceRate: present > 0 ? ((present / (present + absent)) * 100).toFixed(1) : 0
    })
    setShowStatsModal(true)
  }

  if (loading) return <ProtectedRoute><Layout><div className="flex items-center justify-center h-64"><div className="spinner"></div></div></Layout></ProtectedRoute>

  if (error) {
    return (
      <ProtectedRoute><Layout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-24 h-24 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6 drop-shadow-md border border-rose-500/20">
            <i className="fas fa-satellite-dish text-4xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">{ar('الارتباط بوحدة البصمة مقطوع', 'Biometric Connection Lost')}</h2>
          <p className="text-slate-400 mb-8">{error}</p>
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 mb-8 max-w-md w-full backdrop-blur-md">
            <h3 className="text-sm font-bold text-slate-300 mb-4 tracking-widest uppercase">{ar('فحص بروتوكول الشبكة', 'Network Check')}</h3>
            <ul className="text-sm text-slate-400 space-y-3">
              <li className="flex gap-2"><i className="fas fa-check-circle text-indigo-400"></i> {ar('تأكد أن جهاز البصمة معزز بالتيار والشبكة', 'Ensure the device is powered and connected')}</li>
              <li className="flex gap-2"><i className="fas fa-check-circle text-indigo-400"></i> {ar('تحقق من عنوان البوابة IP: 192.168.0.201', 'Check gateway IP: 192.168.0.201')}</li>
              <li className="flex gap-2"><i className="fas fa-check-circle text-indigo-400"></i> {ar('تأكد من نفاذية المنفذ 4370 عبر الجدار الناري', 'Ensure port 4370 is open in firewall')}</li>
            </ul>
          </div>
          <button onClick={refreshData} disabled={isRefreshing} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all flex items-center gap-2">
            {isRefreshing ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> {ar('محاولة الاتصال...', 'Connecting...')}</> : <><i className="fas fa-sync-alt"></i> {ar('تجديد النبض', 'Retry Connection')}</>}
          </button>
        </div>
      </Layout></ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="page-title">{ar('رصد البصمة البيومترية', 'Biometric Monitoring')}</h1>
              <p className="page-description">{ar('سجلات حركات الحضور والانصراف المباشرة من نقاط البصمة وأجهزة الوصول', 'Real-time attendance records from biometric devices and access points')}</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <motion.button onClick={refreshData} disabled={isRefreshing}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="btn btn-secondary btn-md">
                {isRefreshing ? (
                  <><div className="w-4 h-4 border-2 border-surface-300 border-t-brand-600 rounded-full animate-spin"></div> {ar('جاري التحديث...', 'Updating...')}</>
                ) : (
                  <><i className="fas fa-sync-alt text-brand-600 text-sm"></i> {ar('مزامنة النبض', 'Sync Data')}</>
                )}
              </motion.button>
              <motion.button onClick={exportToExcel}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="btn btn-primary btn-md">
                <i className="fas fa-download text-sm"></i> {ar('تصدير السجل', 'Export Records')}
              </motion.button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: ar('تاريخ النشاط', 'Activity Date'), value: new Date().toLocaleDateString(L === 'ar' ? 'ar-EG' : 'en-US'), color: "bg-brand-50 text-brand-600 border-brand-100", icon: "fa-calendar-day" },
              { label: ar('تسجيل دخول', 'Check Ins'), value: totalIn, color: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: "fa-door-open" },
              { label: ar('انصراف فعلي', 'Check Outs'), value: totalOut, color: "bg-rose-50 text-rose-600 border-rose-100", icon: "fa-door-closed" },
              { label: ar('الإضافي المعتمد', 'Overtime'), value: formatMinutes(totalOvertime), color: "bg-amber-50 text-amber-600 border-amber-100", icon: "fa-bolt" },
              { label: ar('تزايد التأخير', 'Total Late'), value: formatMinutes(totalLate), color: "bg-violet-50 text-violet-600 border-violet-100", icon: "fa-stopwatch" }
            ].map((s, i) => (
              <div key={i} className="bg-white border border-surface-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color.split(' ')[0]} ${s.color.split(' ')[1]}`}>
                  <i className={`fas ${s.icon} text-lg`}></i>
                </div>
                <div>
                  <p className="text-base font-black text-surface-900 leading-none">{s.value}</p>
                  <p className="text-xs font-bold text-surface-500 mt-1.5">{s.label}</p>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-surface-200 p-5 rounded-2xl flex flex-col lg:flex-row justify-between items-center gap-4 shadow-sm">
            <div className="flex bg-surface-50 p-1 rounded-xl border border-surface-200 flex-wrap sm:flex-nowrap w-full lg:w-auto">
              {[
                { id: 'today', label: ar('النبض اليومي', 'Today'), icon: 'fa-sun' },
                { id: 'all', label: ar('المسار الكامل', 'All Records'), icon: 'fa-infinity' },
                { id: 'monthly', label: ar('السجل الشامل', 'Monthly'), icon: 'fa-calendar-alt' }
              ].map(tab => (
                <button key={tab.id} onClick={() => setViewMode(tab.id)}
                  className={`px-4 py-2 rounded-lg font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 flex-1 sm:flex-none ${viewMode === tab.id ? 'bg-brand-600 text-white shadow-md shadow-brand-600/10' : 'text-surface-500 hover:text-surface-950'}`}>
                  <i className={`fas ${tab.icon}`}></i> {tab.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3 w-full lg:w-auto flex-wrap sm:flex-nowrap">
              {viewMode === 'today' && (
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                  className="input text-xs font-bold py-2 sm:w-auto flex-1 sm:flex-none" />
              )}
              <div className="relative flex-1 sm:w-60">
                <i className="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs pointer-events-none"></i>
                <input type="text" placeholder={ar('ابحث باسم الموظف أو الكود...', 'Search by name or code...')}
                  value={searchName} onChange={e => setSearchName(e.target.value)} className="input pr-9 text-xs" />
              </div>
              {viewMode === 'monthly' && (
                <input type="month" value={searchMonth} onChange={e => setSearchMonth(e.target.value)}
                  className="input text-xs font-bold py-2 sm:w-auto flex-1 sm:flex-none" />
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }} className="table-container">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                  <i className="fas fa-fingerprint text-brand-600 text-sm"></i>
                </div>
                <span className="text-sm font-black text-surface-700">{ar('سجل الوصول البيومتري', 'Biometric Access Log')}</span>
              </div>
              <span className="badge badge-neutral">{ar(`${filtered.length} سجل حركة`, `${filtered.length} records`)}</span>
            </div>

            {filtered.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{ar('الكود', 'Code')}</th>
                      <th>{ar('الكادر البشري', 'Employee')}</th>
                      <th>{ar('طريقة المصادقة', 'Method')}</th>
                      <th>{ar('التاريخ', 'Date')}</th>
                      <th>{ar('الدخول', 'Check In')}</th>
                      <th>{ar('الخروج', 'Check Out')}</th>
                      <th>{ar('إضافي / تأخير', 'Extra / Late')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, i) => (
                      <motion.tr key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.01 }} className="group">
                        <td><span className="font-mono text-xs font-black text-brand-600 bg-brand-50 px-2 py-1 rounded-lg border border-brand-100">{row.userId}</span></td>
                        <td>
                          <button onClick={() => handleEmployeeClick(row.userName)}
                            className="font-black text-surface-900 hover:text-brand-600 transition-colors text-sm text-right flex items-center gap-1.5">
                            {row.userName}
                            {row.employeeSource === 'unknown' && <i className="fas fa-triangle-exclamation text-amber-500 text-xs" title={ar('غير مسجل بالقاعدة الأساسية', 'Not in main database')}></i>}
                          </button>
                          <p className="text-[10px] text-surface-400 font-bold mt-0.5">{row.department}</p>
                        </td>
                        <td><span className="badge badge-neutral text-[10px]">{row.verifyMode}</span></td>
                        <td><span className="text-xs font-bold text-surface-600 font-mono">{row.date}</span></td>
                        <td>
                          {row.inTime === ar('لم يسجل حضور', 'No check-in') ? (
                            <span className="text-rose-600 text-xs font-bold"><i className="fas fa-times-circle text-[10px] mr-0.5"></i> {ar('مفقود', 'Missing')}</span>
                          ) : (
                            <span className="text-emerald-600 font-mono font-black text-sm">{row.inTime}</span>
                          )}
                        </td>
                        <td>
                          {row.outTime === ar('لم يسجل انصراف', 'No check-out') ? (
                            <span className="text-amber-600 text-xs font-bold"><i className="fas fa-clock text-[10px] mr-0.5 animate-pulse"></i> {ar('جاري', 'In Progress')}</span>
                          ) : (
                            <span className="text-rose-600 font-mono font-black text-sm">{row.outTime}</span>
                          )}
                        </td>
                        <td>
                          <div className="flex flex-col gap-1">
                            {row.overtimeMinutes > 0 && (
                              <span className="badge badge-success text-[10px]"><i className="fas fa-plus text-[8px] mr-0.5"></i> {ar('إضافي', 'OT')}: {row.overtime}</span>
                            )}
                            {row.lateMinutes > 0 && (
                              <span className="badge badge-danger text-[10px]"><i className="fas fa-minus text-[8px] mr-0.5"></i> {ar('تأخير', 'Late')}: {row.late}</span>
                            )}
                            {!row.overtimeMinutes && !row.lateMinutes && (
                              <span className="text-surface-400 font-black">—</span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><i className="fas fa-fingerprint text-surface-400"></i></div>
                <h3 className="empty-title">{ar('لا توجد حركات مسجلة', 'No records found')}</h3>
                <p className="empty-desc">{ar('مصفوفة الوصول خالية من أي نشاط بناءً على معايير البحث الحالية.', 'No activity found matching your search criteria.')}</p>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="bg-surface-50 p-4 border-t border-surface-200 flex flex-wrap gap-4 items-center">
                <span className="text-xs font-bold text-surface-500">
                  <span className="inline-block w-2.5 h-2.5 rounded bg-emerald-500 mr-1 align-middle"></span>
                  {ar('تواجد مكتمل', 'Present')}: {filtered.filter(r => r.inTime !== ar('لم يسجل حضور', 'No check-in')).length}
                </span>
                <span className="text-xs font-bold text-surface-500">
                  <span className="inline-block w-2.5 h-2.5 rounded bg-amber-500 mr-1 align-middle"></span>
                  {ar('قيد العمل', 'Working')}: {filtered.filter(r => r.outTime === ar('لم يسجل انصراف', 'No check-out')).length}
                </span>
                <span className="text-xs font-bold text-surface-500">
                  <span className="inline-block w-2.5 h-2.5 rounded bg-brand-500 mr-1 align-middle"></span>
                  {ar('بصمة وصول', 'Biometric')}: {filtered.filter(r => r.employeeSource === 'biometric_device').length}
                </span>
              </div>
            )}
          </motion.div>
        </div>

        <AnimatePresence>
          {showStatsModal && employeeStats && (
            <div className="modal-overlay" onClick={() => setShowStatsModal(false)}>
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} className="modal-panel max-w-sm">
                <div className="modal-header">
                  <div>
                    <h3 className="text-lg font-black text-surface-900">{employeeStats.name}</h3>
                    <p className="text-xs text-surface-500 mt-0.5">{ar('تقرير مفرغات الدورة الحالية', 'Current period report')}</p>
                  </div>
                  <button onClick={() => setShowStatsModal(false)}
                    className="w-9 h-9 rounded-xl bg-surface-50 text-surface-500 hover:bg-surface-100 border border-surface-200 flex items-center justify-center transition-colors">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className="modal-body space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center">
                      <div className="text-emerald-700 text-2xl font-black">{employeeStats.presentDays}</div>
                      <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-1">{ar('أيام الحضور', 'Present Days')}</div>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-center">
                      <div className="text-rose-700 text-2xl font-black">{employeeStats.absentDays}</div>
                      <div className="text-[10px] text-rose-600 font-bold uppercase tracking-wider mt-1">{ar('أيام الغياب', 'Absent Days')}</div>
                    </div>
                  </div>
                  <div className="bg-brand-50 border border-brand-100 p-4 rounded-xl flex items-center justify-between">
                    <span className="text-brand-700 text-xs font-bold">{ar('نسبة الامتثال والالتزام', 'Attendance Rate')}</span>
                    <span className="text-xl font-black text-brand-600">{employeeStats.attendanceRate}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-50 border border-surface-200 p-4 rounded-xl text-center">
                      <div className="text-amber-600 text-sm font-black">{formatMinutes(employeeStats.totalOvertime)}</div>
                      <div className="text-[9px] text-surface-400 font-bold mt-1">{ar('إضافي متراكم', 'Total OT')}</div>
                    </div>
                    <div className="bg-surface-50 border border-surface-200 p-4 rounded-xl text-center">
                      <div className="text-violet-600 text-sm font-black">{formatMinutes(employeeStats.totalLate)}</div>
                      <div className="text-[9px] text-surface-400 font-bold mt-1">{ar('تأخير متراكم', 'Total Late')}</div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer justify-stretch">
                  <button onClick={() => setShowStatsModal(false)} className="btn btn-secondary btn-sm flex-1">
                    {ar('إغلاق النافذة', 'Close')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Layout>
    </ProtectedRoute>
  )
}
