import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import { useData } from '../contexts/DataContext'
import { useLanguage } from '../contexts/LanguageContext'

// ==================== Custom Hooks ====================
const useClickOutside = (ref, callback) => {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        callback()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, callback])
}

// ==================== Sub-Components ====================

// 1. Cybernetic Clock Component (Light-Theme Premium)
const PremiumClock = ({ language }) => {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeString = time.toLocaleTimeString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  const [timeOnly, ampm] = timeString.split(' ')

  const dateString = time.toLocaleDateString(
    language === 'ar' ? 'ar-EG' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  )

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl blur-lg" />
      <div className="relative bg-white border border-slate-200 rounded-2xl py-3.5 px-6 shadow-xl shadow-slate-150/40 flex flex-col items-center gap-0.5 font-sans">
        <div className="flex items-baseline gap-1.5" dir="ltr">
          <span className="text-3xl md:text-4xl font-black font-mono tracking-tighter text-slate-800">
            {timeOnly}
          </span>
          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 py-0.5 px-1.5 rounded uppercase tracking-wider">
            {ampm}
          </span>
        </div>
        <div className="text-[10px] font-bold text-slate-555 tracking-wide mt-0.5" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          {dateString}
        </div>
      </div>
    </motion.div>
  )
}

// 2. Futuristic Multi-Select Selector (Light-Theme UI)
const PremiumEmployeeSelect = ({ employees, selectedIds, onSelect, ar }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selectRef = useRef(null)

  useClickOutside(selectRef, () => setIsOpen(false))

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return employees
    return employees.filter(emp => 
      emp.name?.toLowerCase().includes(q) || 
      String(emp.code || '').includes(q)
    )
  }, [employees, search])

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter(x => x !== id))
    } else {
      onSelect([...selectedIds, id])
    }
  }

  const selectAllFiltered = () => {
    const newIds = filtered.map(e => e.id)
    const combined = Array.from(new Set([...selectedIds, ...newIds]))
    onSelect(combined)
  }

  const deselectAllFiltered = () => {
    const newIds = filtered.map(e => e.id)
    onSelect(selectedIds.filter(id => !newIds.includes(id)))
  }

  return (
    <div className="relative w-full" ref={selectRef}>
      <motion.div
        whileHover={{ scale: 1.002 }}
        whileTap={{ scale: 0.998 }}
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full bg-slate-50 hover:bg-slate-100/60 border border-slate-200 hover:border-indigo-300 rounded-2xl py-3.5 px-4 text-slate-800 cursor-pointer flex justify-between items-center transition-all duration-200 shadow-sm"
      >
        <div className="flex items-center gap-3 w-11/12 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <i className="fas fa-users text-sm" />
          </div>
          <div className="flex flex-col text-right truncate">
            {selectedIds.length > 0 ? (
              <>
                <span className="font-extrabold text-indigo-600 text-sm">
                  {ar(`تم تحديد ${selectedIds.length} موظف`, `${selectedIds.length} Employees Selected`)}
                </span>
                <span className="text-[10px] text-slate-500 truncate">
                  {selectedIds.map(id => employees.find(e => e.id === id)?.name).filter(Boolean).join('، ')}
                </span>
              </>
            ) : (
              <span className="text-slate-400 text-xs font-semibold">
                {ar('اضغط للبحث واختيار الموظفين...', 'Click to select employees...')}
              </span>
            )}
          </div>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="text-slate-400">
          <i className="fas fa-chevron-down text-xs" />
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Search Input */}
            <div className="p-3 border-b border-slate-100 relative bg-slate-50/50 flex items-center gap-2">
              <i className="fas fa-search absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                autoFocus
                type="text"
                placeholder={ar('بحث بالاسم أو الرقم الوظيفي...', 'Search employees...')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl py-2.5 pr-11 pl-4 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none transition-all"
              />
            </div>

            {/* Quick Bulk Selection Options */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-slate-100 bg-slate-50 text-[10px]">
              <button 
                type="button"
                onClick={selectAllFiltered}
                className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors flex items-center gap-1"
              >
                <i className="fas fa-check-double" />
                {ar('تحديد الكل', 'Select All')}
              </button>
              <button 
                type="button"
                onClick={deselectAllFiltered}
                className="text-slate-505 hover:text-slate-700 font-bold transition-colors flex items-center gap-1"
              >
                <i className="fas fa-times-circle" />
                {ar('إلغاء تحديد الكل', 'Deselect All')}
              </button>
            </div>

            {/* Employee Check List */}
            <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar bg-white">
              {filtered.length > 0 ? (
                filtered.map((emp) => {
                  const isSelected = selectedIds.includes(emp.id)
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleSelect(emp.id)}
                      className={`group flex flex-row-reverse justify-between items-center px-3 py-2 rounded-xl cursor-pointer text-xs transition-all ${
                        isSelected 
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-100 font-medium' 
                          : 'hover:bg-slate-50 border border-transparent text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-row-reverse">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-105 text-slate-650'
                        }`}>
                          {emp.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="font-semibold text-slate-800">{emp.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono mt-0.5">#{emp.code || emp.id}</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'border-slate-350 bg-white group-hover:border-indigo-400'
                        }`}>
                          {isSelected && <i className="fas fa-check text-[9px] font-black" />}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-6 text-center flex flex-col items-center justify-center opacity-65">
                  <i className="fas fa-search text-2xl mb-1 text-slate-300" />
                  <span className="text-[11px] font-medium text-slate-400">{ar('لم يتم العثور على موظفين', 'No employees found')}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// 3. Cybernetic Success Modal (Light-Theme)
const SuccessModal = ({ show, onClose, ar }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 2500)
      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-white border border-slate-200 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center overflow-hidden"
          >
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
              <i className="fas fa-check-circle" />
            </div>
            
            <h2 className="text-xl font-bold text-slate-950 mb-1">
              {ar('تم الحفظ بنجاح', 'Success!')}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              {ar('تمت العملية وحفظت السجلات بنجاح في النظام.', 'Action completed and logged securely.')}
            </p>
            
            <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-right text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>{new Date().toLocaleTimeString()}</span>
                <span className="font-bold text-slate-650">{ar('وقت المزامنة:', 'Sync Time:')}</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ==================== Main Component ====================
export default function AttendanceRegistration() {
  const { employees } = useData()
  const { language } = useLanguage()
  const ar = useCallback((a, e) => language === 'ar' ? a : e, [language])

  const [activeTab, setActiveTab] = useState('manual')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
  const [selectedSearch, setSelectedSearch] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [location, setLocation] = useState(null)
  const [isScanning, setIsScanning] = useState(false)

  // Real-time device connection status
  const [configuredDevices, setConfiguredDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState(null) // null means all devices
  const [deviceStatus, setDeviceStatus] = useState(null) // 'loading', 'connected', 'disconnected', null
  const [deviceError, setDeviceError] = useState('')
  
  const scanTimeoutRef = useRef(null)

  // Load configured devices from browser localStorage on load
  const loadConfiguredDevices = useCallback(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('biometricDevices')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setConfiguredDevices(parsed.filter(d => d.isActive))
        } catch (e) {
          console.error('Error loading devices from localStorage', e)
        }
      }
    }
  }, [])

  useEffect(() => {
    loadConfiguredDevices()
    return () => {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current)
    }
  }, [loadConfiguredDevices])

  // Test device connection status
  const testDeviceConnection = useCallback(async () => {
    setDeviceStatus('loading')
    setDeviceError('')
    try {
      const savedDevices = localStorage.getItem('biometricDevices')
      const devices = savedDevices ? JSON.parse(savedDevices) : []
      
      let activeDevs = devices.filter(d => d.isActive)
      if (selectedDeviceId) {
        activeDevs = activeDevs.filter(d => d.id === selectedDeviceId)
      }

      if (activeDevs.length === 0) {
        setDeviceStatus('disconnected')
        setDeviceError(language === 'ar' ? 'لا توجد أجهزة بصمة نشطة مضافة في النظام' : 'No active devices configured')
        return
      }

      const response = await fetch('/api/attendance?test=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices: activeDevs })
      })
      const result = await response.json()
      
      if (result.success && result.devices && result.devices.length > 0) {
        const anyConnected = result.devices.some(d => d.success)
        setDeviceStatus(anyConnected ? 'connected' : 'disconnected')
        
        // Update device status representation in local state
        setConfiguredDevices(prev => prev.map(d => {
          const resDev = result.devices.find(x => x.device === d.name || x.device === d.ip)
          return {
            ...d,
            status: resDev ? (resDev.success ? 'متصل' : 'غير متصل') : d.status,
            error: resDev && !resDev.success ? resDev.error : null
          }
        }))

        if (anyConnected) {
          toast.success(ar('جهاز البصمة متصل ويعمل بشكل سليم', 'Biometric device is active and connected'))
        } else {
          const firstErr = result.devices.find(d => !d.success)?.error || 'Connection failed'
          setDeviceError(firstErr)
          toast.error(ar('فشل الاتصال بجهاز البصمة', 'Failed to connect to biometric device'))
        }
      } else {
        setDeviceStatus('disconnected')
        setDeviceError(result.error || 'No active devices found')
      }
    } catch (e) {
      setDeviceStatus('disconnected')
      setDeviceError(e.message)
    }
  }, [ar, language, selectedDeviceId])

  // Automatically test connection when switching to biometric tab
  useEffect(() => {
    if (activeTab === 'biometric') {
      loadConfiguredDevices()
      testDeviceConnection()
    }
  }, [activeTab, loadConfiguredDevices, testDeviceConnection])

  const handleAction = useCallback(async (type, source) => {
    if (selectedEmployeeIds.length === 0) {
      toast.error(ar('الرجاء تحديد موظف واحد على الأقل', 'Please select at least one employee'))
      return
    }

    setLoading(true)
    const now = new Date()
    const isoDate = now.toISOString().split('T')[0]
    const timeStr = now.toTimeString().slice(0, 5)

    try {
      const payload = {
        employee_ids: selectedEmployeeIds,
        date: isoDate,
        check_in: type === 'check-in' ? timeStr : null,
        check_out: type === 'check-out' ? timeStr : null,
        status: source,
        notes: notes + (location ? ` | GPS: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : '')
      }

      const response = await fetch('/api/manual-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      if (!result?.success) {
        throw new Error(result?.message || ar('فشل في حفظ السجلات', 'Failed to save records'))
      }

      // Check results for any skipped duplicates
      if (result.results && result.results.length > 0) {
        const duplicates = result.results.filter(r => r.isDuplicate);
        const successes = result.results.filter(r => r.success && !r.isDuplicate);
        
        if (duplicates.length > 0) {
          toast.warn(ar(
            `تم تسجيل ${successes.length}، وتجاهل ${duplicates.length} تكرارات خلال 10 دقائق.`,
            `Registered ${successes.length}. Ignored ${duplicates.length} duplicate logs (within 10 mins).`
          ), { duration: 5000 });
        }
      }

      setShowSuccess(true)
      setSelectedEmployeeIds([])
      setNotes('')
      setLocation(null)
    } catch (error) {
      toast.error(`❌ ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }, [selectedEmployeeIds, notes, location, ar])

  const handleBiometricSync = useCallback(async () => {
    setLoading(true)
    try {
      const savedDevices = localStorage.getItem('biometricDevices')
      const devices = savedDevices ? JSON.parse(savedDevices) : []

      let activeDevs = devices.filter(d => d.isActive)
      if (selectedDeviceId) {
        activeDevs = activeDevs.filter(d => d.id === selectedDeviceId)
      }

      if (activeDevs.length === 0) {
        throw new Error(ar('لا توجد أجهزة بصمة نشطة للمزامنة', 'No active biometric devices configured'));
      }

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices: activeDevs })
      })
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || ar('فشل استيراد بيانات أجهزة البصمة', 'Failed to sync biometric logs'))
      }

      if (result.syncResults && result.syncResults.length > 0) {
        const successes = result.syncResults.filter(r => r.success);
        const failures = result.syncResults.filter(r => !r.success);
        const newEventsTotal = result.syncResults.reduce((acc, curr) => acc + (curr.newEvents || 0), 0);
        
        if (failures.length > 0) {
          toast.warn(ar(
            `تم مزامنة ${successes.length} أجهزة، وفشل ${failures.length}. تم سحب ${newEventsTotal} حركة جديدة.`,
            `Synced ${successes.length} devices, failed ${failures.length}. Fetched ${newEventsTotal} new records.`
          ));
        } else {
          toast.success(ar(
            `تم سحب ${newEventsTotal} حركة جديدة بنجاح وتصفية التكرار.`,
            `Fetched ${newEventsTotal} new biometric records successfully. Duplicates filtered.`
          ));
        }
      }

      setShowSuccess(true)
    } catch (error) {
      toast.error(`❌ ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }, [ar, selectedDeviceId])

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error(ar('المتصفح لا يدعم تحديد الموقع الجغرافي', 'Geolocation not supported'))
      return
    }

    setIsScanning(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        scanTimeoutRef.current = setTimeout(() => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          setIsScanning(false)
          toast.success(ar('تم التقاط الموقع بدقة عالية', 'Location locked successfully'))
        }, 1200)
      },
      () => {
        setIsScanning(false)
        toast.error(ar('فشل في التقاط الإحداثيات، يرجى تفعيل الصلاحيات', 'Permission denied'))
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [ar])

  const tabs = useMemo(() => [
    { 
      id: 'manual', 
      icon: 'fa-keyboard', 
      titleAr: 'الإدخال اليدوي الجماعي', 
      titleEn: 'Batch Manual Entry',
      descAr: 'تسجيل الحضور والانصراف للمجموعة',
    },
    { 
      id: 'biometric', 
      icon: 'fa-fingerprint', 
      titleAr: 'أجهزة البصمة الذكية', 
      titleEn: 'Biometric Devices',
      descAr: 'مزامنة وفحص أجهزة البصمة المضافة',
    }
  ], [])

  return (
    <ProtectedRoute>
      <Layout>
        <div 
          className="min-h-screen bg-slate-50/60 text-slate-800 py-10 px-4 sm:px-6 lg:px-8 font-sans relative antialiased"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          {/* Subtle background grid pattern */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-40" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.04),transparent_50%)]" />
          </div>

          <SuccessModal show={showSuccess} onClose={() => setShowSuccess(false)} ar={ar} />

          <div className="w-full mx-auto relative z-10 space-y-8" style={{ maxWidth: 'max-content' }}>
            
            {/* Command Header / Mode Selector */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col lg:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-200"
            >
              {/* Horizontal Tabs */}
              <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-3xl p-1.5 shadow-md shadow-slate-100 flex-1 w-full lg:w-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2.5 font-bold text-xs ${
                      activeTab === tab.id 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <i className={`fas ${tab.icon} ${activeTab === tab.id ? 'text-white' : 'text-indigo-650'}`} />
                    <span>{ar(tab.titleAr, tab.titleEn)}</span>
                  </button>
                ))}
              </div>
              <PremiumClock language={language} />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Diagnostics Panel */}
              <div className="lg:col-span-3 flex flex-col h-full">
 
                {/* Device Health Monitor */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-xl shadow-slate-150/40 relative overflow-hidden flex flex-col justify-between flex-1 h-full"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-150 mb-5">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-microchip text-indigo-500" />
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider">{ar('أجهزة البصمة المضافة', 'BIOMETRIC TERMINALS')}</h4>
                      </div>
                      {selectedDeviceId && (
                        <button
                          onClick={() => setSelectedDeviceId(null)}
                          className="text-[11px] font-bold text-indigo-650 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all"
                        >
                          {ar('إلغاء التحديد', 'Clear Select')}
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3" style={{ gridTemplateColumns: 'auto' }}>
                      <p className="text-[12.5px] font-bold text-slate-400 text-right leading-tight">
                        {ar('انقر لتحديد جهاز للمزامنة الفردية (إلغاء للجميع):', 'Click device to target specific sync (clear for all):')}
                      </p>
                      {configuredDevices.length > 0 ? (
                        configuredDevices.map(device => {
                          const isOnline = device.status === 'متصل'
                          const isOffline = device.status === 'غير متصل'
                          const isSelected = selectedDeviceId === device.id
                          return (
                            <div 
                              key={device.id} 
                              onClick={() => setSelectedDeviceId(prev => prev === device.id ? null : device.id)}
                              className={`border rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-500/10 shadow-sm' 
                                  : 'bg-slate-50 border-slate-100 hover:bg-slate-100/70 hover:border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="relative flex h-3 w-3 shrink-0">
                                  {isOnline ? (
                                    <>
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                    </>
                                  ) : isOffline ? (
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-[0_0_5px_rgba(239,68,68,0.4)]"></span>
                                  ) : (
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-400"></span>
                                  )}
                                </span>
                                <div className="text-right">
                                  <span className="block text-[13px] font-black text-slate-800 flex items-center gap-1.5">
                                    {device.name}
                                    {isSelected && <i className="fas fa-check-circle text-indigo-650 text-xs" />}
                                  </span>
                                  <span className="text-[12.5px] font-mono font-bold text-slate-450">IP: {device.ip}:{device.port}</span>
                                </div>
                              </div>
                              <div className="text-[11px] font-black font-mono flex flex-col items-end gap-1">
                                <div>
                                  {isOnline && <span className="text-emerald-600">ONLINE</span>}
                                  {isOffline && <span className="text-rose-500">OFFLINE</span>}
                                  {device.status === 'غير محدد' && <span className="text-slate-400">PENDING</span>}
                                </div>
                                {isSelected && (
                                  <span className="text-[9px] font-sans font-bold bg-indigo-100 text-indigo-700 py-0.5 px-1.5 rounded-md">
                                    {ar('مستهدف', 'Target')}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          <i className="fas fa-network-wired text-slate-350 text-xl mb-1 block" />
                          <span className="text-[10px] font-bold text-slate-400">
                            {ar('لا توجد أجهزة مضافة في النظام', 'No biometric devices linked')}
                          </span>
                        </div>
                      )}

                      {deviceError && (
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-[10px] font-mono text-rose-600 flex items-start gap-2">
                          <i className="fas fa-exclamation-triangle mt-0.5 shrink-0" />
                          <span className="leading-relaxed">{deviceError}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {configuredDevices.length > 0 && (
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={testDeviceConnection}
                        disabled={deviceStatus === 'loading'}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2.5 text-[10px] font-bold tracking-widest transition-all uppercase flex items-center justify-center gap-2"
                      >
                        <i className={`fas fa-arrows-rotate ${deviceStatus === 'loading' ? 'fa-spin' : ''}`} />
                        {deviceStatus === 'loading' ? ar('جاري الفحص...', 'DIAGNOSING...') : ar('فحص اتصال الأجهزة', 'PING DEVICES')}
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Operations Control Panel */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-9 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl shadow-slate-150/40 overflow-hidden relative"
              >
                {/* Visual Accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                
                <div className="p-8 md:p-10">
                  <AnimatePresence mode="wait">
                    
                    {/* Manual / GPS Panel */}
                    {(activeTab === 'manual' || activeTab === 'gps') && (
                      <motion.div
                        key="manual-gps-view"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                      >
                        {/* Panel Header */}
                        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-md ${activeTab === 'gps' ? 'bg-gradient-to-br from-emerald-450 to-teal-500 shadow-emerald-500/20' : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/20'}`}>
                            <i className={`fas ${activeTab === 'gps' ? 'fa-location-crosshairs' : 'fa-keyboard'}`} />
                          </div>
                          <div>
                            <h2 className="text-base font-black text-slate-800">
                              {activeTab === 'manual' ? ar('تسجيل الدخول والانصراف الجماعي اليدوي', 'Batch Manual Override') : ar('تسجيل الدخول الجماعي المقيد جغرافياً', 'Geo-Fenced Group Registration')}
                            </h2>
                            <p className="text-slate-400 text-xs mt-0.5">
                              {activeTab === 'manual' 
                                ? ar('قم باختيار الموظفين وتدوين الحركة يدوياً. يُحظر التكرار خلال 10 دقائق.', 'Select employees to log attendance overrides. Double checking is active.') 
                                : ar('تأكيد الإحداثيات الجغرافية لموقع الفروع أولاً لإتمام الحركات للموظفين.', 'Confirm branch location vectors to record geo-based group logs.')
                              }
                            </p>
                          </div>
                        </div>

                        {/* Batch Employee Selector Dropdown */}
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
                            <i className="fas fa-users-viewfinder text-indigo-500" />
                            {ar('اختيار الموظفين المستهدفين', 'SELECT TARGET EMPLOYEES')}
                          </label>
                          <PremiumEmployeeSelect
                            employees={employees}
                            selectedIds={selectedEmployeeIds}
                            onSelect={setSelectedEmployeeIds}
                            ar={ar}
                          />
                        </div>

                        {/* Selected Employees Grid Layout */}
                        {selectedEmployeeIds.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-inner"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-150">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-black text-indigo-650">
                                  {selectedEmployeeIds.length}
                                </span>
                                <h3 className="text-xs font-black text-slate-800">
                                  {ar('الموظفون الذين تم اختيارهم للتسجيل', 'Selected Target Employees')}
                                </h3>
                              </div>
                              <div className="flex items-center gap-3">
                                {/* Search within selected if list is long */}
                                {selectedEmployeeIds.length > 6 && (
                                  <div className="relative">
                                    <i className="fas fa-filter absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                                    <input
                                      type="text"
                                      placeholder={ar('تصفية المحددين...', 'Filter selected...')}
                                      value={selectedSearch}
                                      onChange={e => setSelectedSearch(e.target.value)}
                                      className="bg-white border border-slate-250 focus:border-indigo-500 rounded-lg py-1.5 pr-8 pl-3 text-[10px] font-bold text-slate-700 outline-none w-44 transition-all shadow-sm"
                                    />
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setSelectedEmployeeIds([])}
                                  className="text-[10px] font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/60 px-3 py-1.5 rounded-lg transition-all"
                                >
                                  {ar('إلغاء تحديد الجميع', 'Clear All')}
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                              {selectedEmployeeIds
                                .filter(id => {
                                  const emp = employees.find(e => e.id === id);
                                  if (!emp) return false;
                                  if (!selectedSearch) return true;
                                  return emp.name?.toLowerCase().includes(selectedSearch.toLowerCase().trim()) || String(emp.code || '').includes(selectedSearch.trim());
                                })
                                .map(id => {
                                  const emp = employees.find(e => e.id === id);
                                  if (!emp) return null;
                                  return (
                                    <div 
                                      key={id}
                                      className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2 hover:border-rose-450 hover:bg-rose-50/15 group transition-all duration-150 shadow-sm"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-6.5 h-6.5 rounded-lg bg-slate-100 border border-slate-150 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                                          {emp.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="text-right min-w-0">
                                          <span className="block text-[12px] font-black text-slate-800 truncate leading-tight">{emp.name}</span>
                                          <span className="block text-[10px] font-mono font-bold text-slate-400 mt-0.5">#{emp.code || emp.id}</span>
                                        </div>
                                      </div>
                                      <button 
                                        type="button" 
                                        onClick={() => setSelectedEmployeeIds(selectedEmployeeIds.filter(x => x !== id))}
                                        className="text-slate-350 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-md transition-all shrink-0"
                                        title={ar('إزالة', 'Remove')}
                                      >
                                        <i className="fas fa-times text-xs" />
                                      </button>
                                    </div>
                                  )
                                })
                              }
                            </div>
                          </motion.div>
                        )}

                        {/* GPS Module Location Verify UI */}
                        {activeTab === 'gps' && (
                          <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
                              <i className="fas fa-satellite text-emerald-500" />
                              {ar('حالة القمر الصناعي وتحديد الموقع الحالي', 'GEO AUTOLOCK BEACON')}
                            </label>
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-inner">
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-300 ${
                                    location ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : isScanning ? 'bg-amber-50 text-amber-500 border border-amber-200 animate-pulse' : 'bg-slate-200/50 text-slate-400 border border-slate-300'
                                  }`}>
                                    <i className={`fas ${location ? 'fa-location-arrow' : isScanning ? 'fa-spinner fa-spin' : 'fa-map-pin'}`} />
                                  </div>
                                  <div className="text-right">
                                    <h5 className="font-bold text-slate-800 text-sm">
                                      {location ? ar('تم تأكيد وقفل إحداثيات الموقع', 'GPS Target Locked') : isScanning ? ar('جاري الاتصال بالأقمار وتحديد المكان...', 'Acquiring satellite lock...') : ar('الموقع الجغرافي معلق', 'GPS Target Pending')}
                                    </h5>
                                    <p className="text-[10px] font-mono text-slate-500 mt-1">
                                      {location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : ar('يرجى التقاط الإحداثيات لتفعيل الإرسال', 'Diagnose GPS hardware link')}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={getLocation}
                                  disabled={isScanning}
                                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2 shadow-md"
                                >
                                  <i className="fas fa-crosshairs text-emerald-400" />
                                  {ar('التقاط الموقع', 'LOCK VECTOR')}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}



                        {/* Batch Action Buttons */}
                        <div className="grid grid-cols-2 gap-6 pt-2">
                          <motion.button
                            whileHover={{ scale: 1.01, y: -1 }}
                            whileTap={{ scale: 0.99 }}
                            disabled={loading || selectedEmployeeIds.length === 0 || (activeTab === 'gps' && !location)}
                            onClick={() => handleAction('check-in', activeTab === 'gps' ? 'GPS' : 'Manual')}
                            className="relative group bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl py-4.5 font-bold text-sm shadow-xl shadow-indigo-650/10 disabled:opacity-30 disabled:grayscale transition-all flex flex-col items-center justify-center gap-1"
                          >
                            <i className="fas fa-right-to-bracket text-lg" />
                            {loading ? ar('جاري الإرسال...', 'TRANSMITTING...') : ar('تسجيل حضور جماعي', 'BATCH CHECK-IN')}
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.01, y: -1 }}
                            whileTap={{ scale: 0.99 }}
                            disabled={loading || selectedEmployeeIds.length === 0 || (activeTab === 'gps' && !location)}
                            onClick={() => handleAction('check-out', activeTab === 'gps' ? 'GPS' : 'Manual')}
                            className="relative group bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-4.5 font-bold text-sm shadow-xl disabled:opacity-30 transition-all flex flex-col items-center justify-center gap-1"
                          >
                            <i className="fas fa-right-from-bracket text-lg text-indigo-400" />
                            {loading ? ar('جاري الإرسال...', 'TRANSMITTING...') : ar('تسجيل انصراف جماعي', 'BATCH CHECK-OUT')}
                          </motion.button>
                        </div>
                      </motion.div>
                    )}

                    {/* Biometric Devices Sync Panel */}
                    {activeTab === 'biometric' && (
                      <motion.div
                        key="biometric-ops-view"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col items-center justify-center py-10 text-center"
                      >
                        <div className="relative mb-8">
                          {/* Pulsing visual circles */}
                          <motion.div
                            animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0, 0.15] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 rounded-full border-2 border-indigo-450"
                          />
                          
                          <div className="relative w-36 h-36 bg-slate-50 border-4 border-white shadow-2xl rounded-full flex items-center justify-center z-10 overflow-hidden">
                            <i className={`fas fa-fingerprint text-6xl text-indigo-550 ${loading ? 'animate-pulse' : ''}`} />
                            {loading && (
                              <motion.div
                                initial={{ top: '-10%' }}
                                animate={{ top: '110%' }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
                              />
                            )}
                          </div>
                        </div>

                        <h3 className="text-xl font-black text-slate-850 mb-2 tracking-tight">
                          {ar('مزامنة الحركات السحابية لأجهزة البصمة', 'LIVE CORE BIOMETRIC SYNC')}
                        </h3>
                        <p className="text-slate-500 text-xs max-w-lg mx-auto mb-8 leading-relaxed font-bold">
                          {ar('تقوم هذه الوحدة بالاتصال المباشر بقواعد بيانات أجهزة البصمة المضافة والمشغلة بالفروع لسحب حركات الحضور المسجلة مع فلترة التكرارات (في أقل من 10 دقائق) وتسجيلها كأخطاء تكرار.', 'Direct connection to linked hardware terminals to pool raw transactions. Double scans within 10 minutes are identified and skipped.')}
                        </p>

                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          disabled={loading || deviceStatus !== 'connected'}
                          onClick={handleBiometricSync}
                          className="relative group bg-indigo-600 hover:bg-indigo-700 text-white rounded-full py-4 px-12 font-black text-sm shadow-xl shadow-indigo-650/20 disabled:opacity-40 flex items-center gap-3 overflow-hidden"
                        >
                          <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`} />
                          {loading ? ar('جاري الاتصال وسحب الحركات...', 'SYNC HANDSHAKE ACTIVE...') : ar('بدء المزامنة والربط الشامل', 'INITIATE ACTIVE SYNC')}
                        </motion.button>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}