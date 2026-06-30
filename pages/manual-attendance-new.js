import { useReducer, useEffect, useMemo, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import { motion, AnimatePresence } from 'framer-motion'
import { useData } from '../contexts/DataContext'
import toast from 'react-hot-toast'
import { useLanguage } from '../contexts/LanguageContext'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import AttendanceRegistrationModal from '../components/AttendanceRegistrationModal'
import AttendanceAnalytics from '../components/AttendanceAnalytics'
import EmployeeDrawer from '../components/EmployeeDrawer'

// ---------- helpers ----------
const todayISO = () => new Date().toISOString().split('T')[0]
const formatDateLocale = (iso, locale = 'ar-EG') => {
  try { return new Date(iso).toLocaleString(locale) } catch (e) { return iso }
}
const debounce = (fn, delay = 300) => {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }
}

// ---------- state ----------
const initialState = {
  loading: true,
  isRefreshing: false,
  error: null,
  attendance: [],
  viewMode: 'today',
  selectedDate: todayISO(),
  searchName: '',
  searchMonth: new Date().toISOString().slice(0, 7),
  showAddModal: false,
  selectedEmployeeForDrawer: null,
  pagination: { page: 1, perPage: 10 }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, loading: action.payload }
    case 'SET_REFRESHING': return { ...state, isRefreshing: action.payload }
    case 'SET_ERROR': return { ...state, error: action.payload, loading: false }
    case 'SET_ATTENDANCE': return { ...state, attendance: action.payload, loading: false, isRefreshing: false, error: null }
    case 'TOGGLE_ADD_MODAL': return { ...state, showAddModal: !state.showAddModal }
    case 'SET_VIEW_MODE': return { ...state, viewMode: action.payload, pagination: { ...state.pagination, page: 1 } }
    case 'SET_SELECTED_DATE': return { ...state, selectedDate: action.payload, pagination: { ...state.pagination, page: 1 } }
    case 'SET_SEARCH_NAME': return { ...state, searchName: action.payload, pagination: { ...state.pagination, page: 1 } }
    case 'SET_SEARCH_MONTH': return { ...state, searchMonth: action.payload, pagination: { ...state.pagination, page: 1 } }
    case 'SET_DRAWER': return { ...state, selectedEmployeeForDrawer: action.payload }
    case 'SET_PAGE': return { ...state, pagination: { ...state.pagination, page: action.payload } }
    default: return state
  }
}

