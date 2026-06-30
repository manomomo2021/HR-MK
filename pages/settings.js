import { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import { useLanguage } from '../contexts/LanguageContext'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import ShiftManager from '../components/ShiftManager'

export default function Settings() {
  const { settings, loading, setSettings, setStorageData } = useData()
  const { logActivity, changePassword } = useAuth()
  const { language, direction } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e
  const isRtl = language === 'ar'
  const [activeTab, setActiveTab] = useState('general')
  const [isSaving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    company: { name: '', address: '', phone: '', email: '' },
    workHours: { startTime: '08:00', endTime: '17:00', workingDays: 5, weekends: ['friday', 'saturday'] },
    leaves: { annualLeaves: 21, casualLeaves: 7, sickLeaves: 30 },
    attendance: { lateThreshold: 15, earlyLeaveThreshold: 15, autoSync: true, syncInterval: 60 }
  })
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })


  useEffect(() => {
    if (!loading && settings) {
      setFormData({
        company: settings.company || formData.company,
        workHours: settings.workHours || formData.workHours,
        leaves: settings.leaves || formData.leaves,
        attendance: settings.attendance || formData.attendance
      })
    }
  }, [loading, settings])

  const handleInputChange = (section, field, value) => setFormData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }))

  const saveSettings = async () => {
    setSaving(true)
    const toastId = toast.loading(ar('يتم الآن تشفير وحفظ المعلمات الجوهرية...', 'Encrypting and saving essential parameters...'))
    try {
      const updatedSettings = { ...formData }
      setSettings(updatedSettings)
      setStorageData('settings', updatedSettings)
      toast.success(ar('تم المصادقة على الإعدادات العليا', 'Settings approved successfully'), { id: toastId })
      logActivity('settings_update', ar('تعديل المعلمات المرجعية للنظام', 'System reference parameters updated'))
    } catch (e) {
      toast.error(ar('أفشل النظام حفظ الإعدادات لخلل أمني', 'System failed to save settings'), { id: toastId })
    } finally { setSaving(false) }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) return toast.error(ar('عدم تطابق شفرات المرور المرشحة', 'Passwords do not match'))
    if (passwordData.newPassword.length < 6) return toast.error(ar('تتطلب شفرة المرور 6 طبقات تشفير كحد أدنى', 'Password must be at least 6 characters'))
    const result = await changePassword(passwordData.oldPassword, passwordData.newPassword)
    if (result.success) {
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' })
      toast.success(ar('تم تحديث الجدار الناري لشفرتك بنجاح', 'Password updated successfully'))
    }
  }

  const createBackup = () => {
    try {
      const backupData = {
        employees: JSON.parse(localStorage.getItem('hr_system_employees') || '[]'),
        devices: JSON.parse(localStorage.getItem('hr_system_devices') || '[]'),
        attendance: JSON.parse(localStorage.getItem('hr_system_attendance') || '[]'),
        settings: JSON.parse(localStorage.getItem('hr_system_settings') || '{}'),
        timestamp: new Date().toISOString()
      }
      const dataStr = JSON.stringify(backupData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(dataBlob)
      link.download = `HR_MATRIX_BACKUP_${new Date().toISOString().split('T')[0]}.json`
      link.click()
      localStorage.setItem('hr_system_lastBackup', new Date().toISOString())
      toast.success(ar('تم استخراج كتلة احتياطية مُشفرة بنجاح', 'Backup exported successfully'))
      logActivity('backup_create', ar('سحب استنساخ بياناتي مركزي', 'Data backup created'))
    } catch (error) { toast.error(ar('فشل في توليد الكتلة البياناتية', 'Failed to create backup')) }
  }

  const restoreBackup = (event) => {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target.result)
        if (!backupData.timestamp) throw new Error(ar('الكتلة البياناتية غير مصادق عليها أو تالفة', 'Invalid or corrupted backup file'))
        Object.keys(backupData).forEach(key => {
          if (key !== 'timestamp') localStorage.setItem(`hr_system_${key}`, JSON.stringify(backupData[key]))
        })
        toast.success(ar('تم حقن الكتلة البياناتية بنجاح', 'Backup restored successfully'))
        logActivity('backup_restore', ar('عملية حقن لمعلومات احتياطية', 'Backup data restored'))
        setTimeout(() => window.location.reload(), 2000)
      } catch (error) { toast.error(ar('رفض أمني: الكتلة متعارضة أو تالفة', 'Invalid or corrupted backup file')) }
    }
    reader.readAsText(file)
  }

  const clearAllData = () => {
    if (confirm(ar('تحذير شديد الخطورة: هل تنوي فعلاً إعدام كافة البيانات في المصفوفة؟ هذا الإجراء لا رجعة فيه!', 'WARNING: This will permanently delete ALL data! This action cannot be undone!'))) {
      if (confirm(ar('تأكيد التدمير الشامل: الكوادر، الرواتب، البصمات، كل شيء سيُمحى نهائياً!', 'Confirm: All employees, payrolls, biometric data will be permanently destroyed!'))) {
        try {
          Object.keys(localStorage).forEach(key => { if (key.startsWith('hr_system_')) localStorage.removeItem(key) })
          toast.success(ar('تمت عملية الإعدام الشاملة للمسارات بنجاح', 'All data destroyed successfully'))
          logActivity('data_clear', ar('إعادة ضبط المصنع وتدمير الكتلة البياناتية', 'Factory reset - all data destroyed'))
          setTimeout(() => window.location.reload(), 2000)
        } catch (error) { toast.error(ar('فشل في عملية إعدام البيانات', 'Data destruction failed')) }
      }
    }
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })

  // Navigation categories
  const navItems = [
    { id: 'general', icon: 'fa-sliders', labelAr: 'عام', labelEn: 'General', descAr: 'الإعدادات الأساسية للنظام', descEn: 'Core system settings' },
    { id: 'identity', icon: 'fa-building', labelAr: 'هوية النظام', labelEn: 'Identity', descAr: 'شعار واسم وعلامة النظام', descEn: 'Logo, name and branding' },
    { id: 'localization', icon: 'fa-globe', labelAr: 'التوطين', labelEn: 'Localization', descAr: 'اللغة والمنطقة والوقت', descEn: 'Language, region and time' },
    { id: 'attendance', icon: 'fa-fingerprint', labelAr: 'الحضور', labelEn: 'Attendance', descAr: 'الاستشعار البيومتري والحدود', descEn: 'Biometric sensors and thresholds' },
    { id: 'shifts', icon: 'fa-arrows-rotate', labelAr: 'الفترات', labelEn: 'Shifts', descAr: 'الشيفتات وجدول المواعيد', descEn: 'Shifts and schedule templates' },
    { id: 'workHours', icon: 'fa-clock', labelAr: 'ساعات العمل', labelEn: 'Work Hours', descAr: 'المسار الزمني ودورة التشغيل', descEn: 'Schedule and operating cycle' },
    { id: 'leaves', icon: 'fa-calendar-alt', labelAr: 'الإجازات', labelEn: 'Leaves', descAr: 'خوارزميات الفراغ والحصص', descEn: 'Leave allocation algorithms' },
    { id: 'security', icon: 'fa-shield-halved', labelAr: 'الأمان', labelEn: 'Security', descAr: 'الترسانة الأمنية والتشفير', descEn: 'Security arsenal and encryption' },
    { id: 'notifications', icon: 'fa-bell', labelAr: 'الإشعارات', labelEn: 'Notifications', descAr: 'قنوات التنبيه والمراسلة', descEn: 'Alert channels and messaging' },
    { id: 'backup', icon: 'fa-database', labelAr: 'النسخ الاحتياطي', labelEn: 'Backup', descAr: 'الخزانة الكهرومغناطيسية', descEn: 'Electromagnetic vault and recovery' },
    { id: 'developer', icon: 'fa-code', labelAr: 'المطور', labelEn: 'Developer', descAr: 'أدوات المطور وواجهات API', descEn: 'Developer tools and APIs' },
  ]

  // System stats for KPI cards
  const systemStats = [
    { id: 'health', icon: 'fa-heart-pulse', labelAr: 'صحة النظام', labelEn: 'System Health', value: 98, color: 'from-emerald-400 to-emerald-600', badge: 'Excellent', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
    { id: 'cpu', icon: 'fa-microchip', labelAr: 'المعالج', labelEn: 'CPU', value: 34, color: 'from-blue-400 to-blue-600', badge: '34%', badgeColor: 'bg-blue-500/20 text-blue-400' },
    { id: 'memory', icon: 'fa-memory', labelAr: 'الذاكرة', labelEn: 'Memory', value: 62, color: 'from-amber-400 to-amber-600', badge: '6.2/8 GB', badgeColor: 'bg-amber-500/20 text-amber-400' },
    { id: 'storage', icon: 'fa-hard-drive', labelAr: 'التخزين', labelEn: 'Storage', value: 45, color: 'from-violet-400 to-violet-600', badge: '45%', badgeColor: 'bg-violet-500/20 text-violet-400' },
    { id: 'users', icon: 'fa-users', labelAr: 'المستخدمين', labelEn: 'Users', value: 12, color: 'from-cyan-400 to-cyan-600', badge: 'Online', badgeColor: 'bg-cyan-500/20 text-cyan-400' },
    { id: 'devices', icon: 'fa-tablet-screen-button', labelAr: 'الأجهزة', labelEn: 'Devices', value: 3, color: 'from-pink-400 to-pink-600', badge: 'Connected', badgeColor: 'bg-pink-500/20 text-pink-400' },
  ]

  // Quick actions
  const quickActions = [
    { id: 'save', icon: 'fa-floppy-disk', label: ar('حفظ الإعدادات', 'Save Settings'), action: saveSettings, gradient: 'from-emerald-500 to-teal-600', disabled: isSaving },
    { id: 'backup', icon: 'fa-cloud-arrow-down', label: ar('نسخ احتياطي', 'Create Backup'), action: createBackup, gradient: 'from-cyan-500 to-blue-600' },
    { id: 'restore', icon: 'fa-cloud-arrow-up', label: ar('استعادة', 'Restore Backup'), action: () => document.getElementById('restore-file-input')?.click(), gradient: 'from-indigo-500 to-purple-600' },
    { id: 'logs', icon: 'fa-list-tree', label: ar('سجل النظام', 'System Logs'), action: () => setActiveTab('developer'), gradient: 'from-slate-500 to-slate-700' },
  ]

  if (loading) return (
    <ProtectedRoute><Layout>
      <div className="flex items-center justify-center h-96">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <i className="fas fa-cog text-indigo-400 text-sm animate-spin" style={{ animationDirection: 'reverse' }}></i>
          </div>
        </div>
      </div>
    </Layout></ProtectedRoute>
  )

  // Section card wrapper
  const SectionCard = ({ icon, title, description, children }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="px-8 pt-6 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200/30">
            <i className={`fas ${icon} text-white text-lg`}></i>
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">{title}</h3>
            {description && <p className="text-sm text-slate-500 font-medium mt-0.5">{description}</p>}
          </div>
        </div>
      </div>
      <div className="p-8">{children}</div>
    </motion.div>
  )

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-8 w-full" dir={direction}>
          {/* HERO HEADER */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.30)]">
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px]" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.06),transparent_50%)]" />
            <div className="relative z-10 p-8 lg:p-10">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center shadow-xl shadow-indigo-500/20 ring-1 ring-white/10">
                    <i className="fas fa-microchip text-3xl text-white"></i>
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">{ar('مركز السيطرة المؤسسي', 'Enterprise Control Center')}</h1>
                    <p className="text-slate-400 font-medium mt-1.5 text-base">{ar('إدارة كل جانب من نظام ERP من مكان واحد', 'Manage every aspect of the ERP system from one place')}</p>
                  </div>
                </div>
                <motion.button onClick={saveSettings} disabled={isSaving}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="relative shrink-0 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3.5 px-8 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.30)] transition-all duration-200 flex items-center gap-3">
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <i className="fas fa-satellite-dish text-sm"></i>
                  )}
                  <span className="text-sm">{ar('بث وحفظ', 'Broadcast and Save')}</span>
                </motion.button>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 mt-6 pt-6 border-t border-white/5">
                {[
                  { icon: 'fa-tag', label: ar('الإصدار', 'Version'), value: 'v3.2.1 (Enterprise)' },
                  { icon: 'fa-server', label: ar('الخادم', 'Server'), value: 'Active' },
                  { icon: 'fa-flask', label: ar('البيئة', 'Environment'), value: ar('إنتاج', 'Production') },
                  { icon: 'fa-id-card', label: ar('الترخيص', 'License'), value: 'Enterprise' },
                  { icon: 'fa-database', label: ar('قاعدة البيانات', 'Database'), value: 'SQLite' },
                  { icon: 'fa-user', label: ar('المستخدم', 'User'), value: 'Admin' },
                  { icon: 'fa-right-to-bracket', label: ar('آخر دخول', 'Last Login'), value: dateStr },
                  { icon: 'fa-cloud-arrow-down', label: ar('آخر نسخ', 'Last Backup'), value: ar('اليوم', 'Today') },
                  { icon: 'fa-clock', label: ar('الوقت', 'Time'), value: `${dateStr} ${timeStr}` },
                  { icon: 'fa-language', label: ar('اللغة', 'Language'), value: language === 'ar' ? 'العربية' : 'English' },
                ].map((chip, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.03 }}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-200 cursor-default">
                    <i className={`fas ${chip.icon} text-[10px] text-slate-500`}></i>
                    <span className="text-[11px] font-bold text-slate-400">{chip.label}:</span>
                    <span className="text-[11px] font-bold text-slate-200">{chip.value}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* SYSTEM STATUS KPI CARDS */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {systemStats.map((stat, i) => (
              <motion.div key={stat.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.04 }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_25px_rgba(99,102,241,0.10)] transition-all duration-300 p-5">
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${stat.color}`} />
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}>
                    <i className={`fas ${stat.icon} text-white text-sm`}></i>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stat.badgeColor}`}>{stat.badge}</span>
                </div>
                <p className="text-2xl font-black text-slate-800">{stat.value}{typeof stat.value === 'number' && stat.value < 100 ? '%' : ''}</p>
                <p className="text-xs font-bold text-slate-500 mt-1">{language === 'ar' ? stat.labelAr : stat.labelEn}</p>
                {typeof stat.value === 'number' && (
                  <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${stat.value}%` }} transition={{ delay: 0.4 + i * 0.05, duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full bg-gradient-to-r ${stat.color}`} />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* QUICK ACTIONS */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <motion.button key={action.id} onClick={action.action} disabled={action.disabled}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.04 }}
                whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                className={`relative overflow-hidden rounded-2xl p-5 border border-white/20 bg-gradient-to-br ${action.gradient} shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 text-left`}>
                <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/5 rounded-full blur-xl" />
                <div className="relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center mb-3">
                    <i className={`fas ${action.icon} text-white text-sm`}></i>
                  </div>
                  <p className="text-sm font-black text-white">{action.label}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>

          {/* MAIN LAYOUT: NAV + CONTENT */}
          <div className="flex flex-col xl:flex-row gap-8 w-full">
            {/* Vertical navigation */}
            <motion.div initial={{ opacity: 0, x: isRtl ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
              className="xl:w-80 shrink-0">
              <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.03)] overflow-hidden sticky top-24">
                <div className="px-5 pt-5 pb-3 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{ar('التنقل السريع', 'Quick Navigation')}</p>
                </div>
                <div className="p-3 space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {navItems.map(item => {
                    const isActive = activeTab === item.id
                    return (
                      <button key={item.id} onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-200 group relative ${
                          isActive ? 'bg-gradient-to-r from-indigo-50 to-purple-50 shadow-sm border border-indigo-100/60' : 'hover:bg-slate-50 border border-transparent'
                        }`}>
                        {isActive && (
                          <motion.div layoutId="navIndicator" className={`absolute ${isRtl ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full`} />
                        )}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                          isActive ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200/40' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                        }`}>
                          <i className={`fas ${item.icon} text-sm`}></i>
                        </div>
                        <div className="text-right flex-1 min-w-0">
                          <p className={`text-sm font-bold transition-colors duration-200 ${isActive ? 'text-indigo-700' : 'text-slate-700 group-hover:text-slate-900'}`}>
                            {language === 'ar' ? item.labelAr : item.labelEn}
                          </p>
                          <p className={`text-[10px] font-medium truncate ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-500'}`}>
                            {language === 'ar' ? item.descAr : item.descEn}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="px-5 py-4 border-t border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{ar('النظام جاهز', 'System Ready')}</span>
                    <span className="text-slate-300">.</span>
                    <span className="text-[10px] font-bold text-emerald-500">{ar('متصل', 'Online')}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {/* GENERAL */}
                {activeTab === 'general' && (
                  <SectionCard key="general" icon="fa-sliders" title={ar('الإعدادات العامة', 'General Settings')} description={ar('المعايير الأساسية لتشغيل النظام', 'Core system operating parameters')}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <i className="fas fa-building text-slate-400 text-[10px]"></i> {ar('اسم النظام', 'System Name')}
                        </label>
                        <input type="text" value={formData.company.name} onChange={e => handleInputChange('company', 'name', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 hover:border-indigo-300/50 focus:border-indigo-400 text-slate-800 px-5 py-3.5 rounded-2xl outline-none transition-all duration-200 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-100"
                          placeholder={ar('مسمى النظام', 'System name')} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <i className="fas fa-envelope text-slate-400 text-[10px]"></i> {ar('البريد الإلكتروني', 'Email')}
                        </label>
                        <input type="email" value={formData.company.email} onChange={e => handleInputChange('company', 'email', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 hover:border-indigo-300/50 focus:border-indigo-400 text-slate-800 px-5 py-3.5 rounded-2xl outline-none transition-all duration-200 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-100"
                          placeholder="admin@company.com" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <i className="fas fa-phone text-slate-400 text-[10px]"></i> {ar('الهاتف', 'Phone')}
                        </label>
                        <input type="tel" value={formData.company.phone} onChange={e => handleInputChange('company', 'phone', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 hover:border-indigo-300/50 focus:border-indigo-400 text-slate-800 px-5 py-3.5 rounded-2xl outline-none transition-all duration-200 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-100"
                          placeholder="+20 1XX XXX XXXX" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <i className="fas fa-location-dot text-slate-400 text-[10px]"></i> {ar('العنوان', 'Address')}
                        </label>
                        <input type="text" value={formData.company.address} onChange={e => handleInputChange('company', 'address', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 hover:border-indigo-300/50 focus:border-indigo-400 text-slate-800 px-5 py-3.5 rounded-2xl outline-none transition-all duration-200 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-100"
                          placeholder={ar('العنوان', 'Address')} />
                      </div>
                    </div>
                  </SectionCard>
                )}

                {/* IDENTITY */}
                {activeTab === 'identity' && (
                  <SectionCard key="identity" icon="fa-building" title={ar('هوية النظام', 'System Identity')} description={ar('الشعار، الاسم، والعلامة التجارية للنظام', 'Logo, name and brand identity')}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{ar('اسم الشركة', 'Company Name')}</label>
                        <input type="text" value={formData.company.name} onChange={e => handleInputChange('company', 'name', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 hover:border-indigo-300/50 focus:border-indigo-400 text-slate-800 px-5 py-3.5 rounded-2xl outline-none transition-all text-sm font-medium focus:ring-2 focus:ring-indigo-100"
                          placeholder="Company Name" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{ar('البريد الرسمي', 'Official Email')}</label>
                        <input type="email" value={formData.company.email} onChange={e => handleInputChange('company', 'email', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 hover:border-indigo-300/50 focus:border-indigo-400 text-slate-800 px-5 py-3.5 rounded-2xl outline-none transition-all text-sm font-medium focus:ring-2 focus:ring-indigo-100"
                          placeholder="info@company.com" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">{ar('شعار الشركة', 'Company Logo')}</label>
                        <div className="border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-2xl p-8 transition-all duration-200 cursor-pointer bg-slate-50/50">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                              <i className="fas fa-cloud-arrow-up text-indigo-500 text-xl"></i>
                            </div>
                            <p className="text-sm font-bold text-slate-600">{ar('اسحب وأفلت الشعار هنا أو انقر للرفع', 'Drag and drop logo here or click to upload')}</p>
                            <p className="text-xs text-slate-400">SVG, PNG, JPG - {ar('الحد الأقصى 5 ميغابايت', 'Max 5MB')}</p>
                          </div>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">{ar('الألوان الأساسية', 'Brand Colors')}</label>
                        <div className="flex flex-wrap gap-4">
                          {[
                            { label: ar('أساسي', 'Primary'), color: '#6366f1' },
                            { label: ar('ثانوي', 'Secondary'), color: '#8b5cf6' },
                            { label: ar('مميز', 'Accent'), color: '#06b6d4' },
                          ].map((c, i) => (
                            <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                              <div className="w-8 h-8 rounded-lg border-2 border-white shadow-sm" style={{ background: c.color }} />
                              <span className="text-xs font-bold text-slate-600">{c.label}</span>
                              <input type="text" value={c.color} className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-600 outline-none text-center" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                )}

                {/* LOCALIZATION */}
                {activeTab === 'localization' && (
                  <SectionCard key="localization" icon="fa-globe" title={ar('التوطين', 'Localization')} description={ar('اللغة، المنطقة، المنطقة الزمنية والعملة', 'Language, region, timezone and currency')}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{ar('اللغة', 'Language')}</label>
                        <div className="flex gap-2">
                          {['ar', 'en'].map(lang => (
                            <button key={lang}
                              className={`flex-1 py-3 rounded-2xl text-sm font-bold border transition-all duration-200 ${
                                language === lang ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}>
                              {lang === 'ar' ? ' العربية' : ' English'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{ar('المنطقة الزمنية', 'Timezone')}</label>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all">
                          <option value="Africa/Cairo">Africa/Cairo (UTC+2)</option>
                          <option value="UTC">UTC (UTC+0)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{ar('العملة الأساسية', 'Base Currency')}</label>
                        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5">
                          <span className="text-2xl"></span>
                          <div>
                            <p className="text-sm font-black text-slate-800">EGP</p>
                            <p className="text-[11px] font-bold text-amber-600">{ar('الجنيه المصري', 'Egyptian Pound')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                )}

                {/* SHIFTS */}
                {activeTab === 'shifts' && (
                  <SectionCard key="shifts" icon="fa-arrows-rotate" title={ar('إدارة الفترات (الشيفتات)', 'Shift Management')} description={ar('تحديد أوقات الدوام لكل شيفت — يستخدم في احتساب التأخير والإضافي', 'Define shift schedules — used for late/OT calculations')}>
                    <ShiftManager language={language} ar={ar} />
                  </SectionCard>
                )}

                {/* ATTENDANCE */}
                {activeTab === 'attendance' && (
                  <SectionCard key="attendance" icon="fa-fingerprint" title={ar('الاستشعار البيومتري', 'Biometric Attendance')} description={ar('حدود التأخير والانصراف المبكر والمزامنة التلقائية', 'Late and early thresholds and auto-sync settings')}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl border border-rose-200/60 p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                            <i className="fas fa-clock text-rose-500 text-sm"></i>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">{ar('حد التأخير', 'Late Threshold')}</h4>
                            <p className="text-[11px] text-slate-500">{ar('الحد الأقصى المسموح به', 'Maximum allowed delay')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="number" min="0" value={formData.attendance.lateThreshold} onChange={e => handleInputChange('attendance', 'lateThreshold', parseInt(e.target.value))}
                            className="w-24 bg-white border border-rose-200 text-slate-800 px-4 py-2.5 rounded-xl outline-none text-center font-bold text-xl font-mono focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all" />
                          <span className="text-sm font-bold text-slate-500">{ar('دقيقة', 'minutes')}</span>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/60 p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <i className="fas fa-door-open text-amber-500 text-sm"></i>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">{ar('حد الانصراف المبكر', 'Early Leave Threshold')}</h4>
                            <p className="text-[11px] text-slate-500">{ar('الحد الأقصى المسموح به', 'Maximum allowed early exit')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="number" min="0" value={formData.attendance.earlyLeaveThreshold} onChange={e => handleInputChange('attendance', 'earlyLeaveThreshold', parseInt(e.target.value))}
                            className="w-24 bg-white border border-amber-200 text-slate-800 px-4 py-2.5 rounded-xl outline-none text-center font-bold text-xl font-mono focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
                          <span className="text-sm font-bold text-slate-500">{ar('دقيقة', 'minutes')}</span>
                        </div>
                      </div>
                      <div className="md:col-span-2 bg-gradient-to-br from-fuchsia-50 to-purple-50 rounded-2xl border border-fuchsia-200/60 p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-fuchsia-100 flex items-center justify-center">
                            <i className="fas fa-sync-alt text-fuchsia-500 text-sm"></i>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">{ar('المزامنة التلقائية', 'Auto Sync')}</h4>
                            <p className="text-[11px] text-slate-500">{ar('مزامنة جهاز البصمة تلقائيا', 'Auto-sync biometric device data')}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-6">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={formData.attendance.autoSync} onChange={e => handleInputChange('attendance', 'autoSync', e.target.checked)} className="sr-only peer" />
                            <div className="w-12 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-fuchsia-500 shadow-inner"></div>
                            <span className={`ml-3 text-sm font-bold ${formData.attendance.autoSync ? 'text-fuchsia-600' : 'text-slate-400'}`}>
                              {formData.attendance.autoSync ? ar('نشط', 'Active') : ar('متوقف', 'Disabled')}
                            </span>
                          </label>
                          <div className={`flex items-center gap-3 transition-all duration-300 ${formData.attendance.autoSync ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                            <span className="text-xs font-bold text-slate-500">{ar('كل', 'Every')}</span>
                            <input type="number" min="1" value={formData.attendance.syncInterval} onChange={e => handleInputChange('attendance', 'syncInterval', parseInt(e.target.value))}
                              className="w-16 bg-white border border-fuchsia-200 text-slate-800 px-2 py-1.5 rounded-lg outline-none text-center font-bold text-sm focus:border-fuchsia-400 transition-all" />
                            <span className="text-xs font-bold text-slate-500">{ar('ثانية', 'sec')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                )}

                {/* WORK HOURS */}
                {activeTab === 'workHours' && (
                  <SectionCard key="workHours" icon="fa-clock" title={ar('ساعات العمل', 'Work Hours')} description={ar('المسار الزمني ودورة التشغيل اليومية', 'Schedule and daily operating cycle')}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{ar('بداية الدوام', 'Start Time')}</label>
                        <input type="time" value={formData.workHours.startTime} onChange={e => handleInputChange('workHours', 'startTime', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 hover:border-orange-300/50 focus:border-orange-400 text-slate-800 px-5 py-3.5 rounded-2xl outline-none transition-all text-center font-mono text-lg font-bold focus:ring-2 focus:ring-orange-100" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{ar('نهاية الدوام', 'End Time')}</label>
                        <input type="time" value={formData.workHours.endTime} onChange={e => handleInputChange('workHours', 'endTime', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 hover:border-orange-300/50 focus:border-orange-400 text-slate-800 px-5 py-3.5 rounded-2xl outline-none transition-all text-center font-mono text-lg font-bold focus:ring-2 focus:ring-orange-100" />
                      </div>
                      <div className="md:col-span-2 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-200/60 p-6 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{ar('أيام العمل', 'Working Days')}</h4>
                          <p className="text-xs text-slate-500 mt-1">{ar('عدد أيام العمل في الأسبوع', 'Number of working days per week')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {[5, 6, 7].map(n => (
                            <button key={n} onClick={() => handleInputChange('workHours', 'workingDays', n)}
                              className={`w-10 h-10 rounded-xl text-sm font-black transition-all duration-200 ${
                                formData.workHours.workingDays === n
                                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200/40'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-orange-50'
                              }`}>{n}</button>
                          ))}
                          <span className="text-xs font-bold text-slate-400 ml-2">{ar('أيام', 'days')}</span>
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                )}

                {/* LEAVES */}
                {activeTab === 'leaves' && (
                  <SectionCard key="leaves" icon="fa-calendar-alt" title={ar('الإجازات', 'Leave Policy')} description={ar('خوارزميات وحصص الإجازات', 'Leave allocation algorithms')}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {[
                        { field: 'annualLeaves', labelAr: 'الإجازة السنوية', labelEn: 'Annual Leave', icon: 'fa-sun', gradient: 'from-teal-50 to-emerald-50', border: 'border-teal-200/60', accent: 'text-teal-600', bgIcon: 'bg-teal-100' },
                        { field: 'casualLeaves', labelAr: 'الإجازة العارضة', labelEn: 'Casual Leave', icon: 'fa-bolt', gradient: 'from-amber-50 to-yellow-50', border: 'border-amber-200/60', accent: 'text-amber-600', bgIcon: 'bg-amber-100' },
                        { field: 'sickLeaves', labelAr: 'الإجازة المرضية', labelEn: 'Sick Leave', icon: 'fa-hospital', gradient: 'from-cyan-50 to-sky-50', border: 'border-cyan-200/60', accent: 'text-cyan-600', bgIcon: 'bg-cyan-100' },
                      ].map((item, i) => (
                        <div key={i} className={`bg-gradient-to-br ${item.gradient} rounded-2xl border ${item.border} p-6`}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-xl ${item.bgIcon} flex items-center justify-center`}>
                              <i className={`fas ${item.icon} ${item.accent} text-sm`}></i>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800">{language === 'ar' ? item.labelAr : item.labelEn}</h4>
                          </div>
                          <div className="relative">
                            <input type="number" min="0" value={formData.leaves[item.field]} onChange={e => handleInputChange('leaves', item.field, parseInt(e.target.value))}
                              className="w-full bg-white border border-slate-200 text-slate-800 px-4 py-3.5 rounded-xl outline-none text-center font-bold text-3xl font-mono focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">{ar('يوم', 'days')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* SECURITY */}
                {activeTab === 'security' && (
                  <SectionCard key="security" icon="fa-shield-halved" title={ar('الأمان', 'Security')} description={ar('الترسانة الأمنية وتغيير كلمة المرور', 'Security arsenal and password management')}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl border border-rose-200/60 p-6">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                            <i className="fas fa-key text-rose-500 text-sm"></i>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800">{ar('تغيير كلمة المرور', 'Change Password')}</h4>
                        </div>
                        <form onSubmit={handlePasswordChange} className="space-y-3">
                          <input type="password" value={passwordData.oldPassword} onChange={e => setPasswordData(p => ({ ...p, oldPassword: e.target.value }))}
                            placeholder={ar('كلمة المرور الحالية', 'Current password')}
                            className="w-full bg-white border border-slate-200 text-slate-800 px-4 py-3 rounded-xl outline-none text-sm font-medium placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all" required />
                          <input type="password" value={passwordData.newPassword} onChange={e => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
                            placeholder={ar('كلمة المرور الجديدة', 'New password')}
                            className="w-full bg-white border border-slate-200 text-slate-800 px-4 py-3 rounded-xl outline-none text-sm font-medium placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all" required minLength="6" />
                          <input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))}
                            placeholder={ar('تأكيد كلمة المرور', 'Confirm password')}
                            className="w-full bg-white border border-slate-200 text-slate-800 px-4 py-3 rounded-xl outline-none text-sm font-medium placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all" required minLength="6" />
                          <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                            className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white font-bold py-3.5 rounded-xl shadow-md shadow-rose-200/40 transition-all flex items-center justify-center gap-2 text-sm">
                            <i className="fas fa-lock"></i> {ar('تحديث كلمة المرور', 'Update Password')}
                          </motion.button>
                        </form>
                      </div>
                      <div className="space-y-4">
                        {[
                          { icon: 'fa-clock', labelAr: 'مهلة الجلسة', labelEn: 'Session Timeout', value: ar('30 دقيقة', '30 minutes'), color: 'from-blue-50 to-indigo-50', border: 'border-blue-200/60', iconBg: 'bg-blue-100', iconColor: 'text-blue-500' },
                          { icon: 'fa-shield-check', labelAr: 'المصادقة الثنائية', labelEn: '2FA', value: ar('غير مفعلة', 'Not enabled'), color: 'from-amber-50 to-yellow-50', border: 'border-amber-200/60', iconBg: 'bg-amber-100', iconColor: 'text-amber-500' },
                          { icon: 'fa-chart-simple', labelAr: 'محاولات تسجيل الدخول', labelEn: 'Login Attempts', value: '5', color: 'from-emerald-50 to-teal-50', border: 'border-emerald-200/60', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-500' },
                          { icon: 'fa-firewall', labelAr: 'جدار الحماية', labelEn: 'Firewall', value: ar('نشط', 'Active'), color: 'from-cyan-50 to-sky-50', border: 'border-cyan-200/60', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-500' },
                        ].map((item, i) => (
                          <div key={i} className={`flex items-center justify-between p-4 bg-gradient-to-br ${item.color} rounded-2xl border ${item.border}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center`}>
                                <i className={`fas ${item.icon} ${item.iconColor} text-sm`}></i>
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{language === 'ar' ? item.labelAr : item.labelEn}</p>
                              </div>
                            </div>
                            <span className="text-sm font-black text-slate-700">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </SectionCard>
                )}

                {/* NOTIFICATIONS */}
                {activeTab === 'notifications' && (
                  <SectionCard key="notifications" icon="fa-bell" title={ar('الإشعارات', 'Notifications')} description={ar('قنوات التنبيه والتواصل', 'Alert channels and messaging')}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { icon: 'fa-envelope', labelAr: 'البريد الإلكتروني', labelEn: 'Email', color: 'from-blue-50 to-indigo-50', border: 'border-blue-200/60', iconBg: 'bg-blue-100', iconColor: 'text-blue-500', active: true },
                        { icon: 'fa-mobile-screen-button', labelAr: 'رسائل SMS', labelEn: 'SMS', color: 'from-emerald-50 to-teal-50', border: 'border-emerald-200/60', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-500', active: false },
                        { icon: 'fa-bell', labelAr: 'إشعارات المتصفح', labelEn: 'Push', color: 'from-amber-50 to-yellow-50', border: 'border-amber-200/60', iconBg: 'bg-amber-100', iconColor: 'text-amber-500', active: true },
                        { icon: 'fa-comment', labelAr: 'واتساب', labelEn: 'WhatsApp', color: 'from-cyan-50 to-sky-50', border: 'border-cyan-200/60', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-500', active: false },
                      ].map((ch, i) => (
                        <div key={i} className={`bg-gradient-to-br ${ch.color} rounded-2xl border ${ch.border} p-5`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 rounded-xl ${ch.iconBg} flex items-center justify-center`}>
                              <i className={`fas ${ch.icon} ${ch.iconColor} text-lg`}></i>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${ch.active ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                              {ch.active && <i className="fas fa-check text-[8px] text-white"></i>}
                            </div>
                          </div>
                          <p className="text-sm font-bold text-slate-800">{language === 'ar' ? ch.labelAr : ch.labelEn}</p>
                          <p className={`text-xs font-bold mt-1 ${ch.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {ch.active ? ar('مفعل', 'Enabled') : ar('غير مفعل', 'Disabled')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* BACKUP */}
                {activeTab === 'backup' && (
                  <SectionCard key="backup" icon="fa-database" title={ar('النسخ الاحتياطي', 'Backup and Restore')} description={ar('الخزانة الكهرومغناطيسية واستعادة البيانات', 'Data vault and restoration')}>
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl border border-cyan-200/60 p-6 flex flex-col sm:flex-row items-center gap-5 group hover:border-cyan-300/80 transition-all duration-300">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                          <i className="fas fa-cloud-arrow-down text-2xl text-cyan-600"></i>
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <h4 className="text-base font-black text-slate-800 mb-1">{ar('تصدير نسخة احتياطية', 'Export Backup')}</h4>
                          <p className="text-sm text-slate-500 font-medium">{ar('جميع بيانات الموظفين، الحضور، والرواتب', 'All employee, attendance, and payroll data')}</p>
                        </div>
                        <motion.button onClick={createBackup} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-3 px-6 rounded-xl shadow-md shadow-cyan-200/40 transition-all shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 text-sm">
                          <i className="fas fa-file-export"></i> {ar('تصدير', 'Export')}
                        </motion.button>
                      </div>
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200/60 p-6 flex flex-col sm:flex-row items-center gap-5 group hover:border-indigo-300/80 transition-all duration-300">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                          <i className="fas fa-cloud-arrow-up text-2xl text-indigo-600"></i>
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <h4 className="text-base font-black text-slate-800 mb-1">{ar('استعادة نسخة احتياطية', 'Restore Backup')}</h4>
                          <p className="text-sm text-slate-500 font-medium">{ar('رفع ملف JSON لاستعادة البيانات', 'Upload a JSON file to restore previous data')}</p>
                        </div>
                        <div className="shrink-0 w-full sm:w-auto">
                          <input type="file" accept=".json" onChange={restoreBackup} id="restore-file-input" className="hidden" />
                          <label htmlFor="restore-file-input"
                            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold py-3 px-6 rounded-xl shadow-md shadow-indigo-200/40 transition-all cursor-pointer text-sm">
                            <i className="fas fa-file-import"></i> {ar('استعادة', 'Restore')}
                          </label>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl border border-rose-200/60 p-6">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center mb-4">
                            <i className="fas fa-radiation text-2xl text-rose-500"></i>
                          </div>
                          <h4 className="text-lg font-black text-slate-800 mb-2">{ar('منطقة الخطر', 'Danger Zone')}</h4>
                          <p className="text-sm text-slate-500 max-w-md mb-5">
                            {ar('سيتم حذف جميع بيانات النظام بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.', 'This will permanently delete ALL system data. This action cannot be undone.')}
                          </p>
                          <motion.button onClick={clearAllData} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            className="bg-rose-500 hover:bg-rose-400 text-white font-black py-3.5 px-8 rounded-xl shadow-lg shadow-rose-200/40 transition-all flex items-center gap-2.5 text-sm">
                            <i className="fas fa-trash-can"></i> {ar('حذف جميع البيانات', 'Delete All Data')}
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                )}

                {/* DEVELOPER */}
                {activeTab === 'developer' && (
                  <SectionCard key="developer" icon="fa-code" title={ar('أدوات المطور', 'Developer Tools')} description={ar('واجهات API، السجلات، ومعلومات النظام', 'APIs, logs, and system information')}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200/60 p-6">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <i className="fas fa-plug text-slate-500"></i> {ar('واجهة API', 'API Endpoints')}
                        </h4>
                        <div className="space-y-2">
                          {['/api/employees', '/api/attendance', '/api/payroll', '/api/loans'].map((ep, i) => (
                            <div key={i} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-slate-200">
                              <code className="text-xs font-mono font-bold text-slate-600">{ep}</code>
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">200</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200/60 p-6">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <i className="fas fa-circle-info text-slate-500"></i> {ar('معلومات النظام', 'System Information')}
                        </h4>
                        <div className="space-y-2">
                          {[
                            { label: ar('الإطار', 'Framework'), value: 'Next.js 14' },
                            { label: ar('قاعدة البيانات', 'Database'), value: 'SQLite' },
                            { label: 'Node.js', value: 'v20.x' },
                            { label: ar('نظام التشغيل', 'OS'), value: 'Windows' },
                          ].map((info, i) => (
                            <div key={i} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-slate-200">
                              <span className="text-xs font-bold text-slate-500">{info.label}</span>
                              <span className="text-xs font-bold font-mono text-slate-800">{info.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="md:col-span-2 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200/60 p-6">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <i className="fas fa-list-check text-slate-500"></i> {ar('سجل التدقيق', 'Audit Log')}
                        </h4>
                        <div className="space-y-1.5">
                          {[
                            { action: ar('تحديث الإعدادات', 'Settings updated'), time: ar('منذ ساعة', '1 hour ago'), user: 'Admin' },
                            { action: ar('تغيير كلمة المرور', 'Password changed'), time: ar('منذ 3 ساعات', '3 hours ago'), user: 'Admin' },
                            { action: ar('نسخ احتياطي', 'Backup created'), time: ar('منذ 5 ساعات', '5 hours ago'), user: 'System' },
                          ].map((log, i) => (
                            <div key={i} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-100">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="text-sm font-medium text-slate-700">{log.action}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-400">{log.user}</span>
                                <span className="text-xs text-slate-400">.</span>
                                <span className="text-xs text-slate-400">{log.time}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* FOOTER */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-slate-200/60">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="font-bold">&copy; {new Date().getFullYear()} HR MK Enterprise</span>
              <span className="hidden sm:inline">.</span>
              <span className="hidden sm:inline font-medium">{ar('الإصدار', 'Version')} 3.2.1</span>
              <span className="hidden sm:inline">.</span>
              <span className="hidden sm:inline font-medium">{ar('آخر حفظ', 'Last saved')}: {timeStr}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                {ar('جميع الأنظمة تعمل', 'All systems operational')}
              </span>
            </div>
          </motion.div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}