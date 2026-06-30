import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    generateSampleNotifications()
    const interval = setInterval(() => addRandomNotification(), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length)
  }, [notifications])

  const generateSampleNotifications = () => {
    const now = Date.now()
    setNotifications([
      { id: 1, title: 'تسجيل حضور جديد', message: 'تم تسجيل حضور الموظف أحمد محمد في الساعة 08:30 ص', type: 'info', time: new Date(now - 5 * 60 * 1000), read: false, important: false, icon: 'fa-clock' },
      { id: 2, title: 'موعد اجتماع قريب', message: 'لديك اجتماع فريق التطوير خلال 15 دقيقة', type: 'warning', time: new Date(now - 10 * 60 * 1000), read: false, important: true, icon: 'fa-users' },
      { id: 3, title: 'تقرير شهري جاهز', message: 'تم إنشاء تقرير الحضور الشهري بنجاح', type: 'success', time: new Date(now - 30 * 60 * 1000), read: true, important: false, icon: 'fa-file-alt' },
      { id: 4, title: 'خطأ في النظام', message: 'فشل في الاتصال بجهاز البصمة الرئيسي', type: 'error', time: new Date(now - 60 * 60 * 1000), read: false, important: true, icon: 'fa-exclamation-triangle' },
      { id: 5, title: 'طلب إجازة جديد', message: 'تم تقديم طلب إجازة من الموظفة فاطمة أحمد', type: 'info', time: new Date(now - 2 * 60 * 60 * 1000), read: true, important: false, icon: 'fa-calendar-times' },
    ])
  }

  const addRandomNotification = () => {
    const randomNotifs = [
      { title: 'تسجيل انصراف', message: 'تم تسجيل انصراف موظف جديد', type: 'info', icon: 'fa-sign-out-alt' },
      { title: 'تحديث النظام', message: 'تم تحديث النظام إلى الإصدار الجديد', type: 'success', icon: 'fa-sync' },
      { title: 'تذكير مهم', message: 'لا تنس مراجعة التقارير اليومية', type: 'warning', icon: 'fa-bell' },
    ]
    const n = randomNotifs[Math.floor(Math.random() * randomNotifs.length)]
    setNotifications(prev => [{
      id: Date.now(),
      ...n,
      time: new Date(),
      read: false,
      important: Math.random() > 0.7,
    }, ...prev])
  }

  const markAsRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  const markAllAsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  const deleteNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id))
  const clearAll = () => setNotifications([])

  const getFiltered = () => {
    switch (filter) {
      case 'unread': return notifications.filter(n => !n.read)
      case 'important': return notifications.filter(n => n.important)
      default: return notifications
    }
  }

  const getTimeAgo = (time) => {
    const diff = Math.floor((Date.now() - time) / (1000 * 60))
    if (diff < 1) return 'الآن'
    if (diff < 60) return `منذ ${diff} دقيقة`
    const hrs = Math.floor(diff / 60)
    if (hrs < 24) return `منذ ${hrs} ساعة`
    return `منذ ${Math.floor(hrs / 24)} يوم`
  }

  const getTypeStyle = (type) => {
    switch (type) {
      case 'success': return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200/50' }
      case 'warning': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200/50' }
      case 'error': return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200/50' }
      default: return { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200/50' }
    }
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 rounded-xl border border-surface-200 bg-surface-50 flex items-center justify-center
                   text-surface-500 hover:bg-white hover:text-brand-600 hover:border-brand-200 transition-all duration-200"
      >
        <i className="fas fa-bell text-sm"></i>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-rose-500 to-rose-600 text-white text-[9px] font-bold
                       rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg shadow-rose-500/20"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 mt-2 w-[380px] bg-white/95 backdrop-blur-xl rounded-3xl border border-surface-200
                         shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-surface-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
                      <i className="fas fa-bell text-brand-600 text-sm"></i>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-surface-900">الإشعارات</h3>
                      <p className="text-[10px] font-bold text-surface-400">{unreadCount} غير مقروءة</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead}
                        className="px-2.5 py-1.5 rounded-lg bg-surface-50 text-[10px] font-bold text-surface-500
                                   hover:bg-brand-50 hover:text-brand-600 transition-all">
                        قراءة الكل
                      </button>
                    )}
                    <button onClick={clearAll}
                      className="px-2.5 py-1.5 rounded-lg bg-surface-50 text-[10px] font-bold text-surface-500
                                 hover:bg-rose-50 hover:text-rose-500 transition-all">
                      مسح
                    </button>
                  </div>
                </div>
                {/* Filter chips */}
                <div className="flex gap-1.5">
                  {[
                    { key: 'all', label: 'الكل' },
                    { key: 'unread', label: 'غير مقروءة' },
                    { key: 'important', label: 'مهمة' },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 ${
                        filter === f.key
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'bg-surface-50 text-surface-500 hover:bg-surface-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              <div className="max-h-[360px] overflow-y-auto p-2">
                {getFiltered().length > 0 ? getFiltered().map((n, i) => {
                  const ts = getTypeStyle(n.type)
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`group relative flex items-start gap-3 p-3 rounded-2xl transition-all duration-200 cursor-pointer
                        ${!n.read ? 'bg-brand-50/40' : 'hover:bg-surface-50'}`}
                    >
                      {/* Unread dot */}
                      {!n.read && (
                        <span className="absolute top-3.5 right-1 w-1.5 h-1.5 rounded-full bg-brand-500" />
                      )}

                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl ${ts.bg} ${ts.text} flex items-center justify-center flex-shrink-0 border ${ts.border}`}>
                        <i className={`fas ${n.icon} text-sm`}></i>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-xs font-bold leading-snug ${!n.read ? 'text-surface-900' : 'text-surface-600'}`}>
                            {n.title}
                            {n.important && <i className="fas fa-star text-amber-500 mr-1 text-[9px]"></i>}
                          </h4>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            {!n.read && (
                              <button onClick={() => markAsRead(n.id)}
                                className="w-6 h-6 rounded-lg hover:bg-emerald-50 text-surface-400 hover:text-emerald-500 transition-all flex items-center justify-center">
                                <i className="fas fa-check text-[9px]"></i>
                              </button>
                            )}
                            <button onClick={() => deleteNotification(n.id)}
                              className="w-6 h-6 rounded-lg hover:bg-rose-50 text-surface-400 hover:text-rose-500 transition-all flex items-center justify-center">
                              <i className="fas fa-times text-[9px]"></i>
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-surface-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                        <p className="text-[9px] text-surface-400 font-bold mt-1.5">{getTimeAgo(n.time)}</p>
                      </div>
                    </motion.div>
                  )
                }) : (
                  <div className="py-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-surface-50 flex items-center justify-center mx-auto mb-3">
                      <i className="fas fa-bell-slash text-surface-300 text-xl"></i>
                    </div>
                    <p className="text-sm font-bold text-surface-500">لا توجد إشعارات</p>
                    <p className="text-xs text-surface-400 font-medium mt-1">ستظهر الإشعارات هنا عند ورودها</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-3 border-t border-surface-100 text-center bg-surface-50/50">
                  <button className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors">
                    عرض جميع الإشعارات
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationCenter
