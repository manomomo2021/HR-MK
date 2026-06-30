import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { motion, AnimatePresence } from 'framer-motion'
import NotificationCenter from './NotificationCenter'

const NAV_GROUPS_AR = [
  {
    label: 'الرئيسية',
    items: [
      { key: 'dashboard', href: '/dashboard', icon: 'fa-house-chimney', label_ar: 'الرئيسية', label_en: 'Home' },
    ]
  },
  {
    label: 'الموظفون',
    items: [
      { key: 'employees', href: '/employees', icon: 'fa-users', label_ar: 'الموظفون', label_en: 'Employees' },
      { key: 'profile', href: '/profile', icon: 'fa-circle-user', label_ar: 'الملف الشخصي', label_en: 'Profile' },
      { key: 'users', href: '/users', icon: 'fa-shield-halved', label_ar: 'المستخدمون', label_en: 'Users' },
    ]
  },
  {
    label: 'الحضور',
    items: [
      { key: 'attendance-registration', href: '/attendance-registration', icon: 'fa-calendar-check', label_ar: 'تسجيل الحضور', label_en: 'Registration' },
      { key: 'attendance-history', href: '/attendance-history', icon: 'fa-clock-rotate-left', label_ar: 'سجل الحركات', label_en: 'History' },
      { key: 'devices', href: '/biometric-devices', icon: 'fa-microchip', label_ar: 'الأجهزة', label_en: 'Devices' },
    ]
  },
  {
    label: 'الإجازات',
    items: [
      { key: 'leaves', href: '/annual-leaves', icon: 'fa-umbrella-beach', label_ar: 'أرصدة الإجازات', label_en: 'Leave Balances' },
      { key: 'leave-req', href: '/leave-registration', icon: 'fa-file-signature', label_ar: 'طلب الإجازة', label_en: 'Leave Request' },
    ]
  },
  {
    label: 'المالية',
    items: [
      { key: 'payroll', href: '/payroll', icon: 'fa-money-check-dollar', label_ar: 'رواتب الموظفين', label_en: 'Payroll' },
      { key: 'loans', href: '/loans', icon: 'fa-hand-holding-dollar', label_ar: 'السلف والقروض', label_en: 'Loans' },
    ]
  },
  {
    label: 'التحليلات',
    items: [
      { key: 'performance', href: '/performance', icon: 'fa-chart-line', label_ar: 'الأداء', label_en: 'Performance' },
      { key: 'analytics', href: '/analytics', icon: 'fa-chart-pie', label_ar: 'التحليلات', label_en: 'Analytics' },
      { key: 'reports', href: '/reports', icon: 'fa-file-chart-column', label_ar: 'التقارير', label_en: 'Reports' },
      { key: 'calendar', href: '/calendar', icon: 'fa-calendar-days', label_ar: 'التقويم', label_en: 'Calendar' },
    ]
  },
  {
    label: 'النظام',
    items: [
      { key: 'settings', href: '/settings', icon: 'fa-sliders', label_ar: 'الإعدادات', label_en: 'Settings' },
    ]
  },
]

const NAV_GROUPS_EN = NAV_GROUPS_AR.map(g => ({
  ...g,
  label: { 'الرئيسية': 'Main', 'الموظفون': 'Employees', 'الحضور': 'Attendance', 'الإجازات': 'Leaves', 'المالية': 'Finance', 'التحليلات': 'Analytics', 'النظام': 'System' }[g.label] || g.label,
}))

const ALL_ITEMS = NAV_GROUPS_AR.flatMap(g => g.items)

const createNavVariants = (isRtl) => ({
  hidden: { opacity: 0, x: isRtl ? 15 : -15 },
  show: (i) => ({ opacity: 1, x: 0, transition: { delay: i * 0.03, duration: 0.3, ease: [0.16, 1, 0.3, 1] } }),
})

const QUICK_ACTIONS_AR = [
  { href: '/employees', icon: 'fa-user-plus', label: 'موظف جديد', label_en: 'New Employee', gradient: 'from-brand-500 to-brand-600' },
  { href: '/attendance-registration', icon: 'fa-calendar-check', label: 'تسجيل حضور', label_en: 'Attendance', gradient: 'from-emerald-500 to-emerald-600' },
  { href: '/leave-registration', icon: 'fa-file-signature', label: 'طلب إجازة', label_en: 'Leave', gradient: 'from-violet-500 to-violet-600' },
  { href: '/payroll', icon: 'fa-money-check-dollar', label: 'الرواتب', label_en: 'Payroll', gradient: 'from-amber-500 to-amber-600' },
]

