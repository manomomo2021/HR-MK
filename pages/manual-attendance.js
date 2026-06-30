import { useReducer, useEffect, useMemo, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import { motion, AnimatePresence } from 'framer-motion'
import { useData } from '../contexts/DataContext'
import { useLanguage } from '../contexts/LanguageContext'
import toast, { Toaster } from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'


/**
 * ManualAttendance - صفحة احترافية متكاملة للحضور والانصراف اليدوي
 *
 * ميزات:
 * - useReducer لإدارة الحالة المركزية
 * - تحميل بيانات من /api/manual-attendance (GET/POST)
 * - فلترة متقدمة مع debounce على اسم الموظف وفلترة حسب التاريخ/الشهر
 * - Modal احترافي لإضافة تسجيل يدوي
 * - جدول متقدم مع Pagination وتصميم متجاوب
 * - نافذة إحصائيات موظف عند الضغط على الاسم
 * - تصدير Excel مع ورقة ملخص وتنسيق احترافي
 * - واجهة مستخدم حديثة مع أيقونات واضحة
 *
 * تأكد من توفر:
 * - Tailwind CSS
 * - framer-motion
 * - react-hot-toast
 * - xlsx, file-saver
 * - react-icons/fi
 */

// ---------- helpers ----------
const todayISO = () => new Date().toISOString().split('T')[0]

const formatDateLocale = (iso, locale = 'ar-EG') => {
  try {
    return new Date(iso).toLocaleString(locale)
  } catch (e) {
    return iso
  }
}

const debounce = (fn, delay = 300) => {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }
}

// ---------- initial state & reducer ----------
const initialState = {
  loading: true,
  isRefreshing: false,
  error: null,
  attendance: [],
  // filters
  viewMode: 'today', // today | all | monthly
  selectedDate: todayISO(),
  searchName: '',
  searchMonth: '',
  // ui
  showAddModal: false,
  showStatsModal: false,
  employeeStats: null,
  // form
  form: {
    employeeId: '',
    type: 'check-in',
    date: todayISO(),
    time: new Date().toTimeString().slice(0, 5),
    notes: ''
  },
  pagination: {
    page: 1,
    perPage: 12
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, loading: action.payload }
    case 'SET_REFRESHING': return { ...state, isRefreshing: action.payload }
    case 'SET_ERROR': return { ...state, error: action.payload, loading: false }
    case 'SET_ATTENDANCE': return { ...state, attendance: action.payload, loading: false, isRefreshing: false, error: null }
    case 'TOGGLE_ADD_MODAL': return { ...state, showAddModal: !state.showAddModal }
    case 'SET_FORM': return { ...state, form: { ...state.form, ...action.payload } }
    case 'RESET_FORM': return { ...state, form: { ...initialState.form } }
    case 'SET_VIEW_MODE': return { ...state, viewMode: action.payload }
    case 'SET_SELECTED_DATE': return { ...state, selectedDate: action.payload }
    case 'SET_SEARCH_NAME': return { ...state, searchName: action.payload, pagination: { ...state.pagination, page: 1 } }
    case 'SET_SEARCH_MONTH': return { ...state, searchMonth: action.payload, pagination: { ...state.pagination, page: 1 } }
    case 'SET_STATS_MODAL': return { ...state, showStatsModal: action.payload.show, employeeStats: action.payload.stats || null }
    case 'SET_PAGE': return { ...state, pagination: { ...state.pagination, page: action.payload } }
    default: return state
  }
}

