import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import { motion, AnimatePresence } from 'framer-motion'
import { useData } from '../contexts/DataContext'
import { useLanguage } from '../contexts/LanguageContext'
import toast from 'react-hot-toast'

// ── Animation variants ──
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } }
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
}

// ── Event type display config ──
const EVENT_DISPLAY = {
  CHECK_IN: { icon: 'fa-door-open', color: 'from-emerald-400 to-emerald-500', textAr: 'تسجيل دخول', textEn: 'Check In', bg: 'bg-emerald-50', txt: 'text-emerald-600' },
  CHECK_OUT: { icon: 'fa-door-closed', color: 'from-rose-400 to-rose-500', textAr: 'تسجيل خروج', textEn: 'Check Out', bg: 'bg-rose-50', txt: 'text-rose-600' },
  BREAK_START: { icon: 'fa-mug-saucer', color: 'from-amber-400 to-amber-500', textAr: 'بداية استراحة', textEn: 'Break Start', bg: 'bg-amber-50', txt: 'text-amber-600' },
  BREAK_END: { icon: 'fa-mug-saucer', color: 'from-amber-400 to-amber-500', textAr: 'نهاية استراحة', textEn: 'Break End', bg: 'bg-amber-50', txt: 'text-amber-600' },
  MISSION_START: { icon: 'fa-plane', color: 'from-sky-400 to-sky-500', textAr: 'بداية مهمة', textEn: 'Mission Start', bg: 'bg-sky-50', txt: 'text-sky-600' },
  MISSION_END: { icon: 'fa-plane', color: 'from-sky-400 to-sky-500', textAr: 'نهاية مهمة', textEn: 'Mission End', bg: 'bg-sky-50', txt: 'text-sky-600' },
  REMOTE_START: { icon: 'fa-house-laptop', color: 'from-violet-400 to-violet-500', textAr: 'بداية عمل عن بعد', textEn: 'Remote Start', bg: 'bg-violet-50', txt: 'text-violet-600' },
  REMOTE_END: { icon: 'fa-house-laptop', color: 'from-violet-400 to-violet-500', textAr: 'نهاية عمل عن بعد', textEn: 'Remote End', bg: 'bg-violet-50', txt: 'text-violet-600' },
  OVERTIME_START: { icon: 'fa-bolt', color: 'from-orange-400 to-orange-500', textAr: 'بداية إضافي', textEn: 'OT Start', bg: 'bg-orange-50', txt: 'text-orange-600' },
  OVERTIME_END: { icon: 'fa-bolt', color: 'from-orange-400 to-orange-500', textAr: 'نهاية إضافي', textEn: 'OT End', bg: 'bg-orange-50', txt: 'text-orange-600' },
  MANUAL_ADJUSTMENT: { icon: 'fa-pen', color: 'from-slate-400 to-slate-500', textAr: 'تعديل يدوي', textEn: 'Manual Adjustment', bg: 'bg-slate-50', txt: 'text-slate-600' },
  ABSENT_AUTO: { icon: 'fa-calendar-xmark', color: 'from-red-400 to-red-500', textAr: 'غائب (تلقائي)', textEn: 'Absent (Auto)', bg: 'bg-red-50', txt: 'text-red-600' },
  LEAVE_APPROVED: { icon: 'fa-umbrella-beach', color: 'from-blue-400 to-blue-500', textAr: 'إجازة', textEn: 'On Leave', bg: 'bg-blue-50', txt: 'text-blue-600' },
  HOLIDAY: { icon: 'fa-star', color: 'from-yellow-400 to-yellow-500', textAr: 'إجازة رسمية', textEn: 'Holiday', bg: 'bg-yellow-50', txt: 'text-yellow-600' },
  WEEKEND: { icon: 'fa-bed', color: 'from-gray-400 to-gray-500', textAr: 'عطلة أسبوعية', textEn: 'Weekend', bg: 'bg-gray-50', txt: 'text-gray-600' },
  BIOMETRIC: { icon: 'fa-fingerprint', color: 'from-indigo-400 to-indigo-500', textAr: 'بصمة', textEn: 'Biometric', bg: 'bg-indigo-50', txt: 'text-indigo-600' },
  GPS_CHECKIN: { icon: 'fa-location-dot', color: 'from-emerald-400 to-teal-500', textAr: 'تسجيل عبر GPS', textEn: 'GPS Check In', bg: 'bg-emerald-50', txt: 'text-emerald-600' },
  GPS_CHECKOUT: { icon: 'fa-location-dot', color: 'from-rose-400 to-rose-500', textAr: 'انصراف عبر GPS', textEn: 'GPS Check Out', bg: 'bg-rose-50', txt: 'text-rose-600' },
}