export default function ManualAttendance() {
  const { language } = useLanguage()
  const ar = useCallback((a, e) => language === 'ar' ? a : e, [language])
  const { employees = [] } = useData() || {}
  const [state, dispatch] = useReducer(reducer, initialState)
  const [localSearchName, setLocalSearchName] = useState('')

  const debouncedSetSearch = useMemo(() => debounce((val) => {
    dispatch({ type: 'SET_SEARCH_NAME', payload: val })
  }, 350), [])

  const fetchAttendanceData = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      let url = '/api/attendance-summary';
      if (state.viewMode === 'today') {
        url += `?date=${state.selectedDate}`
      } else if (state.viewMode === 'monthly') {
        const searchMonth = state.searchMonth || new Date().toISOString().slice(0, 7);
        const year = parseInt(searchMonth.split('-')[0]);
        const month = parseInt(searchMonth.split('-')[1]);
        const startDate = `${searchMonth}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${searchMonth}-${String(lastDay).padStart(2, '0')}`;
        url += `?startDate=${startDate}&endDate=${endDate}`;
      } else {
        const today = new Date();
        const start = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const end = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        url += `?startDate=${start}&endDate=${end}`;
      }

      const res = await fetch(url + (url.includes('?') ? '&' : '?') + new Date().getTime(), {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' }
      })
      const data = await res.json()
      if (!data || !data.success) throw new Error(data?.message || 'تعذر جلب بيانات الحضور')

      const records = (data.data || []).map(r => {
        const empCode = r.emp_code || r.employee_id || r.id;
        const empName = r.first_name ? `${r.first_name} ${r.last_name || ''}`.trim() : `موظف (${empCode})`;
        return {
          id: r.id,
          employeeId: empCode,
          employeeName: empName,
          date: r.date || todayISO(),
          notes: r.notes || '',
          first_check_in: r.first_check_in || null,
          last_check_out: r.last_check_out || null,
          late_minutes: r.late_minutes || 0,
          overtime_minutes: r.overtime_minutes || 0,
          status: r.status || 'Absent',
          department: r.department || ar('إدارة التشغيل', 'Operations'),
          location: r.location || ar('المقر الرئيسي', 'HQ'),
          manager: r.manager || ar('أحمد محمد', 'Ahmed M.'),
        };
      });

      dispatch({ type: 'SET_ATTENDANCE', payload: records })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message || String(err) })
      toast.error('❌ ' + (err.message || ar('خطأ غير متوقع', 'Unexpected error')))
    }
  }, [ar, state.viewMode, state.selectedDate, state.searchMonth])

  useEffect(() => { fetchAttendanceData() }, [fetchAttendanceData])

  const refreshData = async () => {
    dispatch({ type: 'SET_REFRESHING', payload: true })
    await fetchAttendanceData()
    dispatch({ type: 'SET_REFRESHING', payload: false })
    toast.success(ar('🔄 تم تحديث جميع البيانات', 'All data updated'))
  }

  const filtered = useMemo(() => {
    const sName = state.searchName?.trim().toLowerCase()
    const sMonth = state.searchMonth
    return state.attendance.filter(row => {
      const matchesName = sName ? (row.employeeName || '').toLowerCase().includes(sName) : true
      const matchesMonth = sMonth ? (row.date?.slice(0, 7) || '').includes(sMonth) : true
      const matchesDate = state.viewMode === 'today' ? row.date === state.selectedDate : true
      return matchesName && matchesMonth && matchesDate
    }).sort((a, b) => {
      if (a.date === b.date) {
        const timeA = a.first_check_in || '24:00';
        const timeB = b.first_check_in || '24:00';
        return timeA.localeCompare(timeB);
      }
      return b.date.localeCompare(a.date)
    })
  }, [state.attendance, state.searchName, state.searchMonth, state.viewMode, state.selectedDate])

  const monthlyRecords = useMemo(() => {
    if (state.viewMode !== 'monthly') return [];
    
    const groups = {};
    filtered.forEach(row => {
      const empId = row.employeeId;
      if (!groups[empId]) {
        groups[empId] = {
          employeeId: empId,
          employeeName: row.employeeName,
          department: row.department,
          manager: row.manager,
          location: row.location,
          month: state.searchMonth || new Date().toISOString().slice(0, 7),
          presentDays: 0,
          absentDays: 0,
          totalLateMinutes: 0,
        };
      }
      
      const g = groups[empId];
      if (['Present', 'Late', 'Missing Check In', 'Missing Check Out', 'Remote', 'Mission'].includes(row.status)) {
        g.presentDays += 1;
      } else if (row.status === 'Absent') {
        g.absentDays += 1;
      }
      g.totalLateMinutes += row.late_minutes || 0;
    });
    
    return Object.values(groups);
  }, [filtered, state.viewMode, state.searchMonth]);

  const displayRows = state.viewMode === 'monthly' ? monthlyRecords : filtered
  const page = state.pagination.page
  const perPage = state.pagination.perPage
  const totalPages = Math.max(1, Math.ceil(displayRows.length / perPage))
  const currentSlice = displayRows.slice((page - 1) * perPage, page * perPage)

  // Derived Stats from raw attendance list matching active view filters
  const today = todayISO()
  const currentMonth = state.searchMonth || today.slice(0, 7)
  
  const kpiStats = useMemo(() => {
    const list = state.attendance;
    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;
    
    list.forEach(r => {
      const matchesDate = state.viewMode === 'today' ? r.date === state.selectedDate : (state.viewMode === 'monthly' ? r.date.startsWith(currentMonth) : true);
      if (!matchesDate) return;
      
      if (['Present', 'Late', 'Missing Check In', 'Missing Check Out', 'Remote', 'Mission'].includes(r.status)) {
        present++;
      }
      if (r.status === 'Absent') absent++;
      if (r.status === 'Late') late++;
      if (r.status === 'On Leave') leave++;
    });
    
    return { present, absent, late, leave };
  }, [state.attendance, state.viewMode, state.selectedDate, currentMonth]);

  const { present, absent, late, leave } = kpiStats;
  const totalEmps = employees.length || 150
  const avgAttendance = present + absent > 0 ? Math.round((present / (present + absent)) * 100) : 0

  const handleSaveAttendance = async (data) => {
    const { employeeId, type, date, time, notes } = data;
    if (!employeeId) return toast.error(ar('يرجى اختيار موظف', 'Please select an employee'))
    
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const payload = { employee_id: employeeId, date, check_in: type === 'check-in' ? time : null, check_out: type === 'check-out' ? time : null, status: 'Manual', notes: notes || '' };
      const res = await fetch('/api/manual-attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const resData = await res.json()
      if (!resData?.success) throw new Error(resData?.message || 'فشل في تسجيل الحضور')
      
      toast.success(ar(`تم تسجيل الحركة بنجاح`, `Record saved successfully`))
      dispatch({ type: 'TOGGLE_ADD_MODAL' })
      setTimeout(fetchAttendanceData, 500)
    } catch (err) {
      toast.error('❌ ' + (err.message || ar('خطأ أثناء التسجيل', 'Error')))
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const exportToExcel = () => {
    try {
      let dataSheet = [];
      if (state.viewMode === 'monthly') {
        dataSheet = monthlyRecords.map(r => ({
          'كود الموظف': r.employeeId,
          'اسم الموظف': r.employeeName,
          'الشهر': r.month,
          'أيام الحضور': r.presentDays,
          'أيام الغياب': r.absentDays,
          'ساعات التأخير': (r.totalLateMinutes / 60).toFixed(1),
          'الإدارة': r.department
        }))
      } else {
        dataSheet = filtered.map(r => ({
          'كود الموظف': r.employeeId,
          'اسم الموظف': r.employeeName,
          'التاريخ': r.date,
          'حضور': r.first_check_in || '-',
          'انصراف': r.last_check_out || '-',
          'تأخير (دقائق)': r.late_minutes,
          'إضافي (ساعات)': (r.overtime_minutes / 60).toFixed(1),
          'الحالة': r.status,
          'الإدارة': r.department
        }))
      }
      const wb = XLSX.utils.book_new()
      const wsData = XLSX.utils.json_to_sheet(dataSheet)
      XLSX.utils.book_append_sheet(wb, wsData, 'Records')
      XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      toast.success(ar(`تم تصدير ${displayRows.length} سجل بنجاح`, `${displayRows.length} records exported`))
    } catch (err) { toast.error(ar('حدث خطأ أثناء التصدير', 'Export Error')) }
  }

  const getStatusBadge = (status) => {
    const config = {
      'Present': { color: 'text-emerald-700 border-emerald-200 bg-emerald-50', textAr: 'حاضر', textEn: 'Present' },
      'Absent': { color: 'text-rose-700 border-rose-200 bg-rose-50', textAr: 'غائب', textEn: 'Absent' },
      'Late': { color: 'text-amber-700 border-amber-200 bg-amber-50', textAr: 'متأخر', textEn: 'Late' },
      'On Leave': { color: 'text-blue-700 border-blue-200 bg-blue-50', textAr: 'في إجازة', textEn: 'On Leave' },
      'Holiday': { color: 'text-yellow-700 border-yellow-200 bg-yellow-50', textAr: 'إجازة رسمية', textEn: 'Holiday' },
      'Weekend': { color: 'text-gray-500 border-gray-200 bg-gray-50', textAr: 'عطلة', textEn: 'Weekend' },
      'Missing Check In': { color: 'text-orange-700 border-orange-200 bg-orange-50', textAr: 'لم يسجل حضور', textEn: 'Missing Check In' },
      'Missing Check Out': { color: 'text-sky-700 border-sky-200 bg-sky-50', textAr: 'لم يسجل انصراف', textEn: 'Missing Check Out' },
      'Remote': { color: 'text-violet-700 border-violet-200 bg-violet-50', textAr: 'عن بعد', textEn: 'Remote' },
      'Mission': { color: 'text-indigo-700 border-indigo-200 bg-indigo-50', textAr: 'مهمة', textEn: 'Mission' },
    }[status] || { color: 'text-gray-600 border-gray-200 bg-gray-50', textAr: status, textEn: status };

    return (
      <span className={`${config.color} border px-2 py-1 rounded-md text-[10px] font-bold`}>
        {ar(config.textAr, config.textEn)}
      </span>
    );
  }

  const drawerTimelineRecords = useMemo(() => {
    if (!state.selectedEmployeeForDrawer) return [];
    const empRecords = state.attendance.filter(r => r.employeeName === state.selectedEmployeeForDrawer.name);
    const timeline = [];
    empRecords.forEach(r => {
      if (r.first_check_in) {
        timeline.push({
          date: r.date,
          time: r.first_check_in,
          type: 'check-in',
          notes: r.notes || (r.late_minutes > 0 ? ar('حضور متأخر', 'Late arrival') : '')
        });
      }
      if (r.last_check_out) {
        timeline.push({
          date: r.date,
          time: r.last_check_out,
          type: 'check-out',
          notes: r.notes
        });
      }
      if (!r.first_check_in && !r.last_check_out && r.status === 'Absent') {
        timeline.push({
          date: r.date,
          time: 'غائب',
          type: 'absent',
          notes: r.notes || ar('غياب تلقائي', 'Auto Absent')
        });
      }
    });
    return timeline;
  }, [state.selectedEmployeeForDrawer, state.attendance, ar]);

  return (
    <ProtectedRoute>
      <Layout>
        {/* === HERO DASHBOARD === */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-accent-900 p-8 text-white shadow-xl mb-6">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-500/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white/20">
                  <i className="fas fa-satellite-dish mr-1 text-emerald-400 animate-pulse"></i> {ar('متصل مباشر', 'Live Sync')}
                </span>
                <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                  {formatDateLocale(new Date().toISOString(), language === 'ar' ? 'ar-EG' : 'en-US').split(',')[0]}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">{ar('مركز تحكم الحضور', 'Attendance Command Center')}</h1>
              <p className="text-brand-100 text-sm md:text-base max-w-xl leading-relaxed">
                {ar('إدارة ومراقبة حركة الموظفين اللحظية بذكاء وكفاءة. تتبع الحضور، الغياب، التأخير، والإجازات من لوحة تحكم واحدة.', 'Intelligently monitor and manage employee live attendance. Track presence, absence, late arrivals, and leaves in one unified dashboard.')}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <button onClick={() => dispatch({ type: 'TOGGLE_ADD_MODAL' })} className="flex-1 md:flex-none bg-white text-brand-900 hover:bg-brand-50 font-bold px-6 py-3 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 border border-white/20">
                <i className="fas fa-plus-circle text-brand-600"></i> {ar('تسجيل حركة يدوية', 'Manual Check-in')}
              </button>
              <button onClick={exportToExcel} className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-xl flex items-center justify-center transition-all border border-white/20 shadow-lg">
                <i className="fas fa-file-export"></i>
              </button>
              <button onClick={refreshData} disabled={state.isRefreshing} className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-xl flex items-center justify-center transition-all border border-white/20 shadow-lg">
                <i className={`fas fa-sync-alt ${state.isRefreshing ? 'fa-spin' : ''}`}></i>
              </button>
            </div>
          </div>
        </div>

        {/* === KPI CARDS === */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { title: ar('إجمالي الموظفين', 'Total Employees'), val: totalEmps, bg: 'bg-surface-50', text: 'text-surface-900', icon: 'fa-users', trend: '+2' },
            { title: ar('الحضور اليوم', 'Present Today'), val: present, bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'fa-user-check', trend: `${avgAttendance}%` },
            { title: ar('تأخير اليوم', 'Late Today'), val: late, bg: 'bg-amber-50', text: 'text-amber-700', icon: 'fa-clock', trend: '12m avg' },
            { title: ar('غياب اليوم', 'Absent Today'), val: absent, bg: 'bg-rose-50', text: 'text-rose-700', icon: 'fa-user-times', trend: '-1%' },
            { title: ar('في إجازة', 'On Leave'), val: leave, bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'fa-plane', trend: '2 req' },
            { title: ar('إجمالي الحركات', 'Total Records'), val: state.attendance.length, bg: 'bg-brand-50', text: 'text-brand-700', icon: 'fa-database', trend: '+45' },
          ].map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`${kpi.bg} border border-black/5 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group`}>
              <div className="flex justify-between items-start mb-2 relative z-10">
                <span className={`w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center shadow-sm ${kpi.text}`}>
                  <i className={`fas ${kpi.icon} text-sm`}></i>
                </span>
                <span className="text-[10px] font-bold text-surface-500 bg-white/50 px-2 py-0.5 rounded-full">{kpi.trend}</span>
              </div>
              <div className="relative z-10">
                <h3 className={`text-2xl font-black ${kpi.text} leading-none mb-1`}>{kpi.val}</h3>
                <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wide">{kpi.title}</p>
              </div>
              <div className={`absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-0 group-hover:opacity-20 transition-opacity blur-xl ${kpi.text.replace('text-', 'bg-')}`}></div>
            </motion.div>
          ))}
        </div>

        {/* === ANALYTICS & CHARTS === */}
        <div className="mb-6">
          <AttendanceAnalytics stats={{ present, absent, late, leave }} />
        </div>

        {/* === SMART FILTERS & GRID === */}
        <div className="bg-white border border-surface-200 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[700px]">
          {/* Smart Filters Bar */}
          <div className="p-4 border-b border-surface-200 bg-surface-50/50 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2 p-1 bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden flex-wrap w-full md:w-auto">
              {[
                { id: 'today', icon: 'fa-calendar-day', label: ar('اليوم', 'Today') },
                { id: 'monthly', icon: 'fa-calendar-alt', label: ar('الشهر', 'Month') },
                { id: 'all', icon: 'fa-list', label: ar('الكل', 'All') }
              ].map(tab => (
                <button key={tab.id} onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: tab.id })}
                  className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${state.viewMode === tab.id ? 'bg-brand-600 text-white shadow-md' : 'text-surface-500 hover:bg-surface-50 hover:text-surface-900'}`}>
                  <i className={`fas ${tab.icon}`}></i> {tab.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3 w-full md:w-auto flex-1 md:flex-none">
              <div className="relative flex-1 md:w-64">
                <i className="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs"></i>
                <input type="text" placeholder={ar('ابحث عن موظف، إدارة...', 'Search employee, dept...')} 
                  className="w-full bg-white border border-surface-200 rounded-xl px-9 py-2.5 text-xs focus:border-brand-500 outline-none shadow-sm transition-all"
                  value={localSearchName} onChange={e => { setLocalSearchName(e.target.value); debouncedSetSearch(e.target.value) }} />
              </div>
              {state.viewMode === 'today' && <input type="date" value={state.selectedDate} onChange={e => dispatch({ type: 'SET_SELECTED_DATE', payload: e.target.value })} className="input text-xs font-bold py-2.5 w-auto" />}
              {state.viewMode === 'monthly' && <input type="month" value={state.searchMonth} onChange={e => dispatch({ type: 'SET_SEARCH_MONTH', payload: e.target.value })} className="input text-xs font-bold py-2.5 w-auto" />}
            </div>
          </div>

          {/* Enterprise Grid */}
          <div className="flex-1 overflow-auto custom-scrollbar relative">
            <table className="w-full text-right text-sm">
              <thead className="bg-surface-50/90 backdrop-blur-md sticky top-0 z-20 border-b border-surface-200 shadow-sm">
                {state.viewMode === 'monthly' ? (
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-wider">{ar('الموظف', 'Employee')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-wider">{ar('الشهر', 'Month')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-wider">{ar('عدد أيام الحضور', 'Present Days')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-wider">{ar('عدد أيام الغياب', 'Absent Days')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-wider">{ar('ساعات التأخير', 'Late Hours')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-wider">{ar('الإدارة / القسم', 'Department')}</th>
                    <th className="px-6 py-4 w-12"></th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-wider">{ar('الموظف', 'Employee')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-wider">{ar('تاريخ اليوم', 'Date')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-wider">{ar('وقت الحضور', 'Check-in')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-wider">{ar('وقت الانصراف', 'Check-out')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-wider">{ar('دقائق التأخير', 'Late Minutes')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-wider">{ar('ساعات الإضافي', 'Overtime Hours')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-wider">{ar('الحالة', 'Status')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-surface-500 uppercase tracking-wider">{ar('الإدارة / القسم', 'Department')}</th>
                    <th className="px-6 py-4 w-12"></th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-surface-100">
                {currentSlice.length > 0 ? currentSlice.map((row, i) => {
                  if (state.viewMode === 'monthly') {
                    return (
                      <tr key={`${row.employeeId}-${i}`} 
                          onClick={() => dispatch({ type: 'SET_DRAWER', payload: { name: row.employeeName, presentDays: row.presentDays, totalRecords: filtered.filter(r=>r.employeeId===row.employeeId).length } })}
                          className="group hover:bg-brand-50/30 transition-colors cursor-pointer relative z-10">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-surface-100 to-surface-200 border border-surface-300 flex items-center justify-center text-surface-700 font-black shadow-inner">
                              {row.employeeName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-surface-900 group-hover:text-brand-600 transition-colors">{row.employeeName}</p>
                              <p className="text-[10px] text-surface-400 font-mono mt-0.5">ID: {row.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-surface-700">
                          {row.month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-emerald-600">
                          {row.presentDays} {ar('يوم', 'days')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-rose-600">
                          {row.absentDays} {ar('يوم', 'days')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-amber-600 font-mono">
                          {(row.totalLateMinutes / 60).toFixed(1)} {ar('ساعة', 'hours')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-xs font-bold text-surface-700">{row.department}</p>
                          <p className="text-[10px] text-surface-400 mt-0.5">{ar('المدير: ', 'Manager: ')}{row.manager}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button className="w-8 h-8 rounded-full text-surface-400 hover:text-brand-600 hover:bg-brand-50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                            <i className="fas fa-chevron-left text-xs"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  } else {
                    return (
                      <tr key={`${row.employeeId}-${i}`} 
                          onClick={() => dispatch({ type: 'SET_DRAWER', payload: { name: row.employeeName, presentDays: present, totalRecords: state.attendance.filter(r=>r.employeeName===row.employeeName).length } })}
                          className="group hover:bg-brand-50/30 transition-colors cursor-pointer relative z-10">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-surface-100 to-surface-200 border border-surface-300 flex items-center justify-center text-surface-700 font-black shadow-inner">
                              {row.employeeName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-surface-900 group-hover:text-brand-600 transition-colors">{row.employeeName}</p>
                              <p className="text-[10px] text-surface-400 font-mono mt-0.5">ID: {row.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-surface-700">
                          {row.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-surface-900 font-mono">
                          {row.first_check_in || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-surface-900 font-mono">
                          {row.last_check_out || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-rose-600 font-mono">
                          {row.late_minutes} {ar('دقيقة', 'mins')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-emerald-600 font-mono">
                          {(row.overtime_minutes / 60).toFixed(1)} {ar('ساعة', 'hours')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(row.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-xs font-bold text-surface-700">{row.department}</p>
                          <p className="text-[10px] text-surface-400 mt-0.5">{ar('المدير: ', 'Manager: ')}{row.manager}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button className="w-8 h-8 rounded-full text-surface-400 hover:text-brand-600 hover:bg-brand-50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                            <i className="fas fa-chevron-left text-xs"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  }
                }) : (
                  <tr>
                    <td colSpan={state.viewMode === 'monthly' ? "7" : "9"} className="py-20 text-center">
                      <div className="w-20 h-20 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-4 text-surface-300 text-3xl">
                        <i className="fas fa-fingerprint"></i>
                      </div>
                      <h3 className="text-surface-900 font-black">{ar('لا توجد سجلات', 'No Records')}</h3>
                      <p className="text-surface-500 text-xs mt-1">{ar('حاول تغيير الفلاتر أو الإضافة اليدوية', 'Try changing filters or add manually')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Grid Footer (Pagination) */}
          {displayRows.length > perPage && (
            <div className="p-4 bg-white border-t border-surface-200 flex items-center justify-between z-20">
              <span className="text-xs text-surface-500 font-bold">
                {ar('عرض', 'Showing')} {((page - 1) * perPage) + 1} {ar('إلى', 'to')} {Math.min(page * perPage, displayRows.length)} {ar('من أصل', 'of')} {displayRows.length} {ar('سجل', 'records')}
              </span>
              <div className="flex gap-2">
                <button onClick={() => dispatch({ type: 'SET_PAGE', payload: Math.max(1, page - 1) })} disabled={page === 1} className="px-3 py-1.5 rounded-lg bg-surface-50 border border-surface-200 flex items-center text-xs font-bold text-surface-600 hover:bg-surface-100 transition-colors disabled:opacity-50">
                  <i className="fas fa-chevron-right ml-1"></i> {ar('السابق', 'Prev')}
                </button>
                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, idx) => (
                    <button key={idx} onClick={() => dispatch({ type: 'SET_PAGE', payload: idx + 1 })} className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${page === idx + 1 ? 'bg-brand-600 text-white shadow-sm' : 'bg-transparent text-surface-500 hover:bg-surface-100'}`}>
                      {idx + 1}
                    </button>
                  ))}
                </div>
                <button onClick={() => dispatch({ type: 'SET_PAGE', payload: Math.min(totalPages, page + 1) })} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg bg-surface-50 border border-surface-200 flex items-center text-xs font-bold text-surface-600 hover:bg-surface-100 transition-colors disabled:opacity-50">
                  {ar('التالي', 'Next')} <i className="fas fa-chevron-left mr-1"></i>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* === MODALS & DRAWERS === */}
        <AttendanceRegistrationModal isOpen={state.showAddModal} onClose={() => dispatch({ type: 'TOGGLE_ADD_MODAL' })} employees={employees} onSave={handleSaveAttendance} loading={state.loading} />
        <EmployeeDrawer isOpen={!!state.selectedEmployeeForDrawer} onClose={() => dispatch({ type: 'SET_DRAWER', payload: null })} employeeStats={state.selectedEmployeeForDrawer} records={drawerTimelineRecords} />
      </Layout>
    </ProtectedRoute>
  )
}