// ---------- main component ----------
export default function ManualAttendance() {
  const { language } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e
  const { employees = [] } = useData() || {}
  const [state, dispatch] = useReducer(reducer, initialState)
  const [localSearchName, setLocalSearchName] = useState('')

  // Debounced dispatch for search to avoid rerenders per keystroke
  const debouncedSetSearch = useMemo(() => debounce((val) => {
    dispatch({ type: 'SET_SEARCH_NAME', payload: val })
  }, 350), [])

  // fetch attendance
  const fetchAttendanceData = useCallback(async () => {
    try {
      console.log('جاري جلب بيانات الحضور والانصراف...')
      dispatch({ type: 'SET_LOADING', payload: true })

      // إضافة رأس عشوائي لمنع التخزين المؤقت للمتصفح
      const headers = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }

      const res = await fetch('/api/manual-attendance?' + new Date().getTime(), { headers })
      const data = await res.json()
      console.log('استجابة الخادم:', data)

      if (!data || !data.success) {
        throw new Error(data?.message || 'تعذر جلب بيانات الحضور')
      }

      // Normalize data from daily_attendance_summary (has first_check_in, last_check_out)
      const sourceData = data.data || data.records || [];
      const records = [];
      sourceData.forEach(r => {
        const baseId = r.employee_id || r.employeeId || r.id;
        const baseName = r.name || r.first_name ? `${r.first_name || ''} ${r.last_name || ''}`.trim() : `موظف (${baseId})`;

        // Create check-in record if exists
        if (r.first_check_in || r.inTime || r.checkIn) {
          const checkInTime = r.first_check_in || r.inTime || r.checkIn;
          records.push({
            employeeId: baseId,
            employeeName: baseName,
            date: r.date || todayISO(),
            time: checkInTime,
            type: 'check-in',
            notes: r.notes || '',
            status: r.status || 'Present',
            createdAt: r.created_at || new Date().toISOString()
          });
        }

        // Create check-out record if exists
        if (r.last_check_out || r.outTime || r.checkOut) {
          const checkOutTime = r.last_check_out || r.outTime || r.checkOut;
          records.push({
            employeeId: baseId,
            employeeName: baseName,
            date: r.date || todayISO(),
            time: checkOutTime,
            type: 'check-out',
            notes: r.notes || '',
            status: r.status || 'Present',
            createdAt: r.created_at || new Date().toISOString()
          });
        }
      });

      console.log(`تم جلب ${records.length} سجل من الخادم`)

      // التحقق من أن السجلات تحتوي على البيانات المطلوبة
      const validRecords = records.filter(record => 
        record && record.employeeId && record.employeeName && record.date && record.time
      )

      console.log(`عدد السجلات الصالحة: ${validRecords.length} من أصل ${records.length}`)

      dispatch({ type: 'SET_ATTENDANCE', payload: validRecords })

      if (validRecords.length > 0) {
        toast.success(ar(`✅ تم تحديث بيانات الحضور والانصراف (${validRecords.length} سجل)`, `✅ Attendance data updated (${validRecords.length} records)`))
      } else {
        toast(ar('لا توجد سجلات حضور حالية', 'No attendance records currently'), {
          icon: 'ℹ️',
          style: { background: '#3498db', color: '#fff' }
        })
      }
    } catch (err) {
      console.error('خطأ في جلب الحضور:', err)
      dispatch({ type: 'SET_ERROR', payload: err.message || String(err) })
      toast.error('❌ ' + (err.message || ar('خطأ غير متوقع', 'Unexpected error')))
    }
  }, [])

  useEffect(() => {
    fetchAttendanceData()
  }, [fetchAttendanceData])

  const refreshData = async () => {
    dispatch({ type: 'SET_REFRESHING', payload: true })
    await fetchAttendanceData()
    dispatch({ type: 'SET_REFRESHING', payload: false })
    toast.success(ar('🔄 تم تحديث جميع البيانات', '🔄 All data updated'))
  }

  // filtered data according to state
  const filtered = useMemo(() => {
    const sName = state.searchName?.trim().toLowerCase()
    const sMonth = state.searchMonth
    return state.attendance.filter(row => {
      const matchesName = sName ? (row.employeeName || '').toLowerCase().includes(sName) : true
      const matchesMonth = sMonth ? (row.date?.slice(0,7) || '').includes(sMonth) : true
      const matchesDate = state.viewMode === 'today' ? row.date === state.selectedDate : true
      return matchesName && matchesMonth && matchesDate
    }).sort((a,b) => {
      // order by date desc then time desc
      if (a.date === b.date) return b.time.localeCompare(a.time)
      return b.date.localeCompare(a.date)
    })
  }, [state.attendance, state.searchName, state.searchMonth, state.viewMode, state.selectedDate])

  // pagination slice
  const page = state.pagination.page
  const perPage = state.pagination.perPage
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const currentSlice = filtered.slice((page - 1) * perPage, page * perPage)

  // today's stats
  const today = todayISO()
  const todayRecords = state.attendance.filter(r => r.date === today)
  const totalIn = todayRecords.filter(r => r.type === 'check-in').length
  const totalOut = todayRecords.filter(r => r.type === 'check-out').length

  // filtered employees for selection/search in form
  const [searchEmployee, setSearchEmployee] = useState('')
  const filteredEmployees = useMemo(() => {
    const q = searchEmployee.trim().toLowerCase()
    if (!q) return employees
    return employees.filter(emp =>
      (emp.name || '').toLowerCase().includes(q) ||
      (emp.code && emp.code.toString().includes(q)) ||
      (emp.id && emp.id.toString().includes(q))
    )
  }, [employees, searchEmployee])

  // ---------- handlers ----------
  const handleSubmit = async (e) => {
    e.preventDefault()
    const form = state.form
    if (!form.employeeId) {
      toast.error(ar('يرجى اختيار موظف', 'Please select an employee'))
      return
    }

    const employeeData = employees.find(emp => emp.id == form.employeeId)
    const employeeName = employeeData ? employeeData.name : `موظف (${form.employeeId})`

    console.log('إرسال بيانات الحضور:', {
      employeeId: form.employeeId,
      employeeName,
      type: form.type,
      date: form.date,
      time: form.time,
      notes: form.notes
    })

    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const res = await fetch('/api/manual-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: form.employeeId,
          employeeId: form.employeeId,
          type: form.type,
          date: form.date,
          time: form.time,
          check_in: form.type === 'check-in' ? form.time : null,
          check_out: form.type === 'check-out' ? form.time : null,
          notes: form.notes
        })
      })
      const data = await res.json()
      console.log('استجابة الخادم:', data)

      if (!data?.success) {
        throw new Error(data?.message || 'فشل في تسجيل الحضور')
      }

      // إضافة السجل الجديد مباشرة إلى القائمة الحالية
      if (data.record) {
        const newRecord = {
          employeeId: data.record.employeeId,
          employeeName: data.record.employeeName || employeeName,
          date: data.record.date,
          time: data.record.time,
          type: data.record.type,
          notes: data.record.notes || '',
          createdAt: data.record.createdAt || new Date().toISOString()
        }

        dispatch({ type: 'SET_ATTENDANCE', payload: [newRecord, ...state.attendance] })
        console.log('تمت إضافة السجل الجديد مباشرة إلى القائمة')
      }

      toast.success(ar(`✅ تم تسجيل ${form.type === 'check-in' ? 'الحضور' : 'الانصراف'} للموظف ${employeeName} بنجاح`, `✅ ${form.type === 'check-in' ? 'Check-in' : 'Check-out'} recorded for ${employeeName}`))
      dispatch({ type: 'RESET_FORM' })
      dispatch({ type: 'TOGGLE_ADD_MODAL' })

      // تحديث السجلات من الخادم للتأكد من المزامنة
      console.log('تحديث السجلات من الخادم...')
      setTimeout(() => {
        fetchAttendanceData().then(() => {
          console.log('تم تحديث السجلات بنجاح')
        }).catch(err => {
          console.error('خطأ في تحديث السجلات:', err)
        })
      }, 500)
    } catch (err) {
      console.error('خطأ تسجيل الحضور:', err)
      toast.error('❌ ' + (err.message || ar('خطأ أثناء التسجيل', 'Error during recording')))
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const openEmployeeStats = (employeeName) => {
    const records = state.attendance.filter(r => r.employeeName === employeeName)
    const presentDays = new Set(records.map(r => r.date)).size
    const checkIns = records.filter(r => r.type === 'check-in').length
    const checkOuts = records.filter(r => r.type === 'check-out').length
    dispatch({ type: 'SET_STATS_MODAL', payload: { show: true, stats: { name: employeeName, presentDays, checkIns, checkOuts, totalRecords: records.length } } })
  }

  const exportToExcel = () => {
    try {
      const loadingToast = toast.loading('جاري تصدير البيانات...')
      // prepare data sheet
      const dataSheet = filtered.map(r => ({
        'كود الموظف': r.employeeId,
        'اسم الموظف': r.employeeName,
        'التاريخ': r.date,
        'الوقت': r.time,
        'نوع التسجيل': r.type === 'check-in' ? 'حضور' : 'انصراف',
        'ملاحظات': r.notes || '-',
        'تاريخ التسجيل': formatDateLocale(r.createdAt, 'ar-EG')
      }))

      // summary
      const summary = [
        ['تقرير الحضور اليدوي'],
        [`تاريخ الإنشاء: ${formatDateLocale(new Date().toISOString(), 'en-GB')}`],
        [`مرشح: ${state.viewMode === 'today' ? `اليوم ${state.selectedDate}` : state.viewMode === 'monthly' ? `الشهر ${state.searchMonth || '—'}` : 'جميع السجلات'}`],
        [`إجمالي السجلات: ${filtered.length}`],
        []
      ]

      const wb = XLSX.utils.book_new()
      const wsData = XLSX.utils.json_to_sheet(dataSheet, { origin: 'A1' })
      // auto width (simple heuristic)
      const colWidths = Object.keys(dataSheet[0] || {}).map(key => ({ wch: Math.min(Math.max(key.length + 5, 10), 40) }))
      wsData['!cols'] = colWidths

      // prepend summary in a separate sheet
      const wsSummary = XLSX.utils.aoa_to_sheet(summary)
      XLSX.utils.book_append_sheet(wb, wsSummary, 'الملخص')
      XLSX.utils.book_append_sheet(wb, wsData, 'سجلات الحضور')

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `manual_attendance_${new Date().toISOString().split('T')[0]}.xlsx`)

      toast.dismiss(loadingToast)
      toast.success(ar(`تم تصدير ${filtered.length} سجل بنجاح`, `${filtered.length} records exported successfully`))
    } catch (err) {
      console.error('خطأ في التصدير:', err)
      toast.error(ar('❌ حدث خطأ أثناء التصدير', '❌ Error during export'))
    }
  }

  // ---------- render ----------
  return (
    <ProtectedRoute>
      <Layout>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* header */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-800">
                  <i className="fas fa-user-clock text-blue-600"></i>
                  {ar('الحضور والانصراف اليدوي', 'Manual Attendance')}
                </h1>
                <p className="text-gray-600 mt-1">{ar('لوحة إدارة الحضور — تسجيل وعرض وتصدير وحساب إحصائيات.', 'Attendance management — record, view, export, and calculate statistics.')}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => dispatch({ type: 'TOGGLE_ADD_MODAL' })}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-300 shadow-md hover:shadow-lg"
                >
                  <i className="fas fa-plus"></i>
                  <span>{ar('تسجيل جديد', 'New Record')}</span>
                </button>

                <button 
                  onClick={refreshData}
                  disabled={state.isRefreshing}
                  className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {state.isRefreshing ? <i className="fas fa-sync-alt fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
                  <span>{ar('تحديث', 'Refresh')}</span>
                </button>

                <button 
                  onClick={exportToExcel}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-300 shadow-md hover:shadow-lg"
                >
                  <i className="fas fa-file-excel"></i>
                  <span>{ar('تصدير Excel', 'Export Excel')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow-md p-5 flex flex-col items-center justify-center text-center">
              <i className="fas fa-calendar-day text-blue-600 mb-2 text-2xl"></i>
              <div className="text-sm text-gray-500">{ar('تاريخ اليوم', "Today's Date")}</div>
              <div className="text-xl font-bold text-gray-800">{new Date().toLocaleDateString('ar-EG')}</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-5 flex flex-col items-center justify-center text-center">
              <i className="fas fa-sign-in-alt text-green-600 mb-2 text-2xl"></i>
              <div className="text-sm text-gray-500">{ar('الحضور اليوم', "Today's Check-ins")}</div>
              <div className="text-xl font-bold text-gray-800">{totalIn}</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-5 flex flex-col items-center justify-center text-center">
              <i className="fas fa-sign-out-alt text-red-600 mb-2 text-2xl"></i>
              <div className="text-sm text-gray-500">{ar('الانصراف اليوم', "Today's Check-outs")}</div>
              <div className="text-xl font-bold text-gray-800">{totalOut}</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-5 flex flex-col items-center justify-center text-center">
              <i className="fas fa-users text-purple-600 mb-2 text-2xl"></i>
              <div className="text-sm text-gray-500">{ar('إجمالي السجلات', 'Total Records')}</div>
              <div className="text-xl font-bold text-gray-800">{state.attendance.length}</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-5 flex flex-col items-center justify-center text-center">
              <i className="fas fa-clock text-yellow-600 mb-2 text-2xl"></i>
              <div className="text-sm text-gray-500">{ar('سجلات اليوم', "Today's Records")}</div>
              <div className="text-xl font-bold text-gray-800">{todayRecords.length}</div>
            </div>
          </div>

          {/* controls */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex gap-2 flex-wrap">
                {['today','all','monthly'].map(m => (
                  <button 
                    key={m} 
                    onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: m })} 
                    className={`px-4 py-2 rounded-lg transition-colors duration-300 flex items-center gap-2 ${
                      state.viewMode === m 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {m === 'today' ? <i className="fas fa-calendar-day"></i> : m === 'all' ? <i className="fas fa-users"></i> : <i className="fas fa-filter"></i>}
                    {m === 'today' ? ar('اليوم', 'Today') : m === 'all' ? ar('جميع البيانات', 'All Data') : ar('شهري', 'Monthly')}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 items-center flex-wrap">
                {state.viewMode === 'today' && (
                  <div className="relative">
                    <i className="fas fa-calendar absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input 
                      type="date" 
                      value={state.selectedDate} 
                      onChange={e => dispatch({ type: 'SET_SELECTED_DATE', payload: e.target.value })} 
                      className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 p-2.5"
                    />
                  </div>
                )}

                <div className="relative">
                  <i className="fas fa-search absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>                    <input 
                    type="text" 
                    placeholder={ar('بحث باسم الموظف', 'Search by employee name')}  
                    className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 p-2.5 min-w-[220px]"
                    value={localSearchName}
                    onChange={e => {
                      setLocalSearchName(e.target.value)
                      debouncedSetSearch(e.target.value)
                    }}
                  />
                </div>

                {state.viewMode === 'monthly' && (
                  <div className="relative">
                    <i className="fas fa-filter absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input 
                      type="month" 
                      value={state.searchMonth} 
                      onChange={e => dispatch({ type: 'SET_SEARCH_MONTH', payload: e.target.value })} 
                      className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 p-2.5"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* table or empty */}
          {filtered.length > 0 ? (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="p-4 text-right text-gray-700 font-semibold">{ar('كود الموظف', 'Emp Code')}</th>
                      <th className="p-4 text-right text-gray-700 font-semibold">{ar('اسم الموظف', 'Employee')}</th>
                      <th className="p-4 text-right text-gray-700 font-semibold">{ar('التاريخ', 'Date')}</th>
                      <th className="p-4 text-right text-gray-700 font-semibold">{ar('الوقت', 'Time')}</th>
                      <th className="p-4 text-right text-gray-700 font-semibold">{ar('نوع التسجيل', 'Type')}</th>
                      <th className="p-4 text-right text-gray-700 font-semibold">{ar('ملاحظات', 'Notes')}</th>
                      <th className="p-4 text-right text-gray-700 font-semibold">{ar('تاريخ التسجيل', 'Created')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSlice.map((row, i) => (
                      <motion.tr 
                        key={`${row.employeeId}-${i}-${row.createdAt}`} 
                        initial={{ opacity: 0, y: 6 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: i * 0.02 }} 
                        className="border-b hover:bg-gray-50 transition-colors duration-200"
                      >
                        <td className="p-4 font-mono text-gray-700">{row.employeeId}</td>
                        <td className="p-4">
                          <button 
                            onClick={() => openEmployeeStats(row.employeeName)} 
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                          >
                            <i className="fas fa-user"></i>
                            {row.employeeName}
                          </button>
                        </td>
                        <td className="p-4 font-mono text-gray-700 flex items-center gap-1">
                          <i className="fas fa-calendar text-gray-400"></i>
                          {row.date}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit ${
                            row.type === 'check-in' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {row.type === 'check-in' ? <i className="fas fa-sign-in-alt"></i> : <i className="fas fa-sign-out-alt"></i>}
                            {row.time}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            row.type === 'check-in' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {row.type === 'check-in' ? ar('حضور', 'Check-in') : ar('انصراف', 'Check-out')}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600">{row.notes || '-'}</td>
                        <td className="p-4 text-sm text-gray-500">{formatDateLocale(row.createdAt, 'ar-EG')}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* footer: summary + pagination */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 border-t bg-gray-50">
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span>{ar('إجمالي السجلات:', 'Total Records:')}</span>
                    <span className="font-semibold text-gray-800">{filtered.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{ar('حضور:', 'Check-in:')}</span>
                    <span className="font-semibold text-green-600">{filtered.filter(r => r.type === 'check-in').length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{ar('انصراف:', 'Check-out:')}</span>
                    <span className="font-semibold text-blue-600">{filtered.filter(r => r.type === 'check-out').length}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => dispatch({ type: 'SET_PAGE', payload: Math.max(1, page - 1) })}
                    disabled={page === 1}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50 transition-colors duration-200 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>{ar('السابق', 'Previous')}</span>
                  </button>
                  <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium">
                    {ar('صفحة', 'Page')} {page} {ar('من', 'of')} {totalPages}
                  </div>
                  <button 
                    onClick={() => dispatch({ type: 'SET_PAGE', payload: Math.min(totalPages, page + 1) })}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50 transition-colors duration-200 flex items-center gap-1"
                  >
                    <span>{ar('التالي', 'Next')}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4 flex justify-center">
                <i className="fas fa-search text-6xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">{ar('لا توجد سجلات', 'No Records Found')}</h3>
              <p className="text-gray-500">{ar('لم يتم العثور على سجلات للحالة الحالية.', 'No records found for current state.')}</p>
              <button 
                onClick={() => dispatch({ type: 'TOGGLE_ADD_MODAL' })}
                className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-300 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
              >
                <i className="fas fa-plus"></i>
                <span>{ar('إضافة تسجيل جديد', 'Add New Record')}</span>
              </button>
            </div>
          )}

          {/* Add Modal */}
          <AnimatePresence>
            {state.showAddModal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => dispatch({ type: 'TOGGLE_ADD_MODAL' })}>
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
                  <h2 className="text-xl font-bold mb-4">{ar('تسجيل حضور/انصراف يدوي', 'Manual Attendance Recording')}</h2>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* employee search/select */}
                      <div>
                        <label className="block text-sm font-medium mb-2">{ar('اختر الموظف', 'Select Employee')}</label>
                        <input type="text" placeholder={ar('بحث باسم الموظف أو الكود', 'Search by name or code')} value={searchEmployee} onChange={e => setSearchEmployee(e.target.value)} className="neu-input w-full mb-2" />
                        <div className="max-h-48 overflow-y-auto border rounded">
                          {filteredEmployees.slice(0, 100).map(emp => (
                            <div key={emp.id} className={`p-3 cursor-pointer hover:bg-gray-50 ${state.form.employeeId == emp.id ? 'bg-blue-50' : ''}`} onClick={() => dispatch({ type: 'SET_FORM', payload: { employeeId: emp.id } })}>
                              <div className="font-medium">{emp.name}</div>
                              <div className="text-xs text-gray-500">{emp.code ? `كود: ${emp.code}` : `معرف: ${emp.id}`}{emp.department ? ` - ${emp.department}` : ''}</div>
                            </div>
                          ))}
                          {filteredEmployees.length === 0 && <div className="p-3 text-gray-500">لا يوجد موظفين مطابقين</div>}
                        </div>
                        {state.form.employeeId && (
                          <div className="mt-2 p-2 bg-blue-50 rounded">
                            <div className="font-medium">{employees.find(x => x.id == state.form.employeeId)?.name || state.form.employeeId}</div>
                          </div>
                        )}
                      </div>

                      {/* type, date, time */}
                      <div>
                        <label className="block text-sm font-medium mb-2">{ar('نوع التسجيل', 'Record Type')}</label>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <button type="button" onClick={() => dispatch({ type: 'SET_FORM', payload: { type: 'check-in' } })} className={`p-3 rounded border ${state.form.type === 'check-in' ? 'bg-green-50 border-green-400' : 'bg-white'}`}>{ar('حضور', 'Check-in')}</button>
                          <button type="button" onClick={() => dispatch({ type: 'SET_FORM', payload: { type: 'check-out' } })} className={`p-3 rounded border ${state.form.type === 'check-out' ? 'bg-blue-50 border-blue-400' : 'bg-white'}`}>{ar('انصراف', 'Check-out')}</button>
                        </div>

                        <label className="block text-sm font-medium mb-2">{ar('التاريخ', 'Date')}</label>
                        <input type="date" value={state.form.date} onChange={e => dispatch({ type: 'SET_FORM', payload: { date: e.target.value } })} className="neu-input mb-2 w-full" required />

                        <label className="block text-sm font-medium mb-2">{ar('الوقت', 'Time')}</label>
                        <input type="time" value={state.form.time} onChange={e => dispatch({ type: 'SET_FORM', payload: { time: e.target.value } })} className="neu-input w-full" required />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">{ar('ملاحظات (اختياري)', 'Notes (optional)')}</label>
                      <textarea value={state.form.notes} onChange={e => dispatch({ type: 'SET_FORM', payload: { notes: e.target.value } })} className="neu-input w-full h-24" placeholder={ar('أضف ملاحظات...', 'Add notes...')} />
                    </div>

                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => { dispatch({ type: 'TOGGLE_ADD_MODAL' }); dispatch({ type: 'RESET_FORM' }) }} className="neu-btn-secondary px-6 py-2">{ar('إلغاء', 'Cancel')}</button>
                      <button type="submit" disabled={state.loading || !state.form.employeeId} className="neu-btn-primary px-6 py-2">
                        {state.loading ? <>{ar('جاري التسجيل...', 'Saving...')}</> : <>{state.form.type === 'check-in' ? ar('تسجيل حضور', 'Check-in') : ar('تسجيل انصراف', 'Check-out')}</>}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Employee stats modal */}
          <AnimatePresence>
            {state.showStatsModal && state.employeeStats && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => dispatch({ type: 'SET_STATS_MODAL', payload: { show: false } })}>
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 mx-auto flex items-center justify-center mb-2">
                      <i className="fas fa-user text-white"></i>
                    </div>
                    <h3 className="text-xl font-bold">{state.employeeStats.name}</h3>
                    <p className="text-gray-600">{ar('إحصائيات الحضور والانصراف', 'Attendance Statistics')}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-green-50 rounded text-center">
                      <div className="text-2xl font-bold text-green-600">{state.employeeStats.presentDays}</div>
                      <div className="text-sm text-gray-600">{ar('أيام الحضور', 'Present Days')}</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded text-center">
                      <div className="text-2xl font-bold text-blue-600">{state.employeeStats.totalRecords}</div>
                      <div className="text-sm text-gray-600">{ar('إجمالي السجلات', 'Total Records')}</div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded text-center">
                      <div className="text-2xl font-bold text-yellow-600">{state.employeeStats.checkIns}</div>
                      <div className="text-sm text-gray-600">{ar('سجلات الحضور', 'Check-ins')}</div>
                    </div>
                    <div className="p-3 bg-orange-50 rounded text-center">
                      <div className="text-2xl font-bold text-orange-600">{state.employeeStats.checkOuts}</div>
                      <div className="text-sm text-gray-600">{ar('سجلات الانصراف', 'Check-outs')}</div>
                    </div>
                  </div>

                  <button onClick={() => dispatch({ type: 'SET_STATS_MODAL', payload: { show: false } })} className="w-full mt-6 neu-btn-primary py-3">
                    {ar('إغلاق', 'Close')}
                  </button>
                </motion.div>

              </motion.div>
            )}
          </AnimatePresence>
          
        </motion.div>
      </Layout>
    </ProtectedRoute>
  )
}

// ---------- small presentational components ----------
function StatCard({ label, value, icon, color = 'from-blue-500 to-blue-600' }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={`neu-card p-6 bg-gradient-to-r ${color} text-white relative overflow-hidden`}>
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <h3 className="text-sm opacity-90">{label}</h3>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <i className={`${icon} text-3xl opacity-80`}></i>
      </div>
      <div className="absolute -bottom-6 -right-6 opacity-10 text-6xl">
        <i className={icon}></i>
      </div>
    </motion.div>

  )
}
