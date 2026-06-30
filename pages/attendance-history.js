import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend,
  ArcElement
)

export default function AttendanceHistory() {
  const { language } = useLanguage()
  const ar = (a, e) => (language === 'ar' ? a : e)
  
  const translateStatus = (status) => {
    if (!status) return ''
    const map = {
      'Present': 'حاضر',
      'Late': 'متأخر',
      'Absent': 'غائب',
      'Absent (Auto)': 'غائب (تلقائي)',
      'Manual': 'حضور يدوي',
      'Missing Check Out': 'نسيان انصراف',
      'Leave': 'إجازة',
      'Holiday': 'عطلة',
      'Weekend': 'عطلة نهاية الأسبوع',
      'Mission': 'مأمورية'
    }
    return language === 'ar' && map[status] ? map[status] : status
  }
  
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState("")
  const [searchMonth, setSearchMonth] = useState(new Date().toISOString().slice(0, 7))
  const [searchDate, setSearchDate] = useState(new Date().toISOString().slice(0, 10))
  const [viewMode, setViewMode] = useState('daily')

  // Pagination
  const [page, setPage] = useState(1)
  const perPage = 10

  useEffect(() => {
    fetchSummaryData()
  }, [])

  const fetchSummaryData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/manual-attendance') 
      const result = await res.json()
      if (result.success) {
        setRecords(result.data || [])
      } else {
        toast.error(result.message || ar('حدث خطأ في جلب البيانات', 'Error fetching data'))
      }
    } catch (err) {
      toast.error('❌ ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const runAutoAbsent = async () => {
    if(!window.confirm(ar('هل أنت متأكد من تشغيل الغياب التلقائي لمن لم يسجل حضور اليوم (بعد 12 ظهراً)؟', 'Are you sure you want to run auto-absent for those who missed check in?'))) return;
    try {
      setLoading(true)
      const res = await fetch('/api/cron/auto-absent', { method: 'POST' })
      const result = await res.json()
      if(result.success) {
        toast.success(result.message)
        fetchSummaryData()
      } else {
        toast.error(result.error || result.message)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredData = useMemo(() => {
    return records.filter(item => {
      const matchName = (item.name || '').toLowerCase().includes(searchName.toLowerCase()) || 
                        String(item.emp_code || '').includes(searchName)
      
      let matchDate = true;
      if (viewMode === 'daily') {
        matchDate = searchDate ? item.date === searchDate : true;
      } else {
        matchDate = searchMonth ? (item.date || '').startsWith(searchMonth) : true;
      }
      
      return matchName && matchDate
    }).sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [records, searchName, searchMonth, searchDate, viewMode])

  const monthlyData = useMemo(() => {
    const map = {}
    filteredData.forEach(r => {
      const monthStr = r.date ? r.date.substring(0, 7) : 'Unknown'
      const empId = r.emp_code || r.employee_id
      const key = `${empId}_${monthStr}`
      
      if(!map[key]) {
        map[key] = {
          emp_code: empId,
          name: r.name,
          monthStr: monthStr,
          attendanceDays: 0,
          absentDays: 0,
          leaveDays: 0,
          totalDelayMinutes: 0
        }
      }
      
      if (['Present', 'Late', 'Manual'].includes(r.status)) map[key].attendanceDays++
      else if (r.status === 'Absent' || r.status === 'Absent (Auto)') map[key].absentDays++
      else if (['Leave', 'Holiday', 'Weekend', 'Mission'].includes(r.status) || r.status?.includes('إجازة')) map[key].leaveDays++
      
      map[key].totalDelayMinutes += (r.late_minutes || 0)
    })
    return Object.values(map)
  }, [filteredData])

  // Calculations for Charts and Metrics
  const stats = useMemo(() => {
    let totalWorkingMinutes = 0
    let totalDelayMinutes = 0
    let attendanceDays = 0
    let delayDays = 0
    let absentDays = 0

    // For Trend Chart (Daily stats)
    const dailyMap = {}

    filteredData.forEach(r => {
      totalWorkingMinutes += r.working_minutes || 0
      totalDelayMinutes += r.late_minutes || 0
      
      if (!dailyMap[r.date]) {
        dailyMap[r.date] = { present: 0, absent: 0, late: 0 }
      }

      if (['Present', 'Late', 'Manual'].includes(r.status)) {
        attendanceDays++
        dailyMap[r.date].present++
      }
      if (r.status === 'Absent' || r.status === 'Absent (Auto)') {
        absentDays++
        dailyMap[r.date].absent++
      }
      if ((r.late_minutes || 0) > 0) {
        delayDays++
        dailyMap[r.date].late++
      }
    })

    const workingHours = Math.floor(totalWorkingMinutes / 60)
    const delayHours = Math.floor(totalDelayMinutes / 60)
    const delayMins = totalDelayMinutes % 60
    
    const totalDays = attendanceDays + absentDays
    const healthScore = totalDays > 0 ? Math.round((attendanceDays / totalDays) * 100) : 100

    // Chart Data Preparation
    const sortedDates = Object.keys(dailyMap).sort()
    const chartData = {
      labels: sortedDates,
      datasets: [
        {
          label: ar('حاضر', 'Present'),
          data: sortedDates.map(d => dailyMap[d].present),
          backgroundColor: '#10b981', // emerald-500
          borderRadius: 4
        },
        {
          label: ar('غائب', 'Absent'),
          data: sortedDates.map(d => dailyMap[d].absent),
          backgroundColor: '#f43f5e', // rose-500
          borderRadius: 4
        }
      ]
    }

    return {
      workingHours,
      totalDelayMinutes,
      delayFormatted: `${delayHours}h ${delayMins}m`,
      attendanceDays,
      delayDays,
      absentDays,
      healthScore,
      chartData
    }
  }, [filteredData])

  const totalPages = Math.max(1, Math.ceil(filteredData.length / perPage))
  const currentSlice = filteredData.slice((page - 1) * perPage, page * perPage)

  const exportToExcel = () => {
    try {
      const dataSheet = filteredData.map(r => ({
        [ar('الكود', 'Code')]: r.emp_code || r.employee_id,
        [ar('الاسم', 'Name')]: r.name,
        [ar('التاريخ', 'Date')]: r.date,
        [ar('الحضور', 'Check In')]: r.first_check_in,
        [ar('الانصراف', 'Check Out')]: r.last_check_out,
        [ar('ساعات العمل', 'Working Hours')]: r.working_minutes ? (r.working_minutes / 60).toFixed(2) : 0,
        [ar('دقائق التأخير', 'Late Minutes')]: r.late_minutes || 0,
        [ar('الحالة', 'Status')]: r.status,
      }))
      const ws = XLSX.utils.json_to_sheet(dataSheet)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Attendance_Insights")
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' })
      saveAs(data, `Attendance_Insights_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success(ar('تم التصدير بنجاح', 'Exported successfully'))
    } catch (err) {
      toast.error(ar('حدث خطأ أثناء التصدير', 'Error exporting data'))
    }
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 px-4 sm:px-6 lg:px-8 font-sans transition-colors relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto space-y-8 relative z-10">
            
            {/* Ultra Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl p-6 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white/50 dark:border-slate-700/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                   <i className="fas fa-chart-pie text-xl text-white"></i>
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                    {ar('تحليلات الحضور المتقدمة', 'Advanced Attendance Analytics')}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm font-medium">
                    {ar('رؤى تفصيلية ومؤشرات ذكية لأداء الموظفين وانضباطهم.', 'Detailed insights and smart indicators for employee discipline.')}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={runAutoAbsent}
                  className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-rose-500/30 active:scale-95 flex items-center gap-3"
                >
                  <i className="fas fa-magic"></i>
                  {ar('توليد الغياب (12م)', 'Auto-Absent (12PM)')}
                </button>
                <button 
                  onClick={exportToExcel}
                  className="px-6 py-3 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-2xl font-bold transition-all shadow-sm active:scale-95 flex items-center gap-3"
                >
                  <i className="fas fa-file-excel text-emerald-500"></i>
                  {ar('تصدير التقرير', 'Export Report')}
                </button>
              </div>
            </div>

            {/* Smart Dashboard Layout */}
            <div className="space-y-6">
              
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-500/20">
                    <i className="fas fa-stopwatch text-indigo-500 text-xl mb-3"></i>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">{ar('ساعات العمل', 'Working Hrs')}</p>
                    <h4 className="text-2xl font-black text-slate-800 dark:text-white">{stats.workingHours}</h4>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-3xl border border-amber-100 dark:border-amber-500/20">
                    <i className="fas fa-clock text-amber-500 text-xl mb-3"></i>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">{ar('دقائق التأخير', 'Late Mins')}</p>
                    <h4 className="text-2xl font-black text-slate-800 dark:text-white">{stats.totalDelayMinutes}</h4>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-500/20">
                    <i className="fas fa-calendar-check text-emerald-500 text-xl mb-3"></i>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">{ar('أيام الحضور', 'Present Days')}</p>
                    <h4 className="text-2xl font-black text-slate-800 dark:text-white">{stats.attendanceDays}</h4>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-900/20 p-5 rounded-3xl border border-rose-100 dark:border-rose-500/20">
                    <i className="fas fa-calendar-times text-rose-500 text-xl mb-3"></i>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">{ar('أيام الغياب', 'Absent Days')}</p>
                    <h4 className="text-2xl font-black text-slate-800 dark:text-white">{stats.absentDays}</h4>
                  </div>
              </div>

              {/* Filters */}
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-sm border border-white/40 dark:border-slate-700/50 flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <i className="fas fa-search absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input
                      type="text"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border-0 ring-1 ring-slate-200 dark:ring-slate-700 rounded-2xl py-4 pr-12 pl-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                      placeholder={ar('ابحث باسم الموظف أو كوده...', 'Search employee name or code...')}
                    />
                  </div>
                  <div className="w-full md:w-64">
                    {viewMode === 'daily' ? (
                      <input
                        type="date"
                        value={searchDate}
                        onChange={(e) => setSearchDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border-0 ring-1 ring-slate-200 dark:ring-slate-700 rounded-2xl py-4 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium font-mono"
                      />
                    ) : (
                      <input
                        type="month"
                        value={searchMonth}
                        onChange={(e) => setSearchMonth(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border-0 ring-1 ring-slate-200 dark:ring-slate-700 rounded-2xl py-4 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium font-mono"
                      />
                    )}
                  </div>
                </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex justify-center mb-6 relative z-20">
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-1.5 rounded-2xl inline-flex shadow-sm border border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => setViewMode('daily')}
                  className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${viewMode === 'daily' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                >
                  <i className="fas fa-calendar-day ml-2"></i>
                  {ar('اليوميات', 'Daily')}
                </button>
                <button 
                  onClick={() => setViewMode('monthly')}
                  className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${viewMode === 'monthly' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                >
                  <i className="fas fa-calendar-alt ml-2"></i>
                  {ar('ملخص الشهر', 'Monthly')}
                </button>
              </div>
            </div>

            {/* Premium Table */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white/40 dark:border-slate-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  <thead className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-5 px-6 text-slate-400 font-bold text-xs uppercase tracking-wider">{ar('الموظف', 'Employee')}</th>
                      <th className="py-5 px-6 text-slate-400 font-bold text-xs uppercase tracking-wider">{viewMode === 'monthly' ? ar('الشهر', 'Month') : ar('التاريخ', 'Date')}</th>
                      {viewMode === 'daily' ? (
                        <>
                          <th className="py-5 px-6 text-slate-400 font-bold text-xs uppercase tracking-wider">{ar('التوقيت (دخول - خروج)', 'Time (IN - OUT)')}</th>
                          <th className="py-5 px-6 text-slate-400 font-bold text-xs uppercase tracking-wider">{ar('إحصائيات (عمل - تأخير)', 'Stats (Wrk - Late)')}</th>
                          <th className="py-5 px-6 text-slate-400 font-bold text-xs uppercase tracking-wider">{ar('الحالة', 'Status')}</th>
                        </>
                      ) : (
                        <>
                          <th className="py-5 px-6 text-slate-400 font-bold text-xs uppercase tracking-wider">{ar('أيام الحضور', 'Present')}</th>
                          <th className="py-5 px-6 text-slate-400 font-bold text-xs uppercase tracking-wider">{ar('أيام الغياب', 'Absent')}</th>
                          <th className="py-5 px-6 text-slate-400 font-bold text-xs uppercase tracking-wider">{ar('أيام الإجازات', 'Leave')}</th>
                          <th className="py-5 px-6 text-slate-400 font-bold text-xs uppercase tracking-wider">{ar('ساعات التأخير', 'Late Hours')}</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {loading ? (
                      <tr><td colSpan={viewMode === 'daily' ? 5 : 6} className="py-20 text-center"><i className="fas fa-spinner fa-spin text-4xl text-indigo-500 mb-4"></i><p className="text-slate-500 font-bold">{ar('جاري تحميل وتحليل البيانات...', 'Loading & Analyzing data...')}</p></td></tr>
                    ) : (viewMode === 'daily' ? currentSlice : monthlyData).length > 0 ? (
                      (viewMode === 'daily' ? currentSlice : monthlyData).map((record, idx) => (
                        <motion.tr 
                          initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: idx*0.05}}
                          key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group"
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-lg shadow-sm border border-white dark:border-slate-700 group-hover:scale-110 transition-transform">
                                  {record.name?.charAt(0) || 'U'}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 bg-emerald-500" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200">{record.name || ar('غير معروف', 'Unknown')}</h4>
                                <p className="text-xs text-slate-400 font-mono">#{record.emp_code || record.employee_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-slate-600 dark:text-slate-400 font-medium">{viewMode === 'monthly' ? record.monthStr : record.date}</td>
                          
                          {viewMode === 'daily' ? (
                            <>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                  <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-bold border border-emerald-100 dark:border-emerald-800/30">
                                    <i className="fas fa-arrow-right mr-1 ml-1 text-xs opacity-50"></i>{record.first_check_in || '--:--'}
                                  </span>
                                  <span className="text-slate-300">-</span>
                                  <span className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-bold border border-rose-100 dark:border-rose-800/30">
                                    {record.last_check_out || '--:--'} <i className="fas fa-arrow-left mr-1 ml-1 text-xs opacity-50"></i>
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                 <div className="flex flex-col gap-1">
                                   <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                     <i className="fas fa-briefcase opacity-50 mr-1 ml-1"></i>
                                     {record.working_minutes ? (record.working_minutes / 60).toFixed(1) + 'h' : '0h'}
                                   </div>
                                   {record.late_minutes > 0 && (
                                     <div className="text-xs font-bold text-amber-500">
                                       <i className="fas fa-exclamation-circle opacity-50 mr-1 ml-1"></i>
                                       {record.late_minutes}m Late
                                     </div>
                                   )}
                                 </div>
                              </td>
                              <td className="py-4 px-6">
                                <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black shadow-sm
                                  ${['Present', 'Manual'].includes(record.status) ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white' : 
                                    record.status === 'Late' ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white' : 
                                    'bg-gradient-to-r from-rose-400 to-rose-500 text-white'}`}>
                                  {translateStatus(record.status)}
                                </span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-4 px-6 font-black text-emerald-500 text-lg">{record.attendanceDays}</td>
                              <td className="py-4 px-6 font-black text-rose-500 text-lg">{record.absentDays}</td>
                              <td className="py-4 px-6 font-black text-indigo-400 text-lg">{record.leaveDays}</td>
                              <td className="py-4 px-6 font-black text-amber-500 text-lg">{(record.totalDelayMinutes / 60).toFixed(1)}h</td>
                            </>
                          )}
                        </motion.tr>
                      ))
                    ) : (
                      <tr><td colSpan={viewMode === 'daily' ? 5 : 6} className="py-20 text-center"><div className="w-24 h-24 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4"><i className="fas fa-folder-open text-3xl text-slate-400"></i></div><h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">{ar('لا توجد بيانات مطابقة', 'No records found')}</h3></td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Elegant Pagination */}
              {totalPages > 1 && (
                <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <button 
                    disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    <i className={`fas fa-chevron-${language === 'ar' ? 'right' : 'left'} ${language === 'ar' ? 'ml-2' : 'mr-2'} opacity-50`}></i>
                    {ar('السابق', 'Previous')}
                  </button>
                  <div className="flex gap-2">
                    {[...Array(totalPages)].map((_, i) => (
                      <button key={i} onClick={() => setPage(i+1)} className={`w-10 h-10 rounded-xl font-bold transition-all ${page === i+1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                        {i+1}
                      </button>
                    ))}
                  </div>
                  <button 
                    disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                    className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    {ar('التالي', 'Next')}
                    <i className={`fas fa-chevron-${language === 'ar' ? 'left' : 'right'} ${language === 'ar' ? 'mr-2' : 'ml-2'} opacity-50`}></i>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