// ── Status display config ──
const STATUS_DISPLAY = {
  'Present': { icon: 'fa-check-circle', color: 'text-emerald-600', bg: 'bg-emerald-50', textAr: 'حاضر', textEn: 'Present' },
  'Absent': { icon: 'fa-times-circle', color: 'text-red-600', bg: 'bg-red-50', textAr: 'غائب', textEn: 'Absent' },
  'Late': { icon: 'fa-clock', color: 'text-amber-600', bg: 'bg-amber-50', textAr: 'متأخر', textEn: 'Late' },
  'On Leave': { icon: 'fa-umbrella-beach', color: 'text-blue-600', bg: 'bg-blue-50', textAr: 'في إجازة', textEn: 'On Leave' },
  'Holiday': { icon: 'fa-star', color: 'text-yellow-600', bg: 'bg-yellow-50', textAr: 'إجازة رسمية', textEn: 'Holiday' },
  'Weekend': { icon: 'fa-bed', color: 'text-gray-500', bg: 'bg-gray-50', textAr: 'عطلة', textEn: 'Weekend' },
  'Missing Check In': { icon: 'fa-question-circle', color: 'text-orange-600', bg: 'bg-orange-50', textAr: 'لم يسجل حضور', textEn: 'Missing Check In' },
  'Missing Check Out': { icon: 'fa-hourglass-half', color: 'text-sky-600', bg: 'bg-sky-50', textAr: 'لم يسجل انصراف', textEn: 'Missing Check Out' },
  'Remote': { icon: 'fa-house-laptop', color: 'text-violet-600', bg: 'bg-violet-50', textAr: 'عن بعد', textEn: 'Remote' },
  'Mission': { icon: 'fa-plane', color: 'text-indigo-600', bg: 'bg-indigo-50', textAr: 'مهمة', textEn: 'Mission' },
}

