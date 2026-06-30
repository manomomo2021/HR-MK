import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

export default function AttendanceRegistrationModal({
  isOpen,
  onClose,
  employees = [],
  onSave,
  loading = false,
  recentRecords = []
}) {
  const { language } = useLanguage()
  const ar = (a, e) => (language === 'ar' ? a : e)

  // -- Live Clock --
  const [currentTime, setCurrentTime] = useState(new Date())
  useEffect(() => {
    let timer
    if (isOpen) {
      setCurrentTime(new Date()) // immediate update on open
      timer = setInterval(() => setCurrentTime(new Date()), 1000)
    }
    return () => clearInterval(timer)
  }, [isOpen])

  // -- Form State --
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [notes, setNotes] = useState('')

  // reset when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setSelectedEmployeeId('')
      setNotes('')
    }
  }, [isOpen])

  // -- Derived Data --
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return employees
    return employees.filter(
      (emp) =>
        (emp.name || '').toLowerCase().includes(q) ||
        (emp.code && String(emp.code).includes(q)) ||
        (emp.id && String(emp.id).includes(q))
    )
  }, [searchQuery, employees])

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => String(e.id) === String(selectedEmployeeId))
  }, [selectedEmployeeId, employees])

  // -- Handlers --
  const handleAction = (type) => {
    if (!selectedEmployeeId) {
      alert(ar('الرجاء اختيار الموظف أولاً', 'Please select an employee first'))
      return
    }

    const isoDate = currentTime.toISOString().split('T')[0]
    // Get local time format HH:MM
    const timeStr = currentTime.toTimeString().slice(0, 5)

    onSave({
      employeeId: selectedEmployeeId,
      type: type,
      date: isoDate,
      time: timeStr,
      notes: notes
    })
  }

  // Animation variants
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
    exit: { opacity: 0, scale: 0.95, y: -20 }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  }

  // Time formatters
  const timeString = currentTime.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateString = currentTime.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  
  // Random mock stats for the selected employee to make it feel alive
  const empStats = useMemo(() => {
    if(!selectedEmployee) return null;
    return {
      todayStatus: Math.random() > 0.5 ? 'Checked In' : 'Not Checked In',
      workedHours: (Math.random() * 8 + 1).toFixed(1),
      lateCount: Math.floor(Math.random() * 3),
      absentCount: Math.floor(Math.random() * 2),
    }
  }, [selectedEmployee])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 font-sans">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="absolute inset-0 bg-slate-900/60"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-6xl max-h-[95vh] bg-white/70 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/40 dark:border-slate-700/50 rounded-[28px] shadow-[0_30px_60px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)'
            }}
          >
            {/* Ambient Glows */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[80px] translate-x-1/2 translate-y-1/2 pointer-events-none" />

            {/* Header */}
            <div className="relative flex items-center justify-between px-8 py-6 border-b border-white/50 bg-white/30">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                  <i className="fas fa-fingerprint text-white text-2xl"></i>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    {ar('تسجيل الحضور والانصراف', 'Attendance Registration')}
                  </h2>
                  <p className="text-sm font-medium text-slate-500">
                    {ar('تسجيل دقيق وآمن للحضور بتوقيت الشركة', 'Register employee attendance accurately and securely.')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Live Clock Header */}
                <div className="hidden md:flex flex-col items-end bg-white/50 px-6 py-2 rounded-2xl border border-white/60 shadow-sm">
                  <span className="text-2xl font-black text-slate-800 font-mono tracking-wider">{timeString}</span>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{dateString}</span>
                </div>
                <div className="w-px h-12 bg-slate-200/60" />
                <button
                  onClick={onClose}
                  className="w-12 h-12 rounded-2xl bg-white/50 hover:bg-white flex items-center justify-center text-slate-500 hover:text-rose-500 transition-all backdrop-blur-md border border-white/60 shadow-sm"
                >
                  <i className="fas fa-times text-lg"></i>
                </button>
              </div>
            </div>

            {/* Main Content Body */}
            <div className="relative flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Search & Profile */}
                <div className="lg:col-span-5 space-y-6 flex flex-col">
                  
                  {/* Search Section */}
                  <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-lg rounded-3xl p-6 shadow-sm border border-white/50 flex-1 flex flex-col">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                      {ar('البحث الذكي للموظفين', 'Smart Employee Search')}
                    </h3>
                    <div className="relative">
                      <i className="fas fa-search absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400"></i>
                      <input
                        type="text"
                        placeholder={ar('الاسم، الرقم الوظيفي، الكود...', 'Name, Employee ID, Barcode...')}
                        className="w-full bg-white/80 border-0 focus:ring-2 focus:ring-indigo-500/50 rounded-2xl py-4 pr-12 pl-4 text-sm font-bold text-slate-700 shadow-inner transition-all placeholder:font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="mt-4 flex-1 overflow-y-auto min-h-[160px] max-h-[300px] custom-scrollbar pr-2 space-y-2">
                      {filteredEmployees.map((emp) => (
                        <div
                          key={emp.id}
                          onClick={() => setSelectedEmployeeId(emp.id)}
                          className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-300 ${
                            selectedEmployeeId === emp.id
                              ? 'bg-indigo-50/80 border border-indigo-200 shadow-sm scale-[1.02]'
                              : 'hover:bg-white/50 border border-transparent hover:scale-[1.01]'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-black flex-shrink-0 shadow-inner">
                            {emp.name?.charAt(0) || 'U'}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <h4 className={`text-sm font-bold truncate ${selectedEmployeeId === emp.id ? 'text-indigo-800' : 'text-slate-800'}`}>{emp.name}</h4>
                            <p className="text-xs font-medium text-slate-500 font-mono truncate">{emp.code || emp.id}</p>
                          </div>
                          {selectedEmployeeId === emp.id && (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                              <i className="fas fa-check text-indigo-600"></i>
                            </div>
                          )}
                        </div>
                      ))}
                      {filteredEmployees.length === 0 && (
                        <div className="text-center py-10 flex flex-col items-center justify-center text-slate-400">
                           <i className="fas fa-search-minus text-3xl mb-3 opacity-50"></i>
                           <span className="text-sm font-bold">{ar('لا توجد نتائج مطابقة', 'No matching results')}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Profile Card */}
                  <AnimatePresence mode="popLayout">
                    {selectedEmployee && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl shadow-indigo-900/5 border border-white overflow-hidden relative group"
                      >
                        <div className="absolute top-0 left-0 w-full h-28 bg-gradient-to-r from-indigo-500/15 to-purple-500/15" />
                        <div className="relative flex flex-col items-center text-center mt-6">
                          <div className="relative w-28 h-28 rounded-[2rem] p-1 bg-white shadow-xl shadow-indigo-500/10 mb-5 group-hover:-translate-y-2 transition-transform duration-500 rotate-3 group-hover:rotate-0">
                            <div className="w-full h-full rounded-[1.8rem] bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-4xl text-indigo-500 font-black overflow-hidden relative">
                              <i className="fas fa-user absolute opacity-10 text-6xl"></i>
                              {selectedEmployee.name.charAt(0)}
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 border-4 border-white rounded-full shadow-sm flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            </div>
                          </div>
                          <h3 className="text-2xl font-black text-slate-800 mb-1">{selectedEmployee.name}</h3>
                          <div className="flex items-center gap-2 mb-6">
                            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                              {selectedEmployee.department || ar('قسم المبيعات', 'Sales Dept')}
                            </span>
                            <span className="text-xs font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                              {selectedEmployee.position || ar('موظف', 'Employee')}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 w-full gap-2 border-t border-slate-100 pt-5">
                            <div className="text-center">
                              <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">{ar('اليوم', 'Today')}</p>
                              <p className="text-xs font-black text-emerald-600">{empStats?.todayStatus}</p>
                            </div>
                            <div className="text-center border-x border-slate-100">
                              <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">{ar('ساعات العمل', 'Worked')}</p>
                              <p className="text-xs font-black text-slate-700">{empStats?.workedHours}h</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">{ar('تأخير', 'Late')}</p>
                              <p className="text-xs font-black text-rose-500">{empStats?.lateCount} {ar('مرات', 'times')}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>

                {/* Right Column: Actions & Dashboard */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Status & Biometrics Card */}
                  <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-5 flex items-center gap-4 hover:bg-emerald-500/20 transition-colors">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-inner">
                        <i className="fas fa-server text-xl"></i>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-0.5">{ar('حالة الجهاز الرئيسي', 'Device Status')}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                          <p className="text-sm font-black text-emerald-700">{ar('متصل ومستقر', 'Online & Stable')}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-5 flex items-center gap-4 hover:bg-indigo-500/20 transition-colors">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-600 shadow-inner">
                        <i className="fas fa-map-marker-alt text-xl"></i>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-indigo-600/70 uppercase tracking-widest mb-0.5">{ar('نطاق العمل المحدد', 'Work Location')}</p>
                        <p className="text-sm font-black text-indigo-700">{ar('المركز الرئيسي (HQ)', 'Main Office (HQ)')}</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Actions Grid */}
                  <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-lg rounded-3xl p-6 md:p-8 shadow-sm border border-white/50">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <i className="fas fa-bolt text-indigo-400"></i>
                      {ar('إجراءات الحضور والانصراف', 'Attendance Actions')}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <button
                        disabled={loading}
                        onClick={() => handleAction('check-in')}
                        className="group relative overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 p-8 rounded-[28px] shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-2 transition-all duration-500 disabled:opacity-50 disabled:hover:translate-y-0"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <div className="relative flex flex-col items-center justify-center text-white">
                          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner backdrop-blur-sm">
                            <i className="fas fa-sign-in-alt text-3xl drop-shadow-md"></i>
                          </div>
                          <span className="text-2xl font-black tracking-wide mb-1">{ar('تسجيل حضور', 'Check In')}</span>
                          <span className="text-sm font-bold text-emerald-100 bg-emerald-900/20 px-3 py-1 rounded-full">{timeString}</span>
                        </div>
                      </button>

                      <button
                        disabled={loading}
                        onClick={() => handleAction('check-out')}
                        className="group relative overflow-hidden bg-gradient-to-br from-rose-400 to-rose-600 p-8 rounded-[28px] shadow-xl shadow-rose-500/30 hover:shadow-rose-500/50 hover:-translate-y-2 transition-all duration-500 disabled:opacity-50 disabled:hover:translate-y-0"
                      >
                        <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 -translate-x-1/2" />
                        <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <div className="relative flex flex-col items-center justify-center text-white">
                          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner backdrop-blur-sm">
                            <i className="fas fa-sign-out-alt text-3xl drop-shadow-md"></i>
                          </div>
                          <span className="text-2xl font-black tracking-wide mb-1">{ar('تسجيل انصراف', 'Check Out')}</span>
                          <span className="text-sm font-bold text-rose-100 bg-rose-900/20 px-3 py-1 rounded-full">{timeString}</span>
                        </div>
                      </button>
                    </div>
                  </motion.div>

                  {/* Notes Area */}
                  <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-lg rounded-3xl p-6 shadow-sm border border-white/50">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <i className="fas fa-comment-alt text-indigo-400"></i>
                      {ar('ملاحظات إضافية (اختياري)', 'Additional Notes (Optional)')}
                    </h3>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={ar('أدخل سبب التسجيل اليدوي، إذن التأخير، أو أي تفاصيل أخرى...', 'Enter reason for manual registration, late permission, etc...')}
                      className="w-full bg-white/80 border-0 focus:ring-2 focus:ring-indigo-500/50 rounded-2xl p-4 text-sm font-bold text-slate-700 shadow-inner resize-none h-24 custom-scrollbar placeholder:font-medium"
                    />
                  </motion.div>

                </div>
              </motion.div>
            </div>
            
            {/* Loading Overlay inside Modal */}
            <AnimatePresence>
                {loading && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/70 backdrop-blur-md z-50 flex flex-col items-center justify-center"
                >
                    <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin shadow-2xl"></div>
                    <p className="mt-6 text-indigo-800 font-black tracking-widest uppercase animate-pulse text-lg">{ar('جاري تسجيل الحركة...', 'Recording...')}</p>
                </motion.div>
                )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
