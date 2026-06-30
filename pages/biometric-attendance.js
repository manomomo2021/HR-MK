import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { formatCurrency, CURRENCIES } from '../utils/currency'

export default function BiometricAttendance() {
  const { language } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchName, setSearchName] = useState("")
  const [searchMonth, setSearchMonth] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [employeeStats, setEmployeeStats] = useState(null)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState('today')

  useEffect(() => { fetchAttendanceData() }, [])

  const fetchAttendanceData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/attendance')
      const result = await res.json()
      if (!result.success) throw new Error(result.message || ar('تعذر جلب البيانات من جهاز البصمة', 'Failed to fetch data'))
      setAttendance(result.attendance || [])
      toast.success(ar('✅ تم تحديث بيانات الحضور من جهاز البصمة', '✅ Attendance data updated'))
    } catch (err) { setError(err.message); toast.error(ar('❌ ', '❌ ') + err.message) }
    finally { setLoading(false) }
  }

  const refreshData = async () => { setIsRefreshing(true); await fetchAttendanceData(); setIsRefreshing(false) }

  const exportToExcel = () => {
    try {
      const loadingToast = toast.loading(ar('جاري تصدير البيانات...', 'Exporting data...'))
      const dataSheet = filtered.map(r => ({
        [ar('كود الموظف', 'Code')]: r.userId,
        [ar('اسم الموظف', 'Name')]: r.userName,
        [ar('التاريخ', 'Date')]: r.date,
        [ar('وقت الحضور', 'Check In')]: r.inTime,
        [ar('وقت الانصراف', 'Check Out')]: r.outTime,
        [ar('مدة العمل', 'Duration')]: r.workDuration,
        [ar('الوقت الإضافي', 'Overtime')]: r.overtime,
        [ar('التأخير', 'Late')]: r.late,
        [ar('طريقة التحقق', 'Method')]: r.verifyMode
      }))
      const ws = XLSX.utils.json_to_sheet(dataSheet)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, ar('تقرير الحضور', 'Attendance Report'))
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.dismiss(loadingToast)
      toast.success(ar(`تم تصدير ${filtered.length} سجل بنجاح`, `Exported ${filtered.length} records`))
    } catch (e) { toast.error(ar('حدث خطأ أثناء تصدير البيانات', 'Export error')) }
  }

  const filtered = attendance.filter(row => {
    const matchesName = searchName ? row.userName.toLowerCase().includes(searchName.toLowerCase()) : true
    const matchesMonth = searchMonth ? row.date.slice(0, 7).includes(searchMonth) : true
    const matchesDate = viewMode === 'today' ? row.date === selectedDate : true
    return matchesName && matchesMonth && matchesDate
  })

  const todayISO = new Date().toISOString().split('T')[0]
  const todayRecords = attendance.filter(r => r.date === todayISO)
  const totalIn = todayRecords.filter(r => r.inTime !== ar('لم يسجل حضور', 'No check-in')).length
  const totalOut = todayRecords.filter(r => r.outTime !== ar('لم يسجل انصراف', 'No check-out')).length
  const totalOvertime = todayRecords.reduce((sum, r) => sum + (r.overtimeMinutes || 0), 0)
  const totalLate = todayRecords.reduce((sum, r) => sum + (r.lateMinutes || 0), 0)

  const formatMinutes = (m) => m >= 60 ? ar(`${Math.floor(m / 60)} س ${m % 60} د`, `${Math.floor(m / 60)}h ${m % 60}m`) : ar(`${m} د`, `${m}m`)

  const handleEmployeeClick = (name) => {
    const records = attendance.filter(r => r.userName === name)
    const presentDays = records.length
    const absentDays = Math.max(0, 30 - presentDays)
    setEmployeeStats({ name, presentDays, absentDays, totalOvertime: records.reduce((s, r) => s + (r.overtimeMinutes || 0), 0), totalLate: records.reduce((s, r) => s + (r.lateMinutes || 0), 0), attendanceRate: presentDays > 0 ? ((presentDays / (presentDays + absentDays)) * 100).toFixed(1) : 0 })
    setShowStatsModal(true)
  }

  if (loading) return <ProtectedRoute><Layout><div className="flex items-center justify-center h-64"><div className="spinner"></div></div></Layout></ProtectedRoute>

  if (error) {
    return <ProtectedRoute><Layout>
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-24 h-24 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6 border border-rose-500/20">
          <i className="fas fa-satellite-dish text-4xl"></i>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{ar('خطأ في الاتصال', 'Connection Error')}</h2>
        <p className="text-slate-400 mb-8">{error}</p>
        <button onClick={refreshData} disabled={isRefreshing} className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2">
          {isRefreshing ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> {ar('محاولة الاتصال...', 'Connecting...')}</> : <><i className="fas fa-sync-alt"></i> {ar('إعادة المحاولة', 'Retry')}</>}
        </button>
      </div>
    </Layout></ProtectedRoute>
  }

  return (
    <ProtectedRoute>
      <Layout>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <i className="fas fa-fingerprint text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">{ar('نظام الحضور والانصراف', 'Attendance System')}</h1>
                <p className="text-slate-400 text-sm mt-0.5">{ar('بيانات مباشرة من جهاز البصمة', 'Live data from biometric devices')}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <motion.button onClick={refreshData} disabled={isRefreshing} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="btn btn-secondary btn-md">
                {isRefreshing ? <><div className="w-4 h-4 border-2 border-surface-300 border-t-brand-600 rounded-full animate-spin"></div> {ar('جاري التحديث...', 'Updating...')}</> : <><i className="fas fa-sync-alt"></i> {ar('تحديث البيانات', 'Refresh')}</>}
              </motion.button>
              <motion.button onClick={exportToExcel} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="btn btn-primary btn-md">
                <i className="fas fa-download"></i> {ar('تصدير Excel', 'Export Excel')}
              </motion.button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              { label: ar('تاريخ اليوم', 'Date'), value: new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US'), color: "bg-brand-50 text-brand-600 border-brand-100", icon: "fas fa-calendar-day" },
              { label: ar('الحضور اليوم', 'Present'), value: totalIn, color: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: "fas fa-user-check" },
              { label: ar('الانصراف اليوم', 'Check Out'), value: totalOut, color: "bg-rose-50 text-rose-600 border-rose-100", icon: "fas fa-sign-out-alt" },
              { label: ar('الوقت الإضافي', 'Overtime'), value: formatMinutes(totalOvertime), color: "bg-amber-50 text-amber-600 border-amber-100", icon: "fas fa-clock" },
              { label: ar('إجمالي التأخير', 'Total Late'), value: formatMinutes(totalLate), color: "bg-orange-50 text-orange-600 border-orange-100", icon: "fas fa-exclamation-triangle" },
              { label: ar('إجمالي السجلات', 'Total Records'), value: attendance.length, color: "bg-violet-50 text-violet-600 border-violet-100", icon: "fas fa-database" }
            ].map((card, idx) => (
              <div key={idx} className="bg-white border border-surface-200 p-4 rounded-xl flex flex-col justify-between shadow-sm">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.color.split(' ')[0]} ${card.color.split(' ')[1]} border ${card.color.split(' ')[2]} mb-3`}>
                  <i className={`${card.icon} text-sm`}></i>
                </div>
                <div><p className="text-xs font-bold text-surface-500">{card.label}</p><p className="text-base font-black text-surface-900 mt-0.5">{card.value}</p></div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-surface-200 p-4 rounded-2xl shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex bg-surface-50 p-1 rounded-xl border border-surface-200 gap-1 self-stretch lg:self-auto">
                {[
                  { key: 'today', label: ar('اليوم', 'Today'), icon: 'fas fa-calendar-day' },
                  { key: 'all', label: ar('جميع البيانات', 'All'), icon: 'fas fa-list' },
                  { key: 'monthly', label: ar('شهري', 'Monthly'), icon: 'fas fa-calendar-alt' }
                ].map(mode => (
                  <button key={mode.key} type="button" onClick={() => setViewMode(mode.key)}
                    className={`flex-1 lg:flex-none px-4 py-2 rounded-lg font-black text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap ${viewMode === mode.key ? 'bg-white text-brand-600 shadow-sm border border-surface-200' : 'text-surface-500 hover:text-surface-950'}`}>
                    <i className={`${mode.icon} text-[10px]`}></i><span>{mode.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {viewMode === 'today' && <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="input text-xs font-bold w-full sm:w-auto text-center" />}
                <input type="text" placeholder={ar('🔍 بحث باسم الموظف...', '🔍 Search by name...')} value={searchName} onChange={e => setSearchName(e.target.value)} className="input text-xs font-bold w-full sm:w-64" />
                {viewMode === 'monthly' && <input type="month" value={searchMonth} onChange={e => setSearchMonth(e.target.value)} className="input text-xs font-bold w-full sm:w-auto text-center" />}
              </div>
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface-50 border-b border-surface-200 text-surface-700">
                      <th className="px-4 py-3.5 text-right font-black text-xs">{ar('كود الموظف', 'Code')}</th>
                      <th className="px-4 py-3.5 text-right font-black text-xs">{ar('اسم الموظف', 'Name')}</th>
                      <th className="px-4 py-3.5 text-right font-black text-xs">{ar('التاريخ', 'Date')}</th>
                      <th className="px-4 py-3.5 text-right font-black text-xs">{ar('وقت الحضور', 'Check In')}</th>
                      <th className="px-4 py-3.5 text-right font-black text-xs">{ar('وقت الانصراف', 'Check Out')}</th>
                      <th className="px-4 py-3.5 text-right font-black text-xs">{ar('مدة العمل', 'Duration')}</th>
                      <th className="px-4 py-3.5 text-right font-black text-xs">{ar('الوقت الإضافي', 'Overtime')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {filtered.map((row, i) => (
                      <motion.tr key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.01 }} className="hover:bg-surface-50/50 transition-colors">
                        <td className="px-4 py-4 font-mono font-bold text-xs text-surface-600">{row.userId}</td>
                        <td className="px-4 py-4"><button onClick={() => handleEmployeeClick(row.userName)} className="text-xs font-black text-brand-600 hover:text-brand-800 transition-colors text-right">{row.userName}</button></td>
                        <td className="px-4 py-4 font-mono text-xs text-surface-600">{row.date}</td>
                        <td className="px-4 py-4"><span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${row.inTime === ar('لم يسجل حضور', 'No check-in') ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>{row.inTime}</span></td>
                        <td className="px-4 py-4"><span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${row.outTime === ar('لم يسجل انصراف', 'No check-out') ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>{row.outTime}</span></td>
                        <td className="px-4 py-4 font-mono text-xs text-surface-600">{row.workDuration}</td>
                        <td className="px-4 py-4"><span className={`font-bold text-xs font-mono ${row.overtimeMinutes > 0 ? 'text-emerald-600' : 'text-surface-400'}`}>{row.overtime}</span></td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-surface-50 border-t border-surface-200 px-6 py-4">
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold text-surface-500">
                  <span>{ar('إجمالي السجلات:', 'Total:')} <strong className="text-surface-900 font-black">{filtered.length}</strong></span>
                  <span>{ar('الحضور:', 'Present:')} <strong className="text-emerald-600 font-black">{filtered.filter(r => r.inTime !== ar('لم يسجل حضور', 'No check-in')).length}</strong></span>
                  <span>{ar('الانصراف:', 'Check Out:')} <strong className="text-brand-600 font-black">{filtered.filter(r => r.outTime !== ar('لم يسجل انصراف', 'No check-out')).length}</strong></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state"><div className="empty-icon"><i className="fas fa-search"></i></div><h3 className="empty-title">{ar('لا توجد سجلات حضور', 'No records found')}</h3><p className="empty-desc">{ar('لم يتم العثور على أي حركات متزامنة للفترة المحددة.', 'No records found for the selected period.')}</p></div>
          )}

          <AnimatePresence>
            {showStatsModal && employeeStats && (
              <div className="modal-overlay" onClick={() => setShowStatsModal(false)}>
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-panel max-w-sm" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 border border-brand-100"><i className="fas fa-user-chart"></i></div>
                      <div><h3 className="text-base font-black text-surface-900">{employeeStats.name}</h3><p className="text-xs text-surface-500 font-bold mt-0.5">{ar('ملخص تحليلي للحضور الشهري', 'Monthly Attendance Summary')}</p></div></div>
                    <button onClick={() => setShowStatsModal(false)} className="w-9 h-9 rounded-xl bg-surface-50 text-surface-500 hover:bg-surface-100 border border-surface-200 flex items-center justify-center transition-colors"><i className="fas fa-times text-sm"></i></button>
                  </div>
                  <div className="modal-body space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl"><div className="text-xl font-black text-emerald-600">{employeeStats.presentDays}</div><div className="text-xs font-bold text-emerald-800 mt-1">{ar('أيام الحضور', 'Present Days')}</div></div>
                      <div className="text-center p-3 bg-rose-50/50 border border-rose-100 rounded-xl"><div className="text-xl font-black text-rose-600">{employeeStats.absentDays}</div><div className="text-xs font-bold text-rose-800 mt-1">{ar('أيام الغياب', 'Absent Days')}</div></div>
                    </div>
                    <div className="p-4 bg-brand-50/30 border border-brand-100 rounded-xl text-center"><div className="text-2xl font-black text-brand-600">{employeeStats.attendanceRate}%</div><div className="text-xs font-bold text-brand-800 mt-1">{ar('نسبة التزام الحضور', 'Attendance Rate')}</div></div>
                  </div>
                  <div className="modal-footer"><button onClick={() => setShowStatsModal(false)} className="w-full btn btn-primary btn-md">{ar('إغلاق', 'Close')}</button></div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </Layout>
    </ProtectedRoute>
  )
}
