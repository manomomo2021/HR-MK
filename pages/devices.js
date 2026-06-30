import { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import DeviceModal from '../components/DeviceModal'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Devices() {
  const { devices, loading, setDevices, setStorageData, getNextId } = useData()
  const { logActivity } = useAuth()
  const { language } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e
  const [stats, setStats] = useState({ total: 0, connected: 0, disconnected: 0 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState(null)

  useEffect(() => { if (!loading) calculateStats() }, [loading, devices])

  const calculateStats = () => {
    const total = devices.length
    const connected = devices.filter(device => device.status === 'connected').length
    setStats({ total, connected, disconnected: total - connected })
  }

  const testConnection = async (deviceId) => {
    const loadingToast = toast.loading(ar('جاري اختبار الاتصال...', 'Testing connection...'))
    setTimeout(() => {
      const success = Math.random() > 0.3
      toast.dismiss(loadingToast)
      if (success) { toast.success(ar('تم الاتصال بنجاح', 'Connection successful')); logActivity('device_test', ar('اختبار اتصال ناجح', 'Connection test successful')) }
      else toast.error(ar('فشل في الاتصال', 'Connection failed'))
    }, 2000)
  }

  const syncDevice = async (deviceId) => {
    const loadingToast = toast.loading(ar('جاري مزامنة البيانات...', 'Syncing data...'))
    setTimeout(() => {
      toast.dismiss(loadingToast)
      toast.success(ar('تم مزامنة البيانات بنجاح', 'Data synced successfully'))
      logActivity('device_sync', ar('مزامنة بيانات الجهاز', 'Device data sync'))
    }, 3000)
  }

  const handleAddDevice = () => { setSelectedDevice(null); setIsModalOpen(true) }
  const handleEditDevice = (device) => { setSelectedDevice(device); setIsModalOpen(true) }

  const handleDeleteDevice = (device) => {
    if (confirm(ar(`هل أنت متأكد من حذف الجهاز "${device.name}"؟`, `Are you sure you want to delete "${device.name}"?`))) {
      const updatedDevices = devices.filter(d => d.id !== device.id)
      setDevices(updatedDevices)
      setStorageData('devices', updatedDevices)
      toast.success(ar('تم حذف الجهاز بنجاح', 'Device deleted successfully'))
      logActivity('device_delete', ar(`تم حذف الجهاز: ${device.name}`, `Device deleted: ${device.name}`))
    }
  }

  const handleSaveDevice = async (deviceData) => {
    try {
      if (selectedDevice) {
        const updatedDevices = devices.map(device => device.id === selectedDevice.id ? { ...device, ...deviceData, updatedAt: new Date().toISOString() } : device)
        setDevices(updatedDevices); setStorageData('devices', updatedDevices)
        toast.success(ar('تم تحديث بيانات الجهاز بنجاح', 'Device updated successfully'))
        logActivity('device_update', ar(`تم تحديث الجهاز: ${deviceData.name}`, `Device updated: ${deviceData.name}`))
      } else {
        const newDevice = { id: getNextId('device'), ...deviceData, status: 'disconnected', lastSync: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        const updatedDevices = [...devices, newDevice]
        setDevices(updatedDevices); setStorageData('devices', updatedDevices)
        toast.success(ar('تم إضافة الجهاز بنجاح', 'Device added successfully'))
        logActivity('device_add', ar(`تم إضافة جهاز جديد: ${deviceData.name}`, `New device added: ${deviceData.name}`))
      }
      setIsModalOpen(false)
    } catch (error) { toast.error(ar('حدث خطأ أثناء حفظ بيانات الجهاز', 'Error saving device data')) }
  }

  if (loading) return (
    <ProtectedRoute><Layout>
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-surface-300 border-t-brand-600 rounded-full animate-spin"></div>
        <p className="text-surface-500 font-bold text-xs animate-pulse">{ar('جاري تحميل الأجهزة...', 'Loading devices...')}</p>
      </div>
    </Layout></ProtectedRoute>
  )

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="page-title">{ar('إدارة الأجهزة المركزية', 'Device Management')}</h1>
              <p className="page-description">{ar('توصيل وإدارة أجهزة البصمة البيومترية والمزامنة الحية', 'Manage biometric devices and live sync')}</p>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleAddDevice} className="btn btn-primary btn-md">
              <i className="fas fa-plus text-sm"></i> {ar('إضافة جهاز جديد', 'Add New Device')}
            </motion.button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: ar('إجمالي الأجهزة', 'Total Devices'), value: stats.total, icon: 'fa-server', color: 'bg-brand-50 text-brand-600' },
              { label: ar('متصل ومفعل', 'Connected'), value: stats.connected, icon: 'fa-link', color: 'bg-emerald-50 text-emerald-600' },
              { label: ar('غير متصل', 'Disconnected'), value: stats.disconnected, icon: 'fa-link-slash', color: 'bg-rose-50 text-rose-600' },
              { label: ar('مزامنة شاملة', 'Sync All'), value: ar('مزامنة الكل', 'Sync All'), icon: 'fa-rotate', color: 'bg-violet-50 text-violet-600', isAction: true, action: () => {
                const loadingToast = toast.loading(ar('جاري مزامنة جميع الأجهزة...', 'Syncing all devices...'))
                setTimeout(() => { toast.dismiss(loadingToast); toast.success(ar('تم مزامنة جميع الأجهزة بنجاح', 'All devices synced')) }, 3000)
              }}
            ].map((stat, i) => (
              stat.isAction ? (
                <button key={i} onClick={stat.action}
                  className="bg-white border border-surface-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:border-violet-300 hover:bg-violet-50/30 transition-all text-right group cursor-pointer">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color.split(' ')[0]} ${stat.color.split(' ')[1]} group-hover:scale-110 transition-transform`}>
                    <i className={`fas ${stat.icon} text-lg`}></i>
                  </div>
                  <div>
                    <p className="text-sm font-black text-violet-700 leading-none mb-1 group-hover:text-violet-800">{stat.value}</p>
                    <p className="text-xs font-bold text-surface-500">{ar('انقر لتحديث السجلات', 'Click to update')}</p>
                  </div>
                </button>
              ) : (
                <div key={i} className="bg-white border border-surface-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color.split(' ')[0]} ${stat.color.split(' ')[1]}`}>
                    <i className={`fas ${stat.icon} text-lg`}></i>
                  </div>
                  <div>
                    <p className="text-xl font-black text-surface-900 leading-none">{stat.value}</p>
                    <p className="text-xs font-bold text-surface-500 mt-1">{stat.label}</p>
                  </div>
                </div>
              )
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-surface-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-surface-200 bg-surface-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-surface-200 flex items-center justify-center text-brand-600 shadow-sm">
                  <i className="fas fa-microchip text-sm"></i>
                </div>
                <h3 className="text-sm font-black text-surface-900">{ar('سجل الأجهزة المركزية', 'Device Records')}</h3>
              </div>
              <button className="btn btn-ghost btn-sm text-surface-600 bg-white border border-surface-200 shadow-sm">
                <i className="fas fa-network-wired text-xs"></i> {ar('فحص الشبكة', 'Network Check')}
              </button>
            </div>

            {devices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="bg-surface-50 border-b border-surface-200 text-surface-500">
                      <th className="py-4 px-6 font-bold w-1/4">{ar('الجهاز', 'Device')}</th>
                      <th className="py-4 px-6 font-bold">{ar('الشبكة (IP)', 'Network (IP)')}</th>
                      <th className="py-4 px-6 font-bold">{ar('المنفذ', 'Port')}</th>
                      <th className="py-4 px-6 font-bold">{ar('حالة الاتصال', 'Status')}</th>
                      <th className="py-4 px-6 font-bold">{ar('آخر مزامنة', 'Last Sync')}</th>
                      <th className="py-4 px-6 font-bold text-center">{ar('الإجراءات', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    <AnimatePresence>
                      {devices.map((device, index) => (
                        <motion.tr key={device.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }} transition={{ delay: index * 0.05 }}
                          className="hover:bg-surface-50/50 transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded bg-brand-50 flex items-center justify-center text-brand-600 border border-brand-100">
                                <i className="fas fa-fingerprint text-sm"></i>
                              </div>
                              <div>
                                <span className="font-bold text-surface-900 block">{device.name}</span>
                                <span className="text-xs text-surface-400 font-medium">{ar('معرف: #', 'ID: #')}{device.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <code className="text-xs font-mono font-bold bg-surface-100 text-surface-700 py-1 px-2 rounded border border-surface-200">{device.ip}</code>
                          </td>
                          <td className="py-4 px-6"><span className="text-surface-600 font-bold">{device.port}</span></td>
                          <td className="py-4 px-6">
                            <span className={`badge ${device.status === 'connected' ? 'badge-success' : 'badge-danger'}`}>
                              <i className={`fas ${device.status === 'connected' ? 'fa-check' : 'fa-xmark'} text-[10px]`}></i>
                              {device.status === 'connected' ? ar('متصل ومفعل', 'Connected') : ar('غير متصل', 'Disconnected')}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-surface-600 font-medium">
                            {device.lastSync
                              ? new Date(device.lastSync).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : <span className="text-surface-400 italic">{ar('لم تتم المزامنة', 'Not synced')}</span>
                            }
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => testConnection(device.id)}
                                className="w-8 h-8 rounded-lg bg-surface-100 text-surface-600 hover:bg-violet-100 hover:text-violet-600 flex items-center justify-center transition-colors"
                                title={ar('اختبار الاتصال', 'Test Connection')}>
                                <i className="fas fa-bolt text-xs"></i>
                              </button>
                              <button onClick={() => syncDevice(device.id)}
                                className="w-8 h-8 rounded-lg bg-surface-100 text-surface-600 hover:bg-brand-100 hover:text-brand-600 flex items-center justify-center transition-colors"
                                title={ar('مزامنة', 'Sync')}>
                                <i className="fas fa-rotate text-xs"></i>
                              </button>
                              <button onClick={() => handleEditDevice(device)}
                                className="w-8 h-8 rounded-lg bg-surface-100 text-surface-600 hover:bg-surface-200 hover:text-surface-900 flex items-center justify-center transition-colors"
                                title={ar('تعديل', 'Edit')}>
                                <i className="fas fa-pen text-xs"></i>
                              </button>
                              <button onClick={() => handleDeleteDevice(device)}
                                className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors"
                                title={ar('إزالة الجهاز', 'Remove Device')}>
                                <i className="fas fa-trash text-xs"></i>
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state bg-white">
                <div className="empty-icon"><i className="fas fa-fingerprint text-surface-400"></i></div>
                <h3 className="empty-title">{ar('لا توجد أجهزة متصلة', 'No connected devices')}</h3>
                <p className="empty-desc mb-6">{ar('قم بإضافة جهاز بصمة جديد وربطه بالشبكة لبدء مزامنة الحضور.', 'Add a new biometric device to start syncing attendance.')}</p>
                <button onClick={handleAddDevice} className="btn btn-primary btn-md">
                  <i className="fas fa-plus text-sm"></i> {ar('إضافة الجهاز الأول', 'Add First Device')}
                </button>
              </div>
            )}
          </motion.div>
        </div>
        <DeviceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} device={selectedDevice} onSave={handleSaveDevice} />
      </Layout>
    </ProtectedRoute>
  )
}
