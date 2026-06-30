import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import toast from 'react-hot-toast'

const DeviceModal = ({ isOpen, onClose, onSave, device }) => {
  const { language } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e
  const isEdit = !!device
  const empty = { name: '', ip: '', port: 4370, timeout: 5000, inport: 4000, location: '', description: '', isActive: true }
  const [form, setForm] = useState(empty)

  useEffect(() => { setForm(isEdit ? { ...device } : empty) }, [isOpen, device])
  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} className="modal-panel max-w-lg">
            <div className="modal-header">
              <h3 className="text-lg font-black text-surface-900 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                  <i className={`fas ${isEdit ? 'fa-pen-to-square' : 'fa-plus'} text-sm`}></i>
                </div>
                {isEdit ? ar('تعديل جهاز البصمة', 'Edit Biometric Device') : ar('ربط جهاز بصمة جديد', 'Add New Device')}
              </h3>
              <button onClick={onClose} className="w-9 h-9 rounded-xl bg-surface-50 text-surface-500 hover:bg-surface-100 border border-surface-200 flex items-center justify-center transition-colors">
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>
            <div className="modal-body space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{ar('اسم الجهاز *', 'Device Name *')}</label>
                <input name="name" value={form.name} onChange={handle} className="input text-xs font-bold" placeholder={ar('مثال: جهاز البصمة الرئيسي', 'e.g. Main Biometric Device')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{ar('عنوان IP *', 'IP Address *')}</label>
                  <input name="ip" value={form.ip} onChange={handle} className="input text-xs font-bold font-mono text-left" placeholder="192.168.0.201" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{ar('المنفذ', 'Port')}</label>
                  <input name="port" type="number" value={form.port} onChange={handle} className="input text-xs font-bold font-mono text-left" placeholder="4370" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{ar('مهلة الاتصال (ms)', 'Timeout (ms)')}</label>
                  <input name="timeout" type="number" value={form.timeout} onChange={handle} className="input text-xs font-bold font-mono text-left" placeholder="5000" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{ar('منفذ الإدخال', 'Input Port')}</label>
                  <input name="inport" type="number" value={form.inport} onChange={handle} className="input text-xs font-bold font-mono text-left" placeholder="4000" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{ar('الموقع الجغرافي', 'Location')}</label>
                <input name="location" value={form.location} onChange={handle} className="input text-xs font-bold" placeholder={ar('مثال: المدخل الرئيسي', 'e.g. Main Entrance')} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{ar('الوصف', 'Description')}</label>
                <textarea name="description" value={form.description} onChange={handle} rows={2} className="input text-xs min-h-[60px] resize-none" placeholder={ar('وصف مختصر عن الجهاز...', 'Brief description...')} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer group pt-1">
                <div className="relative">
                  <input type="checkbox" name="isActive" checked={form.isActive} onChange={handle} className="sr-only" />
                  <div className={`w-10 h-6 rounded-full transition-colors ${form.isActive ? 'bg-emerald-500' : 'bg-surface-300'}`}></div>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : ''}`}></div>
                </div>
                <span className="text-xs font-bold text-surface-600 group-hover:text-surface-900 transition-colors">{ar('تفعيل الجهاز فور الإضافة', 'Activate device immediately')}</span>
              </label>
            </div>
            <div className="modal-footer">
              <button onClick={onClose} className="btn btn-secondary btn-md">{ar('إلغاء', 'Cancel')}</button>
              <button onClick={() => onSave(form)} className="btn btn-primary btn-md flex-1">
                <i className={`fas ${isEdit ? 'fa-floppy-disk' : 'fa-satellite-dish'} text-xs`}></i>
                {isEdit ? ar('حفظ التعديلات', 'Save Changes') : ar('ربط الجهاز', 'Connect Device')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

const STATUS = {
  'متصل': { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', pulse: true },
  'غير متصل': { color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', dot: 'bg-rose-500', pulse: false },
  'خطأ': { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500', pulse: false },
  'غير محدد': { color: 'text-surface-600', bg: 'bg-surface-50 border-surface-200', dot: 'bg-surface-400', pulse: false },
}

const STATUS_EN = {
  'متصل': 'Connected', 'غير متصل': 'Offline', 'خطأ': 'Error', 'غير محدد': 'Unknown'
}

const st = (s) => STATUS[s] || STATUS['غير محدد']

export default function BiometricDevices() {
  const { language } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editDevice, setEditDevice] = useState(null)
  const [testingId, setTestingId] = useState(null)

  useEffect(() => { load() }, [])

  const load = () => {
    try {
      setLoading(true)
      const saved = localStorage.getItem('biometricDevices')
      if (saved) { setDevices(JSON.parse(saved)) }
      else {
        const defaults = [
          { id: '1', name: ar('جهاز البصمة الرئيسي', 'Main Biometric Device'), ip: '192.168.0.201', port: 4370, timeout: 5000, inport: 4000, location: ar('المدخل الرئيسي', 'Main Entrance'), description: ar('الجهاز الأساسي لتسجيل الحضور والانصراف', 'Primary attendance device'), isActive: true, status: 'متصل', lastCheck: new Date().toISOString(), createdAt: new Date().toISOString() },
          { id: 'demo-1', name: ar('جهاز تجريبي', 'Demo Device'), ip: '127.0.0.1', port: 4370, timeout: 5000, inport: 4000, location: ar('بيئة الاختبار', 'Test Environment'), description: ar('جهاز محاكاة للاختبار', 'Simulation device for testing'), isActive: true, status: 'متصل', lastCheck: new Date().toISOString(), createdAt: new Date().toISOString(), isDemo: true }
        ]
        setDevices(defaults)
        localStorage.setItem('biometricDevices', JSON.stringify(defaults))
      }
    } catch (e) { toast.error(ar('خطأ في تحميل بيانات الأجهزة', 'Error loading device data')) }
    finally { setLoading(false) }
  }

  const persist = (list) => { localStorage.setItem('biometricDevices', JSON.stringify(list)); setDevices(list) }

  const handleSave = (form) => {
    if (!form.name || !form.ip) return toast.error(ar('الاسم وعنوان IP مطلوبان', 'Name and IP address are required'))
    if (editDevice) {
      persist(devices.map(d => d.id === editDevice.id ? { ...form, id: editDevice.id, updatedAt: new Date().toISOString() } : d))
      toast.success(ar('تم تحديث بيانات الجهاز', 'Device updated'))
    } else {
      if (devices.find(d => d.ip === form.ip && d.port === form.port)) return toast.error(ar('جهاز بنفس IP والمنفذ موجود بالفعل', 'Device with same IP and port already exists'))
      persist([...devices, { ...form, id: Date.now().toString(), status: 'غير محدد', lastCheck: null, createdAt: new Date().toISOString() }])
      toast.success(ar('تم ربط الجهاز بنجاح', 'Device connected successfully'))
    }
    setShowModal(false); setEditDevice(null)
  }

  const handleDelete = (id) => {
    if (confirm(ar('هل تؤكد حذف هذا الجهاز؟', 'Are you sure you want to delete this device?'))) {
      persist(devices.filter(d => d.id !== id))
      toast.success(ar('تم حذف الجهاز', 'Device deleted'))
    }
  }

  const handleToggle = (id) => { persist(devices.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d)) }

  const handleTest = async (device) => {
    setTestingId(device.id)
    try {
      const res = await fetch('/api/biometric/test-connection', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: device.ip, port: device.port, timeout: device.timeout })
      })
      const result = await res.json()
      persist(devices.map(d => d.id === device.id ? { ...d, status: result.success ? 'متصل' : 'غير متصل', lastCheck: new Date().toISOString(), lastError: result.success ? null : result.message } : d))
      result.success ? toast.success(ar('اتصال ناجح', 'Connection successful')) : toast.error(ar('فشل الاتصال', 'Connection failed'))
    } catch (e) { toast.error(ar('خطأ في اختبار الاتصال', 'Connection test error')) }
    finally { setTestingId(null) }
  }

  const filtered = filter === 'all' ? devices : filter === 'active' ? devices.filter(d => d.isActive) : devices.filter(d => !d.isActive)

  const stats = [
    { label: ar('إجمالي الأجهزة', 'Total Devices'), value: devices.length, icon: 'fa-server', color: 'bg-brand-50 text-brand-600' },
    { label: ar('أجهزة نشطة', 'Active'), value: devices.filter(d => d.isActive).length, icon: 'fa-power-off', color: 'bg-emerald-50 text-emerald-600' },
    { label: ar('متصلة الآن', 'Connected'), value: devices.filter(d => d.status === 'متصل').length, icon: 'fa-wifi', color: 'bg-violet-50 text-violet-600' },
    { label: ar('انقطاع / خطأ', 'Offline / Error'), value: devices.filter(d => ['غير متصل', 'خطأ'].includes(d.status)).length, icon: 'fa-triangle-exclamation', color: 'bg-rose-50 text-rose-600' },
  ]

  return (
    <ProtectedRoute>
      <Layout>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 border-4 border-surface-300 border-t-brand-600 rounded-full animate-spin"></div>
            <p className="text-surface-500 font-bold text-xs animate-pulse">{ar('جاري تحميل بيانات الأجهزة...', 'Loading device data...')}</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="page-title">{ar('أجهزة البصمة', 'Biometric Devices')}</h1>
                <p className="page-description">{ar('مراقبة وإدارة أجهزة بصمة الوجه والإصبع المتصلة بالنظام', 'Monitor and manage connected biometric devices')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { devices.forEach(d => d.isActive && handleTest(d)) }} disabled={!!testingId} className="btn btn-secondary btn-md">
                  <i className="fas fa-satellite-dish"></i> {ar('فحص الشبكة', 'Network Check')}
                </button>
                <button onClick={() => { setEditDevice(null); setShowModal(true) }} className="btn btn-primary btn-md">
                  <i className="fas fa-plus"></i> {ar('ربط جهاز جديد', 'Add New Device')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, i) => (
                <div key={i} className="bg-white border border-surface-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color.split(' ')[0]} ${stat.color.split(' ')[1]}`}>
                    <i className={`fas ${stat.icon} text-lg`}></i>
                  </div>
                  <div>
                    <p className="text-xl font-black text-surface-900 leading-none">{stat.value}</p>
                    <p className="text-xs font-bold text-surface-500 mt-1">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex bg-surface-50 p-1 rounded-xl border border-surface-200 gap-1">
                {[
                  ['all', ar('الكل', 'All')],
                  ['active', ar('النشطة', 'Active')],
                  ['inactive', ar('الموقوفة', 'Inactive')]
                ].map(([val, label]) => (
                  <button key={val} onClick={() => setFilter(val)}
                    className={`px-4 py-1.5 rounded-lg font-black text-xs transition-all duration-200 ${filter === val ? 'bg-white text-brand-600 shadow-sm border border-surface-200' : 'text-surface-500 hover:text-surface-950'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-surface-400">{ar(`${filtered.length} أجهزة بصمة`, `${filtered.length} devices`)}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((device, i) => {
                  const s = st(device.status)
                  const isTesting = testingId === device.id
                  return (
                    <motion.div key={device.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }} transition={{ delay: i * 0.02 }}
                      className={`relative overflow-hidden p-5 rounded-2xl bg-white border ${device.isActive ? 'border-surface-200 hover:border-brand-200' : 'border-surface-200 opacity-60'} hover:shadow-md transition-all duration-200 flex flex-col`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${device.isActive ? 'bg-brand-50 border-brand-100 text-brand-600' : 'bg-surface-50 border-surface-200 text-surface-400'}`}>
                            <i className="fas fa-fingerprint text-lg"></i>
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-surface-900 leading-tight">{device.name}</h3>
                            <p className="text-xs text-surface-400 font-bold mt-0.5">{device.location || ar('موقع غير محدد', 'Location not set')}</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black ${s.bg} ${s.color}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${s.dot} ${s.pulse ? 'animate-pulse' : ''}`}></div>
                          <span>{device.status || ar('غير محدد', 'Unknown')}</span>
                        </div>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="bg-surface-50 border border-surface-200 rounded-xl p-2.5">
                            <p className="text-[10px] text-surface-400 font-bold">{ar('عنوان IP', 'IP Address')}</p>
                            <p className="text-xs font-black text-surface-800 font-mono mt-0.5">{device.ip}</p>
                          </div>
                          <div className="bg-surface-50 border border-surface-200 rounded-xl p-2.5">
                            <p className="text-[10px] text-surface-400 font-bold">{ar('المنفذ', 'Port')}</p>
                            <p className="text-xs font-black text-surface-800 font-mono mt-0.5">{device.port}</p>
                          </div>
                        </div>
                        {device.description && <p className="text-xs text-surface-500 font-medium leading-relaxed line-clamp-2">{device.description}</p>}
                        <div className="flex items-center gap-1.5 text-[10px] text-surface-400 font-bold">
                          <i className="fas fa-clock-rotate-left"></i>
                          <span>{device.lastCheck ? ar(`آخر فحص: ${new Date(device.lastCheck).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}`, `Last check: ${new Date(device.lastCheck).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}`) : ar('لم يتم الفحص بعد', 'Not checked yet')}</span>
                        </div>
                        {device.lastError && (
                          <div className="bg-rose-50 border border-rose-100 rounded-lg p-2.5 text-[10px] text-rose-600 font-bold">
                            <i className="fas fa-circle-exclamation mr-1"></i>{device.lastError}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-surface-100 mt-auto">
                        <button onClick={() => handleTest(device)} disabled={isTesting}
                          className="flex-1 btn btn-secondary btn-sm flex items-center justify-center gap-1.5 h-8 py-0">
                          {isTesting ? <div className="w-3.5 h-3.5 border-2 border-surface-300 border-t-brand-600 rounded-full animate-spin"></div> : <><i className="fas fa-plug text-[10px]"></i><span>{ar('اختبار الاتصال', 'Test Connection')}</span></>}
                        </button>
                        <button onClick={() => { setEditDevice(device); setShowModal(true) }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                          style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#4f46e5'; e.currentTarget.style.color = 'white' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.color = '#4f46e5' }}
                          title={ar('تعديل الجهاز', 'Edit Device')}>
                          <i className="fas fa-pen text-xs"></i>
                        </button>
                        <button onClick={() => handleToggle(device.id)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 border ${device.isActive ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white'}`}
                          title={device.isActive ? ar('إيقاف مؤقت', 'Deactivate') : ar('تفعيل', 'Activate')}>
                          <i className={`fas ${device.isActive ? 'fa-pause' : 'fa-play'} text-xs`}></i>
                        </button>
                        {devices.length > 1 && (
                          <button onClick={() => handleDelete(device.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                            style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#e11d48'; e.currentTarget.style.color = 'white' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#e11d48' }}
                            title={ar('حذف نهائي', 'Delete')}>
                            <i className="fas fa-trash text-xs"></i>
                          </button>
                        )}
                      </div>
                      {device.isDemo && (
                        <div className="absolute top-2 left-2 bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                          {ar('تجريبي', 'Demo')}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
              {filtered.length === 0 && (
                <div className="empty-state lg:col-span-2 xl:col-span-3">
                  <div className="empty-icon"><i className="fas fa-satellite-slash"></i></div>
                  <h3 className="empty-title">{ar('لا توجد أجهزة متوفرة', 'No devices available')}</h3>
                  <p className="empty-desc">{ar('لم نجد أي أجهزة بصمة نشطة تطابق تصفيتك الحالية.', 'No active biometric devices match your current filter.')}</p>
                </div>
              )}
            </div>

            <DeviceModal isOpen={showModal} onClose={() => { setShowModal(false); setEditDevice(null) }} onSave={handleSave} device={editDevice} />
          </motion.div>
        )}
      </Layout>
    </ProtectedRoute>
  )
}