const SidebarContent = ({ collapsed, setCollapsed, isMobile, onClose, isHovered, setIsHovered }) => {
  const { user, logout } = useAuth()
  const { language, toggleLanguage, isRtl } = useLanguage()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)

  const effectivelyExpanded = (!collapsed && !isMobile) || isMobile || isHovered
  const showFull = effectivelyExpanded
  const NAV_GROUPS = isRtl ? NAV_GROUPS_AR : NAV_GROUPS_EN
  const QUICK_ACTIONS = isRtl ? QUICK_ACTIONS_AR : QUICK_ACTIONS_AR.map(a => ({ ...a, label: a.label_en }))

  const handleLogout = () => {
    if (window.confirm(isRtl ? 'هل تريد تسجيل الخروج من النظام؟' : 'Are you sure you want to logout?')) logout()
  }

  const filteredGroups = searchQuery
    ? NAV_GROUPS.map(g => ({ ...g, items: g.items.filter(i => i.label_ar?.includes(searchQuery) || i.label_en?.toLowerCase().includes(searchQuery.toLowerCase()) || i.key.includes(searchQuery)) })).filter(g => g.items.length > 0)
    : NAV_GROUPS

  const navVariants = createNavVariants(isRtl)

  return (
    <div className="flex flex-col h-full relative" dir={isRtl ? 'rtl' : 'ltr'}
      onMouseEnter={() => { if (collapsed && !isMobile) setIsHovered(true) }}
      onMouseLeave={() => { if (collapsed && !isMobile) { setIsHovered(false); setShowQuickActions(false) } }}>
      {/* LOGO */}
      <div className="relative flex-shrink-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-600/5 via-transparent to-transparent" />
        <div className={`absolute -top-16 ${isRtl ? '-right-16' : '-left-16'} w-32 h-32 rounded-full bg-brand-500/5 blur-2xl`} />
        <div className={`relative flex items-center ${showFull ? 'px-5 pt-5 pb-3' : 'px-3 pt-5 pb-3'} ${isMobile ? 'px-5' : ''}`}>
          <Link href="/dashboard">
            <motion.div className="flex items-center gap-3 cursor-pointer group" onClick={onClose} whileHover={{ scale: 1.02 }}>
              <div className="relative flex-shrink-0">
                <motion.div animate={{ rotate: [0, -8, 0, 8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-brand-sm relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #6d4aff, #5930e5)' }}>
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent" />
                  <i className="fas fa-gem text-white text-sm relative z-10 drop-shadow-sm"></i>
                </motion.div>
                <div className="absolute -inset-1 rounded-2xl bg-brand-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}
                  className={`absolute -bottom-0.5 ${isRtl ? '-right-0.5' : '-left-0.5'} w-3 h-3 bg-emerald-500 rounded-full border-[2.5px] border-white shadow-sm shadow-emerald-500/30`} />
              </div>
              {showFull && (
                <motion.div initial={{ opacity: 0, x: isRtl ? -10 : 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRtl ? -10 : 10 }} transition={{ duration: 0.2 }}>
                  <p className="text-base font-black text-surface-900 tracking-tight leading-none">HR MK</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[8px] font-bold text-brand-500 uppercase tracking-[0.15em] bg-brand-50 px-1.5 py-0.5 rounded">Enterprise</span>
                    <span className="text-[8px] text-surface-400">v2.0</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </Link>
          {!isMobile && (
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => { setCollapsed(c => !c); setIsHovered(false) }}
              className={`${showFull ? 'flex' : 'hidden'} ${isRtl ? 'mr-auto' : 'ml-auto'} w-7 h-7 rounded-xl bg-white border border-surface-200 items-center justify-center text-surface-400 hover:text-brand-600 hover:bg-brand-50 hover:border-brand-200 transition-all duration-200 shadow-sm flex-shrink-0`}>
              <i className={`fas fa-chevron-${isRtl ? (collapsed ? 'left' : 'right') : (collapsed ? 'right' : 'left')} text-[9px]`}></i>
            </motion.button>
          )}
        </div>
      </div>

      {/* SEARCH */}
      {showFull && (
        <div className="px-4 py-3">
          <div className="relative group">
            <div className="absolute inset-0 bg-brand-500/5 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center">
              <i className={`fas fa-search absolute ${isRtl ? 'right-3.5' : 'left-3.5'} text-surface-400 text-xs pointer-events-none group-focus-within:text-brand-500 transition-colors`}></i>
              <input placeholder={isRtl ? 'بحث في القائمة...' : 'Search menu...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className={`w-full bg-surface-50 border border-surface-200 rounded-xl py-2.5 ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-xs font-medium text-surface-700 placeholder-surface-400 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/8 transition-all duration-200 group-hover:border-surface-300`} />
              <kbd className={`absolute ${isRtl ? 'left-2.5' : 'right-2.5'} px-1.5 py-0.5 rounded-md bg-surface-100 border border-surface-200 text-[8px] font-bold text-surface-400 hidden sm:block`}>⌘K</kbd>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACTIONS */}
      {showFull && (
        <div className="px-4 pb-2">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-bold shadow-brand-sm hover:shadow-brand transition-all duration-200">
            <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm"><i className="fas fa-plus text-[9px]"></i></div>
            <span>{isRtl ? 'إجراء سريع' : 'Quick Action'}</span>
            <motion.i animate={{ rotate: showQuickActions ? 180 : 0 }} className={`fas fa-chevron-down text-[8px] ${isRtl ? 'mr-auto' : 'ml-auto'} opacity-70`}></motion.i>
          </motion.button>
          <AnimatePresence>
            {showQuickActions && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {QUICK_ACTIONS.map((action, i) => (
                    <Link key={i} href={action.href}>
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-gradient-to-r ${action.gradient} text-white text-[9px] font-bold shadow-sm hover:shadow-md transition-all cursor-pointer`}
                        onClick={onClose}>
                        <i className={`fas ${action.icon} text-[8px]`}></i>
                        <span className="truncate">{action.label}</span>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* SEPARATOR */}
      {showFull && (
        <div className="px-5 pb-1">
          <div className={`h-px bg-gradient-to-r ${isRtl ? 'from-surface-200/80 via-surface-200/30 to-transparent' : 'from-transparent via-surface-200/30 to-surface-200/80'}`} />
        </div>
      )}

      {/* NAVIGATION */}
      <nav className="flex-1 overflow-y-auto hide-scrollbar py-2 px-2.5 space-y-4">
        {filteredGroups.map((group, gi) => (
          <div key={group.label}>
            {showFull && (
              <div className="flex items-center gap-2 px-3 mb-2.5 mt-1">
                <div className={`h-px flex-1 bg-gradient-to-r ${isRtl ? 'from-surface-200/60 to-transparent' : 'from-transparent to-surface-200/60'}`} />
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[16px] font-black text-surface-400 uppercase tracking-[0.18em]">{group.label}</motion.span>
                <div className={`h-px flex-1 bg-gradient-to-r ${isRtl ? 'from-transparent to-surface-200/60' : 'from-surface-200/60 to-transparent'}`} />
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item, ii) => {
                const isActive = router.pathname === item.href
                const globalIndex = gi * 10 + ii
                const label = isRtl ? item.label_ar : (item.label_en || item.label_ar)
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div custom={globalIndex} variants={showFull ? navVariants : {}} initial={showFull ? 'hidden' : false} animate="show"
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} title={!showFull ? label : ''}
                      onClick={isMobile ? onClose : undefined}
                      className={`group relative flex items-center cursor-pointer select-none ${showFull ? 'gap-3 px-3 py-2.5 rounded-2xl' : 'justify-center px-0 py-2.5 rounded-xl mx-auto w-11'} transition-all duration-200 ${isActive ? 'text-white' : 'text-surface-500 hover:text-surface-700'}`}>
                      {isActive && <motion.div layoutId="activeNavPill" transition={{ type: 'spring', stiffness: 350, damping: 30 }} className="absolute inset-0 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 shadow-brand-sm" />}
                      {!isActive && <div className="absolute inset-0 rounded-2xl bg-surface-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />}
                      {isActive && showFull && (
                        <motion.div layoutId="activeNavBar" transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          className={`absolute ${isRtl ? 'right-0' : 'left-0'} top-2 bottom-2 w-[3px] bg-white rounded-full shadow-lg shadow-white/30`} />
                      )}
                      <div className={`relative z-10 flex items-center justify-center flex-shrink-0 ${showFull ? 'w-8 h-8 rounded-xl' : 'w-10 h-10 rounded-xl'} transition-all duration-200 ${isActive ? 'text-white' : 'text-surface-400 group-hover:text-surface-600'}`}>
                        <i className={`fas ${item.icon} text-sm ${isActive ? 'drop-shadow-sm' : ''}`} />
                        {isActive && <div className="absolute inset-0 rounded-xl bg-white/10 blur-sm" />}
                      </div>
                      {showFull && <span className="relative z-10 text-sm font-bold truncate leading-tight">{label}</span>}
                      {showFull && isActive && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                          className={`relative z-10 ${isRtl ? 'mr-auto' : 'ml-auto'} w-1.5 h-1.5 rounded-full bg-white/70`} />
                      )}
                      {item.key === 'leaves' && showFull && (
                        <span className={`relative z-10 px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-600 text-[8px] font-black ${isRtl ? '' : 'order-last'}`}>3</span>
                      )}
                    </motion.div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* BOTTOM */}
      <div className="relative flex-shrink-0">
        <div className="absolute top-0 inset-x-3 h-px bg-gradient-to-r from-transparent via-surface-200/60 to-transparent" />
        <div className="px-3 py-3 space-y-2">
          {/* User card */}
          <div className="relative group">
            {showFull ? (
              <div className="relative overflow-hidden rounded-2xl p-3 cursor-pointer bg-gradient-to-br from-surface-50 to-surface-50/60 border border-surface-200/70 hover:shadow-sm hover:border-surface-300/70 transition-all duration-200"
                onClick={() => setShowUserMenu(!showUserMenu)}>
                <div className="absolute top-0 inset-x-0 h-12 bg-gradient-to-b from-brand-500/5 to-transparent rounded-t-2xl" />
                <div className={`relative flex items-center gap-3 ${isRtl ? '' : 'flex-row-reverse'}`}>
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 flex items-center justify-center shadow-sm shadow-brand-500/20">
                      <i className="fas fa-user text-white text-sm"></i>
                    </div>
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
                      className={`absolute -bottom-0.5 ${isRtl ? '-right-0.5' : '-left-0.5'} w-2.5 h-2.5 bg-emerald-500 rounded-full border-[2px] border-white`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-surface-800 truncate leading-tight">{user?.name || 'Admin'}</p>
                    <p className="text-[9px] font-semibold text-surface-400 truncate mt-0.5">{isRtl ? (user?.role === 'admin' ? 'مدير النظام' : 'موظف') : (user?.role === 'admin' ? 'Admin' : 'Employee')}</p>
                  </div>
                  <div className={`flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isRtl ? '' : 'flex-row-reverse'}`}>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-all" title={isRtl ? 'الإعدادات' : 'Settings'}>
                      <i className="fas fa-sliders text-[10px]"></i>
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleLogout() }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-400 hover:bg-rose-50 hover:text-rose-500 transition-all" title={isRtl ? 'تسجيل الخروج' : 'Logout'}>
                      <i className={`fas ${isRtl ? 'fa-arrow-right-from-bracket' : 'fa-arrow-left-from-bracket'} text-[10px]`}></i>
                    </motion.button>
                  </div>
                </div>
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden mt-2">
                      <div className="pt-2 border-t border-surface-200/60 space-y-0.5">
                        {[{ icon: 'fa-user-gear', label: isRtl ? 'الملف الشخصي' : 'Profile', href: '/profile' }, { icon: 'fa-gear', label: isRtl ? 'الإعدادات' : 'Settings', href: '/settings' }].map((item, i) => (
                          <Link key={i} href={item.href}>
                            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-bold text-surface-500 hover:text-surface-700 hover:bg-surface-100 transition-all cursor-pointer" onClick={onClose}>
                              <i className={`fas ${item.icon} text-[10px] w-4 text-center text-surface-400`}></i>
                              {item.label}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-sm">
                    <i className="fas fa-user text-white text-xs"></i>
                  </div>
                  <span className={`absolute -bottom-0.5 ${isRtl ? '-right-0.5' : '-left-0.5'} w-2 h-2 bg-emerald-500 rounded-full border-[2px] border-white`}></span>
                </div>
                <button onClick={handleLogout} className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-400 hover:bg-rose-50 hover:text-rose-500 transition-all" title={isRtl ? 'تسجيل الخروج' : 'Logout'}>
                  <i className={`fas ${isRtl ? 'fa-arrow-right-from-bracket' : 'fa-arrow-left-from-bracket'} text-[9px]`}></i>
                </button>
              </div>
            )}
          </div>

          {/* Bottom controls */}
          {showFull && (
            <>
              <div className={`flex items-center gap-1.5 ${isRtl ? '' : 'flex-row-reverse'}`}>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={toggleLanguage}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-surface-50 border border-surface-200 text-[10px] font-bold text-surface-500 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-all duration-200">
                  <i className="fas fa-globe text-[8px]"></i>
                  {language === 'ar' ? 'English' : 'العربية'}
                </motion.button>
                <div className="flex-1 flex items-center gap-2 py-2 px-2.5 rounded-xl bg-surface-50 border border-surface-200">
                  <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                    <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-brand-400 to-brand-500" />
                  </div>
                  <span className="text-[8px] font-bold text-surface-400">68%</span>
                </div>
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-[8px] text-surface-400 font-medium">HR MK v2.0</span>
                <div className={`flex items-center gap-2 ${isRtl ? '' : 'flex-row-reverse'}`}>
                  <button className="text-[8px] text-surface-400 hover:text-brand-500 transition-colors font-medium">{isRtl ? 'مساعدة' : 'Help'}</button>
                  <span className="w-1 h-1 rounded-full bg-surface-300"></span>
                  <button className="text-[8px] text-surface-400 hover:text-brand-500 transition-colors font-medium">{isRtl ? 'تحديث' : 'Updates'}</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── TOP BAR ──
const TopBar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user } = useAuth()
  const { language, toggleLanguage, isRtl, formatTime, formatDate } = useLanguage()
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  useEffect(() => {
    const tick = () => { setCurrentTime(formatTime(new Date())) }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [formatTime])

  const activeItem = ALL_ITEMS.find(i => i.href === router.pathname)

  return (
    <header className="topbar z-30 flex-shrink-0" style={{ background: 'rgba(247,248,250,0.85)' }}>
      <div className="flex items-center gap-4">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden w-9 h-9 rounded-xl bg-white border border-surface-200 flex items-center justify-center text-surface-600 hover:bg-surface-50 transition-all shadow-sm">
          <i className="fas fa-bars text-sm"></i>
        </motion.button>
        <AnimatePresence mode="wait">
          <motion.div key={router.pathname} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={`flex items-center gap-3 ${isRtl ? '' : 'flex-row-reverse'}`}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ background: 'linear-gradient(135deg, rgba(109,74,255,0.10), rgba(89,48,229,0.10))' }}>
              <i className={`fas ${activeItem?.icon || 'fa-house'} text-brand-600 text-sm`}></i>
            </div>
            <div>
              <h1 className="text-lg font-black text-surface-900 tracking-tight leading-none">{activeItem ? (isRtl ? activeItem.label_ar : activeItem.label_en) : (isRtl ? 'الرئيسية' : 'Dashboard')}</h1>
              <p className="text-[10px] font-bold text-surface-400 mt-0.5">{formatDate(new Date())}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:block relative">
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-200 cursor-pointer border ${searchFocused ? 'bg-white border-brand-300 shadow-glow' : 'bg-surface-50 border-surface-200 hover:bg-white hover:border-surface-300'}`}
            onClick={() => setShowCommandPalette(true)}>
            <i className="fas fa-search text-surface-400 text-xs"></i>
            <span className="text-xs font-medium text-surface-400">{isRtl ? 'بحث سريع...' : 'Quick search...'}</span>
            <kbd className="px-1.5 py-0.5 rounded-md bg-surface-100 border border-surface-200 text-[9px] font-bold text-surface-400">⌘K</kbd>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-50 border border-surface-200 text-sm font-bold text-surface-500">
          <i className="far fa-clock text-brand-400 text-xs"></i>
          <span className="tabular-nums text-xs">{currentTime}</span>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleLanguage}
          className="w-9 h-9 rounded-xl border border-surface-200 bg-surface-50 flex items-center justify-center text-xs font-bold text-surface-500 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-all duration-200">
          {language === 'ar' ? 'EN' : 'ع'}
        </motion.button>
        <NotificationCenter />
        <motion.div whileHover={{ scale: 1.02 }}
          className={`hidden md:flex items-center gap-2.5 ${isRtl ? 'pr-3 pl-1' : 'pl-3 pr-1'} py-1 rounded-xl bg-surface-50 border border-surface-200 hover:bg-white hover:shadow-sm cursor-pointer transition-all duration-200 group ${isRtl ? '' : 'flex-row-reverse'}`}>
          <span className="text-sm font-bold text-surface-700 max-w-[100px] truncate">{user?.name}</span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-sm">
            <i className="fas fa-user text-white text-[10px]"></i>
          </div>
        </motion.div>
      </div>

      {/* Command Palette */}
      <AnimatePresence>
        {showCommandPalette && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4" onClick={() => setShowCommandPalette(false)}>
            <div className="absolute inset-0 bg-surface-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg bg-white rounded-3xl border border-surface-200 shadow-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className={`flex items-center gap-3 px-5 py-4 border-b border-surface-100 ${isRtl ? '' : 'flex-row-reverse'}`}>
                <i className="fas fa-search text-surface-400 text-sm"></i>
                <input autoFocus placeholder={isRtl ? 'ابحث عن صفحة، إعدادات، أو أمر...' : 'Search page, settings, or command...'}
                  className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-surface-800 placeholder-surface-400"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                <button onClick={() => setShowCommandPalette(false)} className="text-surface-400 hover:text-surface-600"><i className="fas fa-times text-xs"></i></button>
              </div>
              <div className="max-h-72 overflow-y-auto p-2">
                {ALL_ITEMS.filter(i => i.label_ar.includes(searchQuery) || i.label_en?.toLowerCase().includes(searchQuery.toLowerCase()) || i.key.includes(searchQuery)).map((item, idx) => (
                  <Link key={item.href} href={item.href}>
                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-surface-600 hover:bg-brand-50 hover:text-brand-700 cursor-pointer transition-all ${isRtl ? '' : 'flex-row-reverse'}`}
                      onClick={() => setShowCommandPalette(false)}>
                      <div className="w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center text-surface-400">
                        <i className={`fas ${item.icon} text-sm`}></i>
                      </div>
                      <span>{isRtl ? item.label_ar : item.label_en}</span>
                      <span className={`${isRtl ? 'mr-auto' : 'ml-auto'} text-[10px] text-surface-400 font-medium`}>{item.key}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-surface-100 bg-surface-50 flex items-center gap-4 text-[10px] text-surface-400 font-medium">
                <span><kbd className="px-1 py-0.5 rounded bg-white border border-surface-200 text-surface-500 font-bold">↑↓</kbd> {isRtl ? 'التنقل' : 'Navigate'}</span>
                <span><kbd className="px-1 py-0.5 rounded bg-white border border-surface-200 text-surface-500 font-bold">↵</kbd> {isRtl ? 'اختيار' : 'Select'}</span>
                <span><kbd className="px-1 py-0.5 rounded bg-white border border-surface-200 text-surface-500 font-bold">Esc</kbd> {isRtl ? 'إغلاق' : 'Close'}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

// ── FOOTER ──
const AppFooter = () => {
  const { isRtl } = useLanguage()
  return (
    <footer className="px-6 py-4.5 border-t border-slate-200 bg-white/60 backdrop-blur-md flex-shrink-0 z-20 font-sans">
      <div className={`flex flex-col md:flex-row items-center justify-between gap-6 ${isRtl ? '' : 'md:flex-row-reverse'}`}>
        
        {/* Left Side: Brand, Version & Health Check */}
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <i className="fas fa-gem text-xs text-white"></i>
            </div>
            <span className="text-sm font-black text-slate-800 tracking-tight">
              HR MK <span className="text-brand-650 font-black">Enterprise</span>
            </span>
          </div>
          
          <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-slate-300"></div>
          
          <span className="text-xs font-bold text-slate-450">
            {isRtl ? 'الإصدار 2.0 · 2026 Edition' : 'Version 2.0 · 2026 Edition'}
          </span>

          <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-slate-300"></div>

          {/* System status green dot */}
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100/80 px-2.5 py-1 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wide">
              {isRtl ? 'جميع الأنظمة نشطة' : 'Systems Operational'}
            </span>
          </div>
        </div>

        {/* Right Side: Links & Social Icons */}
        <div className="flex flex-col sm:flex-row items-center gap-5 text-xs font-bold text-slate-500">
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-brand-600 transition-colors py-1 relative group">
              {isRtl ? 'الدعم الفني' : 'Technical Support'}
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-center duration-200" />
            </a>
            <a href="#" className="hover:text-brand-600 transition-colors py-1 relative group">
              {isRtl ? 'دليل الاستخدام' : 'User Guide'}
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-center duration-200" />
            </a>
            <a href="#" className="hover:text-brand-600 transition-colors py-1 relative group">
              {isRtl ? 'الخصوصية والأمان' : 'Privacy & Security'}
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-center duration-200" />
            </a>
          </div>

          <div className="hidden sm:block w-px h-5 bg-slate-200"></div>

          {/* Social Links */}
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-brand-50 hover:text-brand-500 hover:border-brand-200 transition-all duration-200 cursor-pointer shadow-sm">
              <i className="fab fa-x-twitter text-[12px]"></i>
            </span>
            <span className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-brand-50 hover:text-brand-500 hover:border-brand-200 transition-all duration-200 cursor-pointer shadow-sm">
              <i className="fab fa-linkedin-in text-[12px]"></i>
            </span>
          </div>
        </div>

      </div>
    </footer>
  )
}

// ── MAIN LAYOUT ──
export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const { isRtl } = useLanguage()
  const router = useRouter()

  useEffect(() => { setSidebarOpen(false) }, [router.pathname])

  const sidebarWidth = collapsed && !sidebarHovered ? 80 : 296

  return (
    <div className="flex h-screen w-full bg-[#f7f8fa] overflow-hidden font-cairo text-surface-900" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* DESKTOP SIDEBAR */}
      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="hidden lg:block relative z-20 flex-shrink-0 h-full"
      >
        <div className={`absolute inset-0 rounded-3xl transition-opacity duration-500 ${collapsed && !sidebarHovered ? 'opacity-0' : 'opacity-100'}`}
          style={{ background: 'linear-gradient(135deg, rgba(109,74,255,0.03), rgba(89,48,229,0.02))', filter: 'blur(40px)', transform: 'translateY(10px)' }} />
        <motion.div
          animate={{ margin: collapsed && !sidebarHovered ? '8px' : '12px' }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="h-full rounded-3xl overflow-hidden relative"
          style={{
            background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(224,227,234,0.7)', borderBottom: '1px solid rgba(255,255,255,0.9)',
            boxShadow: collapsed && !sidebarHovered ? '0 8px 24px rgba(20,22,29,0.06)' : '0 16px 48px rgba(20,22,29,0.08), 0 4px 12px rgba(20,22,29,0.04), 0 0 0 1px rgba(255,255,255,0.5) inset',
          }}>
          <SidebarContent collapsed={collapsed} setCollapsed={setCollapsed} isHovered={sidebarHovered} setIsHovered={setSidebarHovered} />
        </motion.div>
      </motion.aside>

      {/* MOBILE SIDEBAR OVERLAY */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 lg:hidden bg-surface-900/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <motion.aside
              initial={{ x: isRtl ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              className={`fixed inset-y-0 ${isRtl ? 'right-0' : 'left-0'} z-50 w-[300px] p-3 lg:hidden`}>
              <div className="h-full rounded-3xl overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(24px) saturate(180%)',
                  border: '1px solid rgba(224,227,234,0.8)', boxShadow: '0 24px 64px rgba(20,22,29,0.12)',
                }}>
                <button onClick={() => setSidebarOpen(false)}
                  className={`absolute top-5 ${isRtl ? 'left-5' : 'right-5'} z-10 w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center text-surface-500 hover:bg-surface-200 transition-colors`}>
                  <i className="fas fa-times text-xs"></i>
                </button>
                <SidebarContent collapsed={false} setCollapsed={() => {}} isMobile onClose={() => setSidebarOpen(false)} isHovered={false} setIsHovered={() => {}} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div key={router.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="p-4 sm:p-6 lg:p-8 w-full max-w-[1600px] mx-auto">
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        <AppFooter />
      </div>
    </div>
  )
}