// ─── Event Timeline Item ───
const TimelineItem = ({ event, ar, isLast }) => {
  const display = EVENT_DISPLAY[event.event_type] || { icon: 'fa-circle', color: 'from-gray-400 to-gray-500', textAr: event.event_type, textEn: event.event_type, bg: 'bg-gray-50', txt: 'text-gray-600' }
  return (
    <div className="relative flex items-start gap-4 group">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute right-[18px] top-10 bottom-0 w-0.5 bg-gradient-to-b from-brand-200 to-surface-200" />
      )}
      {/* Timeline Dot */}
      <div className={`relative flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${display.bg} ${display.txt} shadow-sm border border-white`}>
        <i className={`fas ${display.icon} text-xs`}></i>
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-surface-800">{display.textAr}</span>
            {event.source && (
              <span className="text-[10px] font-bold text-surface-400 mr-2 bg-surface-50 px-1.5 py-0.5 rounded">
                {event.source}
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-surface-500 tabular-nums font-mono">{event.time}</span>
        </div>
        {event.notes && (
          <p className="text-[11px] text-surface-400 mt-0.5">{event.notes}</p>
        )}
        {event.device_name && (
          <p className="text-[10px] text-surface-400 mt-0.5">
            <i className="fas fa-microchip ml-1"></i>{event.device_name}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Enterprise Attendance Dashboard ──
export default function EnterpriseAttendance() {
  const { employees } = useData()
  const { language } = useLanguage()
  const L = language
  const ar = (a, e) => L === 'ar' ? a : e

  const [dashboardData, setDashboardData] = useState(null)
  const [events, setEvents] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const [loading, setLoading] = useState(true)
  const [showTimelineModal, setShowTimelineModal] = useState(false)
  const [timelineEmployee, setTimelineEmployee] = useState(null)
  const [timelineEvents, setTimelineEvents] = useState([])
  const [showEventModal, setShowEventModal] = useState(false)
  const [eventForm, setEventForm] = useState({
    employee_id: '',
    event_type: 'CHECK_IN',
    source: 'MANUAL',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    notes: '',
    reason: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [summaryDate, setSummaryDate] = useState(new Date().toISOString().split('T')[0])
  const [dailySummaries, setDailySummaries] = useState([])

  const [activeTab, setActiveTab] = useState('dashboard')

  const fetchDashboard = async (date) => {
    try {
      const res = await fetch(`/api/attendance-summary?stats=1&date=${date || selectedDate}`)
      const result = await res.json()
      if (result.success) setDashboardData(result.data)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    }
  }

  const fetchEvents = async (employeeId, date) => {
    try {
      let url = `/api/attendance-events?limit=100`
      if (employeeId) url += `&employee=${employeeId}`
      if (date) url += `&date=${date}`
      const res = await fetch(url)
      const result = await res.json()
      if (result.success) setEvents(result.data || [])
    } catch (err) {
      console.error('Events fetch error:', err)
    }
  }

  const fetchDailySummaries = async (date) => {
    try {
      const res = await fetch(`/api/attendance-summary?date=${date || selectedDate}`)
      const result = await res.json()
      if (result.success) setDailySummaries(result.data || [])
    } catch (err) {
      console.error('Summaries fetch error:', err)
    }
  }

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      await Promise.all([
        fetchDashboard(selectedDate),
        fetchEvents(selectedEmployee, selectedDate),
        fetchDailySummaries(selectedDate),
      ])
      setLoading(false)
    }
    loadAll()
  }, [selectedDate, selectedEmployee])

  const handleDateChange = (date) => {
    setSelectedDate(date)
    setSummaryDate(date)
  }

  const handleViewTimeline = async (emp) => {
    setTimelineEmployee(emp)
    setShowTimelineModal(true)
    try {
      const res = await fetch(`/api/attendance-events?timeline=1&employee=${emp.id}&date=${selectedDate}`)
      const result = await res.json()
      setTimelineEvents(result.data || [])
    } catch (err) {
      toast.error('Failed to load timeline')
    }
  }

  const handleSubmitEvent = async (e) => {
    e.preventDefault()
    if (!eventForm.employee_id || !eventForm.date || !eventForm.time || !eventForm.event_type) {
      toast.error(ar('يرجى تعبئة جميع الحقول المطلوبة', 'Please fill all required fields'))
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/attendance-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventForm),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(ar('تم تسجيل الحدث بنجاح', 'Event recorded successfully'))
        setShowEventModal(false)
        setEventForm({
          employee_id: '',
          event_type: 'CHECK_IN',
          source: 'MANUAL',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
          notes: '',
          reason: '',
        })
        await Promise.all([
          fetchDashboard(selectedDate),
          fetchEvents(selectedEmployee, selectedDate),
          fetchDailySummaries(selectedDate),
        ])
      } else {
        toast.error(result.error || 'Failed to record event')
      }
    } catch (err) {
      toast.error('Error submitting event')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRecalculate = async () => {
    try {
      const res = await fetch('/api/attendance-summary?recalculate=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(ar(`تم إعادة حساب ${result.recalculated} سجل`, `Recalculated ${result.recalculated} records`))
        await Promise.all([
          fetchDashboard(selectedDate),
          fetchDailySummaries(selectedDate),
        ])
      }
    } catch (err) {
      toast.error('Recalculation failed')
    }
  }

  const handleRunAbsence = async () => {
    try {
      const res = await fetch('/api/attendance-summary?run-absence=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await res.json()
      if (result.success) {
        toast.success(ar(`تم تسجيل ${result.absentCount} غياب`, `${result.absentCount} absences recorded`))
        await Promise.all([
          fetchDashboard(selectedDate),
          fetchDailySummaries(selectedDate),
        ])
      }
    } catch (err) {
      toast.error('Absence engine failed')
    }
  }

  const formatMinutes = (m) => {
    if (!m || m === 0) return '—'
    const h = Math.floor(m / 60)
    const min = m % 60
    return h > 0 ? `${h}h ${min}m` : `${min}m`
  }

  const getStatusDisplay = (status) => STATUS_DISPLAY[status] || { icon: 'fa-circle', color: 'text-surface-400', bg: 'bg-surface-50', textAr: status, textEn: status }

  if (loading) return (
    <ProtectedRoute>
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner mx-auto"></div>
          <p className="text-surface-400 font-bold text-sm mr-3">{ar('تحميل بيانات الحضور...', 'Loading attendance data...')}</p>
        </div>
      </Layout>
    </ProtectedRoute>
  )

  return (
    <ProtectedRoute>
      <Layout>
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

          {/* ════════════════════════════════════════
              HERO HEADER
          ════════════════════════════════════════ */}
          <motion.div variants={item}
            className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #334155 100%)',
              boxShadow: '0 20px 60px rgba(15,23,42,0.3)',
            }}
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-5"
                style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 60%)' }} />
              <div className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }} />
            </div>
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-slate-300 text-[10px] font-black mb-3 backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {ar('محرك الحضور المؤسسي (Event-Driven)', 'Enterprise Attendance Engine (Event-Driven)')}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                    {ar('محرك الحضور والأحداث', 'Attendance & Events Engine')}
                  </h1>
                  <p className="text-slate-400 text-sm mt-1">
                    {ar('كل حركة تسجل كحدث — كل الملخصات تحتسب تلقائياً', 'Every movement is an event — all summaries auto-calculated')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setShowEventModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-white/15 border border-white/25 text-white text-xs font-bold hover:bg-white/25 transition-all flex items-center gap-2 backdrop-blur-sm">
                    <i className="fas fa-plus text-xs"></i>
                    {ar('تسجيل حدث', 'Record Event')}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleRecalculate}
                    className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-slate-300 text-xs font-bold hover:bg-white/20 transition-all flex items-center gap-2">
                    <i className="fas fa-rotate text-xs"></i>
                    {ar('إعادة حساب', 'Recalculate')}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleRunAbsence}
                    className="px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold hover:bg-rose-500/30 transition-all flex items-center gap-2">
                    <i className="fas fa-robot text-xs"></i>
                    {ar('فحص الغياب', 'Absence Check')}
                  </motion.button>
                </div>
              </div>
              {/* Date picker */}
              <div className="flex items-center gap-3 mt-4">
                <input type="date" value={selectedDate} onChange={e => handleDateChange(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-bold text-white backdrop-blur-sm focus:outline-none focus:border-brand-400 [color-scheme:dark]" />
                <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-bold text-white backdrop-blur-sm focus:outline-none focus:border-brand-400">
                  <option value="">{ar('جميع الموظفين', 'All Employees')}</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id} className="text-surface-900">
                      {emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          {/* ════════════════════════════════════════
              TAB NAVIGATION
          ════════════════════════════════════════ */}
          <motion.div variants={item} className="flex gap-1 p-1 bg-white rounded-2xl border border-surface-200 shadow-sm">
            {[
              { id: 'dashboard', labelAr: 'لوحة التحكم', labelEn: 'Dashboard', icon: 'fa-gauge-high' },
              { id: 'events', labelAr: 'سجل الأحداث', labelEn: 'Events Log', icon: 'fa-list' },
              { id: 'summary', labelAr: 'الملخص اليومي', labelEn: 'Daily Summary', icon: 'fa-chart-column' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-200
                  ${activeTab === tab.id ? 'bg-brand-500 text-white shadow-md' : 'text-surface-400 hover:text-surface-600 hover:bg-surface-50'}`}>
                <i className={`fas ${tab.icon} text-sm`}></i>
                <span className="hidden sm:inline">{ar(tab.labelAr, tab.labelEn)}</span>
              </button>
            ))}
          </motion.div>

          {/* ════════════════════════════════════════
              TAB: DASHBOARD
          ════════════════════════════════════════ */}
          {activeTab === 'dashboard' && dashboardData && (
            <>
              {/* LIVE STATS ROW */}
              <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { labelAr: 'إجمالي الموظفين', labelEn: 'Total Employees', value: dashboardData.totalEmployees, icon: 'fa-users', color: 'from-slate-500 to-slate-600' },
                  { labelAr: 'حاضرون', labelEn: 'Present', value: dashboardData.presentToday, icon: 'fa-circle-check', color: 'from-emerald-500 to-emerald-600' },
                  { labelAr: 'غائبون', labelEn: 'Absent', value: dashboardData.absentToday, icon: 'fa-circle-xmark', color: 'from-red-500 to-red-600' },
                  { labelAr: 'متأخرون', labelEn: 'Late', value: dashboardData.lateToday, icon: 'fa-clock', color: 'from-amber-500 to-amber-600' },
                  { labelAr: 'في إجازة', labelEn: 'On Leave', value: dashboardData.onLeaveToday, icon: 'fa-umbrella-beach', color: 'from-blue-500 to-blue-600' },
                  { labelAr: 'يعملون الآن', labelEn: 'Working Now', value: dashboardData.workingNow, icon: 'fa-briefcase', color: 'from-violet-500 to-violet-600' },
                ].map((s, i) => (
                  <div key={i}
                    className={`relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br ${s.color}`}>
                    <div className="absolute inset-0 bg-black/5" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <i className={`fas ${s.icon} text-lg opacity-60`}></i>
                        <span className="text-[9px] font-bold opacity-70 uppercase tracking-wider">{ar(s.labelAr, s.labelEn)}</span>
                      </div>
                      <p className="text-2xl font-black tabular-nums">{s.value}</p>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* SECONDARY STATS */}
              <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { labelAr: 'لم يسجلوا حضور', labelEn: 'Missing Check In', value: dashboardData.missingCheckIn, icon: 'fa-question', color: 'bg-orange-50 text-orange-600' },
                  { labelAr: 'لم يسجلوا انصراف', labelEn: 'Missing Check Out', value: dashboardData.missingCheckOut, icon: 'fa-hourglass', color: 'bg-sky-50 text-sky-600' },
                  { labelAr: 'إضافي اليوم (د)', labelEn: 'Overtime (min)', value: dashboardData.overtimeToday, icon: 'fa-bolt', color: 'bg-amber-50 text-amber-600' },
                  { labelAr: 'معدل الحضور', labelEn: 'Avg Arrival', value: dashboardData.averageArrival || '—', icon: 'fa-arrow-right-to-bracket', color: 'bg-indigo-50 text-indigo-600' },
                ].map((s, i) => (
                  <div key={i} className={`rounded-2xl p-4 ${s.color} border`} style={{ borderColor: 'currentColor', opacity: 0.2 }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
                        <i className={`fas ${s.icon} text-sm`}></i>
                      </div>
                      <div>
                        <p className="text-lg font-black">{s.value}</p>
                        <p className="text-[10px] font-bold mt-0.5">{ar(s.labelAr, s.labelEn)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* EMPLOYEE TABLE */}
              <motion.div variants={item} className="table-container">
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                      <i className="fas fa-users text-brand-600 text-sm"></i>
                    </div>
                    <span className="text-sm font-black text-surface-700">{ar('حالة الموظفين اليوم', "Today's Employee Status")}</span>
                  </div>
                  <span className="badge badge-neutral">{dashboardData.employees?.length || 0} {ar('موظف', 'Employees')}</span>
                </div>
                {dashboardData.employees?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>{ar('الموظف', 'Employee')}</th>
                          <th>{ar('القسم', 'Department')}</th>
                          <th>{ar('الفترة', 'Shift')}</th>
                          <th>{ar('الحالة', 'Status')}</th>
                          <th>{ar('تسجيل دخول', 'Check In')}</th>
                          <th>{ar('انصراف', 'Check Out')}</th>
                          <th>{ar('ساعات العمل', 'Work Hours')}</th>
                          <th className="text-center">{ar('الإجراءات', 'Actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.employees.map((emp, i) => {
                          const sd = getStatusDisplay(emp.status)
                          return (
                            <motion.tr key={emp.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.01 }} className="group">
                              <td>
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-black text-sm">
                                    {(emp.name || '?').charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-black text-surface-900 text-sm">{emp.name}</p>
                                    <p className="text-[10px] text-surface-400 font-bold">{emp.code}</p>
                                  </div>
                                </div>
                              </td>
                          <td><span className="text-xs font-bold text-surface-500">{emp.department || '—'}</span></td>
                          <td>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold">
                              <i className="fas fa-clock text-[8px]"></i>
                              {emp.shift_name || emp.shift || ar('صباحي', 'Morning')}
                            </span>
                          </td>
                          <td>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${sd.bg} ${sd.color}`}>
                                  <i className={`fas ${sd.icon} text-[8px]`}></i>
                                  {ar(sd.textAr, sd.textEn)}
                                </span>
                              </td>
                              <td><span className="font-mono font-bold text-sm" style={{ color: emp.checkIn ? '#059669' : '#dc2626' }}>{emp.checkIn || ar('—', '—')}</span></td>
                              <td><span className="font-mono font-bold text-sm" style={{ color: emp.checkOut ? '#dc2626' : '#d97706' }}>{emp.checkOut || ar('—', '—')}</span></td>
                              <td><span className="font-mono font-bold text-sm text-surface-700">{emp.workingMinutes ? `${Math.floor(emp.workingMinutes / 60)}h ${emp.workingMinutes % 60}m` : '—'}</span></td>
                              <td>
                                <div className="flex items-center justify-center gap-1.5">
                                  <button onClick={() => handleViewTimeline(emp)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                                    style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#0284c7'; e.currentTarget.style.color = 'white' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#f0f9ff'; e.currentTarget.style.color = '#0284c7' }}
                                    title={ar('عرض الجدول الزمني', 'View Timeline')}>
                                    <i className="fas fa-timeline text-xs"></i>
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon"><i className="fas fa-calendar-day"></i></div>
                    <h3 className="empty-title">{ar('لا توجد بيانات لهذا اليوم', 'No data for this date')}</h3>
                    <p className="empty-desc">{ar('لم يتم العثور على ملخصات لهذا التاريخ. قم بتشغيل "فحص الغياب" أو "إعادة حساب" للمتابعة.', 'No summaries found. Run "Absence Check" or "Recalculate".')}</p>
                  </div>
                )}
              </motion.div>
            </>
          )}

          {/* ════════════════════════════════════════
              TAB: EVENTS LOG
          ════════════════════════════════════════ */}
          {activeTab === 'events' && (
            <motion.div variants={item} className="table-container">
              <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                    <i className="fas fa-fingerprint text-brand-600 text-sm"></i>
                  </div>
                  <span className="text-sm font-black text-surface-700">{ar('سجل أحداث الحضور', 'Attendance Events Log')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setShowEventModal(true)}
                    className="btn btn-primary btn-sm">
                    <i className="fas fa-plus text-xs"></i> {ar('حدث جديد', 'New Event')}
                  </motion.button>
                  <span className="badge badge-neutral">{events.length} {ar('حدث', 'Events')}</span>
                </div>
              </div>
              {events.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{ar('الموظف', 'Employee')}</th>
                        <th>{ar('الحدث', 'Event')}</th>
                        <th>{ar('المصدر', 'Source')}</th>
                        <th>{ar('التاريخ', 'Date')}</th>
                        <th>{ar('الوقت', 'Time')}</th>
                        <th>{ar('ملاحظات', 'Notes')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((evt, i) => {
                        const ed = EVENT_DISPLAY[evt.event_type] || { icon: 'fa-circle', textAr: evt.event_type, textEn: evt.event_type }
                        return (
                          <tr key={evt.id || i} className="group">
                            <td>
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${ed.bg} ${ed.txt}`}>
                                  <i className={`fas ${ed.icon} text-xs`}></i>
                                </div>
                                <div>
                                  <p className="font-bold text-surface-800 text-sm">{evt.first_name ? `${evt.first_name} ${evt.last_name || ''}`.trim() : ar('موظف', 'Employee')}</p>
                                  <p className="text-[10px] text-surface-400">{evt.emp_code}</p>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${ed.bg} ${ed.txt}`}>
                                {ar(ed.textAr, ed.textEn)}
                              </span>
                            </td>
                            <td><span className="badge badge-neutral text-[10px]">{evt.source}</span></td>
                            <td><span className="font-mono text-xs font-bold text-surface-600">{evt.date}</span></td>
                            <td><span className="font-mono font-black text-sm text-surface-800">{evt.time}</span></td>
                            <td className="text-xs text-surface-400 max-w-[200px] truncate">{evt.notes || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon"><i className="fas fa-calendar"></i></div>
                  <h3 className="empty-title">{ar('لا توجد أحداث', 'No Events')}</h3>
                  <p className="empty-desc">{ar('لم يتم تسجيل أي أحداث لهذا اليوم. قم بتسجيل حدث جديد أو تشغيل مزامنة الأجهزة.', 'No events recorded. Record a new event or run device sync.')}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ════════════════════════════════════════
              TAB: DAILY SUMMARY
          ════════════════════════════════════════ */}
          {activeTab === 'summary' && (
            <motion.div variants={item} className="table-container">
              <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                    <i className="fas fa-chart-simple text-brand-600 text-sm"></i>
                  </div>
                  <span className="text-sm font-black text-surface-700">{ar('الملخص اليومي', 'Daily Summary')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="date" value={summaryDate} onChange={e => { setSummaryDate(e.target.value); fetchDailySummaries(e.target.value) }}
                    className="input text-xs font-bold w-auto py-1.5" />
                  <span className="badge badge-neutral">{dailySummaries.length} {ar('سجل', 'Records')}</span>
                </div>
              </div>
              {dailySummaries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{ar('الموظف', 'Employee')}</th>
                        <th>{ar('الحالة', 'Status')}</th>
                        <th>{ar('دخول', 'In')}</th>
                        <th>{ar('خروج', 'Out')}</th>
                        <th>{ar('صافي ساعات', 'Net Hours')}</th>
                        <th>{ar('تأخير', 'Late')}</th>
                        <th>{ar('إضافي', 'OT')}</th>
                        <th>{ar('استراحة', 'Break')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySummaries.map((s, i) => {
                        const sd = getStatusDisplay(s.status)
                        return (
                          <tr key={s.id || i} className="group">
                            <td>
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-black">
                                  {(s.first_name || '?').charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-surface-800 text-sm">{s.first_name ? `${s.first_name} ${s.last_name || ''}`.trim() : '—'}</p>
                                  <p className="text-[10px] text-surface-400">{s.department || '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${sd.bg} ${sd.color}`}>
                                <i className={`fas ${sd.icon} text-[8px]`}></i>
                                {ar(sd.textAr, sd.textEn)}
                              </span>
                            </td>
                            <td><span className={`font-mono font-bold text-sm ${s.first_check_in ? 'text-emerald-600' : 'text-surface-300'}`}>{s.first_check_in || '—'}</span></td>
                            <td><span className={`font-mono font-bold text-sm ${s.last_check_out ? 'text-rose-600' : 'text-surface-300'}`}>{s.last_check_out || '—'}</span></td>
                            <td><span className="font-mono font-bold text-sm text-surface-700">{formatMinutes(s.net_working_minutes)}</span></td>
                            <td><span className="font-mono font-bold text-sm text-amber-600">{formatMinutes(s.late_minutes)}</span></td>
                            <td><span className="font-mono font-bold text-sm text-orange-600">{formatMinutes(s.overtime_minutes)}</span></td>
                            <td><span className="font-mono font-bold text-sm text-surface-500">{formatMinutes(s.break_minutes)}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon"><i className="fas fa-file-chart-column"></i></div>
                  <h3 className="empty-title">{ar('لا توجد ملخصات', 'No Summaries')}</h3>
                  <p className="empty-desc">{ar('لم يتم العثور على ملخصات. اضغط "إعادة حساب" لإنشائها.', 'No summaries found. Click "Recalculate" to generate them.')}</p>
                </div>
              )}
            </motion.div>
          )}

        </motion.div>

        {/* ════════════════════════════════════════
            TIMELINE MODAL
        ════════════════════════════════════════ */}
        <AnimatePresence>
          {showTimelineModal && timelineEmployee && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" onClick={() => setShowTimelineModal(false)}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-3xl border border-surface-200 shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-surface-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-black">
                      {(timelineEmployee.name || '?').charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-black text-surface-900">{timelineEmployee.name}</h3>
                      <p className="text-xs text-surface-400">{selectedDate}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowTimelineModal(false)}
                    className="w-9 h-9 rounded-xl bg-surface-50 text-surface-500 hover:bg-surface-100 flex items-center justify-center border border-surface-200">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  {timelineEvents.length > 0 ? (
                    <div className="pr-4">
                      {timelineEvents.map((evt, i) => (
                        <TimelineItem key={evt.id || i} event={evt} ar={ar} isLast={i === timelineEvents.length - 1} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 rounded-full bg-surface-50 flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-timeline text-surface-400 text-2xl"></i>
                      </div>
                      <p className="text-sm font-bold text-surface-500">{ar('لا توجد أحداث لهذا اليوم', 'No events for this date')}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ════════════════════════════════════════
            NEW EVENT MODAL
        ════════════════════════════════════════ */}
        <AnimatePresence>
          {showEventModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowEventModal(false)}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-3xl border border-surface-200 shadow-2xl max-w-md w-full overflow-hidden"
                onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-surface-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                        <i className="fas fa-calendar-plus text-brand-600"></i>
                      </div>
                      <h3 className="font-black text-surface-900">{ar('تسجيل حدث حضور جديد', 'Record New Attendance Event')}</h3>
                    </div>
                    <button onClick={() => setShowEventModal(false)}
                      className="w-9 h-9 rounded-xl bg-surface-50 text-surface-500 hover:bg-surface-100 flex items-center justify-center border border-surface-200">
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
                <form onSubmit={handleSubmitEvent} className="p-5 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-surface-500 mb-1.5 block">{ar('الموظف *', 'Employee *')}</label>
                    <select value={eventForm.employee_id} onChange={e => setEventForm({ ...eventForm, employee_id: e.target.value })}
                      className="select text-sm" required>
                      <option value="">{ar('اختر موظف...', 'Select employee...')}</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-surface-500 mb-1.5 block">{ar('نوع الحدث *', 'Event Type *')}</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(EVENT_DISPLAY).map(([key, val]) => (
                        <label key={key}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-all text-xs font-bold
                            ${eventForm.event_type === key ? `${val.bg} ${val.txt} border-current` : 'bg-surface-50 border-surface-200 text-surface-500 hover:bg-surface-100'}`}>
                          <input type="radio" name="event_type" value={key} checked={eventForm.event_type === key}
                            onChange={e => setEventForm({ ...eventForm, event_type: e.target.value })} className="hidden" />
                          <i className={`fas ${val.icon} text-xs`}></i>
                          {ar(val.textAr, val.textEn)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-surface-500 mb-1.5 block">{ar('التاريخ *', 'Date *')}</label>
                      <input type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                        className="input text-sm" required />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-surface-500 mb-1.5 block">{ar('الوقت *', 'Time *')}</label>
                      <input type="time" value={eventForm.time} onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                        className="input text-sm" required />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-surface-500 mb-1.5 block">{ar('المصدر', 'Source')}</label>
                    <select value={eventForm.source} onChange={e => setEventForm({ ...eventForm, source: e.target.value })}
                      className="select text-sm">
                      <option value="MANUAL">Manual</option>
                      <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
                      <option value="SYSTEM">System</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-surface-500 mb-1.5 block">{ar('ملاحظات', 'Notes')}</label>
                    <textarea value={eventForm.notes} onChange={e => setEventForm({ ...eventForm, notes: e.target.value })}
                      className="input text-sm resize-none" rows={2} />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button type="button" onClick={() => setShowEventModal(false)}
                      className="flex-1 py-2.5 rounded-xl border border-surface-200 text-surface-500 font-bold text-sm hover:bg-surface-50 transition-all">
                      {ar('إلغاء', 'Cancel')}
                    </button>
                    <button type="submit" disabled={isSubmitting}
                      className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                      {isSubmitting ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> {ar('جاري...', 'Saving...')}</>
                      ) : (
                        <><i className="fas fa-floppy-disk text-xs"></i> {ar('تسجيل', 'Record')}</>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </Layout>
    </ProtectedRoute>
  )
}
