import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

export default function EmployeeDrawer({ isOpen, onClose, employeeStats, records }) {
  const { language } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e

  if (!isOpen || !employeeStats) return null

  // Sort records for timeline
  const timelineRecords = [...(records || [])].sort((a, b) => {
    return new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time)
  }).slice(0, 10) // Show last 10 records in timeline

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: language === 'ar' ? '-100%' : '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: language === 'ar' ? '-100%' : '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed top-0 bottom-0 ${language === 'ar' ? 'left-0 border-r' : 'right-0 border-l'} w-full max-w-md bg-white border-surface-200 shadow-2xl z-[110] flex flex-col overflow-hidden`}
          >
            {/* Header */}
            <div className="relative p-6 bg-gradient-to-br from-brand-900 to-accent-900 text-white overflow-hidden">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              
              <div className="relative flex justify-between items-start">
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl font-black shadow-lg">
                    {employeeStats.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">{employeeStats.name}</h2>
                    <p className="text-brand-100 text-xs font-medium mt-1 opacity-90">{ar('الملف الشخصي للحضور', 'Attendance Profile')}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] backdrop-blur-md font-bold">
                        {ar('إدارة تقنية المعلومات', 'IT Department')}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
                >
                  <i className="fas fa-times text-sm"></i>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-surface-50 p-6 space-y-6 custom-scrollbar">
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-sm flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                    <i className="fas fa-calendar-check"></i>
                  </div>
                  <span className="text-2xl font-black text-surface-900">{employeeStats.presentDays}</span>
                  <span className="text-[10px] font-bold text-surface-500 mt-1 uppercase">{ar('أيام الحضور', 'Present Days')}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-sm flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-2">
                    <i className="fas fa-clock"></i>
                  </div>
                  <span className="text-2xl font-black text-surface-900">{employeeStats.totalRecords}</span>
                  <span className="text-[10px] font-bold text-surface-500 mt-1 uppercase">{ar('إجمالي الحركات', 'Total Records')}</span>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-sm font-black text-surface-900 mb-4 flex items-center gap-2">
                  <i className="fas fa-stream text-brand-500"></i> {ar('السجل الزمني الحديث', 'Recent Timeline')}
                </h3>
                
                <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-sm">
                  <div className="space-y-6 relative before:absolute before:inset-y-2 before:left-3.5 before:w-0.5 before:bg-surface-100 ar-before-right">
                    {timelineRecords.length > 0 ? timelineRecords.map((rec, idx) => (
                      <div key={idx} className="relative flex gap-4 rtl:pr-10 ltr:pl-10">
                        <div className={`absolute top-0.5 ${language === 'ar' ? 'right-0' : 'left-0'} w-7 h-7 rounded-full flex items-center justify-center text-[10px] ring-4 ring-white z-10 ${rec.type === 'check-in' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                          <i className={`fas ${rec.type === 'check-in' ? 'fa-sign-in-alt' : 'fa-sign-out-alt'}`}></i>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold text-surface-900">
                              {rec.type === 'check-in' ? ar('تسجيل دخول', 'Check In') : ar('تسجيل خروج', 'Check Out')}
                            </h4>
                            <span className="text-[10px] font-mono bg-surface-100 text-surface-600 px-2 py-0.5 rounded font-bold">
                              {rec.time}
                            </span>
                          </div>
                          <p className="text-xs text-surface-500 mt-1">{rec.date}</p>
                          {rec.notes && (
                            <div className="mt-2 text-xs text-surface-600 bg-surface-50 p-2 rounded-lg border border-surface-100 italic">
                              "{rec.notes}"
                            </div>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-4 text-surface-500 text-xs">
                        {ar('لا توجد سجلات حديثة', 'No recent records')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Device / GPS Mock */}
              <div>
                <h3 className="text-sm font-black text-surface-900 mb-4 flex items-center gap-2">
                  <i className="fas fa-shield-alt text-brand-500"></i> {ar('حالة الأجهزة والموقع', 'Device & Location')}
                </h3>
                <div className="bg-white border border-surface-200 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-surface-700">
                      <i className="fas fa-mobile-alt text-surface-400 w-5"></i>
                      <span className="font-medium">{ar('جهاز موثق', 'Trusted Device')}</span>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded font-bold">{ar('نشط', 'Active')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-surface-700">
                      <i className="fas fa-map-marker-alt text-surface-400 w-5"></i>
                      <span className="font-medium">{ar('النطاق الجغرافي', 'Geo-Fencing')}</span>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded font-bold">{ar('مطابق', 'Matched')}</span>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
