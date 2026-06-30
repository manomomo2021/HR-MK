import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import BiometricConnectionTest from './BiometricConnectionTest'
import DeviceStatusIndicator from './DeviceStatusIndicator'
import AttendanceDataViewer from './AttendanceDataViewer'
import BiometricUsersViewer from './BiometricUsersViewer'
import {
  BiometricDevice,
  fetchAttendanceWithRetry,
  getLogTypeText,
  DEFAULT_DEVICE_CONFIG
} from '../utils/biometric'

const BiometricManager = ({ isOpen, onClose, onDataImported }) => {
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState({})
  const [importProgress, setImportProgress] = useState(null)
  const [lastSyncTimes, setLastSyncTimes] = useState({})
  const [lastImportedData, setLastImportedData] = useState([])
  const [isDataViewerOpen, setIsDataViewerOpen] = useState(false)
  const [isUsersViewerOpen, setIsUsersViewerOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadDevices()
      loadLastSyncTimes()
    }
  }, [isOpen])

  const loadDevices = () => {
    // تحميل الأجهزة المحفوظة من localStorage
    try {
      const savedDevices = localStorage.getItem('hr_biometric_devices')
      if (savedDevices) {
        const parsedDevices = JSON.parse(savedDevices)
        setDevices(parsedDevices)
        if (parsedDevices.length > 0) {
          setSelectedDevice(parsedDevices[0])
        }
      } else {
        // إضافة جهاز افتراضي
        const defaultDeviceConfig = {
          id: 1,
          name: 'جهاز البصمة الرئيسي',
          ...DEFAULT_DEVICE_CONFIG
        }
        setDevices([defaultDeviceConfig])
        setSelectedDevice(defaultDeviceConfig)
      }
    } catch (error) {
      console.error('خطأ في تحميل الأجهزة:', error)
    }
  }

  const loadLastSyncTimes = () => {
    try {
      const savedTimes = localStorage.getItem('hr_biometric_sync_times')
      if (savedTimes) {
        setLastSyncTimes(JSON.parse(savedTimes))
      }
    } catch (error) {
      console.error('خطأ في تحميل أوقات المزامنة:', error)
    }
  }

  const saveLastSyncTime = (deviceId) => {
    const newTimes = {
      ...lastSyncTimes,
      [deviceId]: new Date().toISOString()
    }
    setLastSyncTimes(newTimes)
    localStorage.setItem('hr_biometric_sync_times', JSON.stringify(newTimes))
  }

  const testConnection = async (device) => {
    setIsConnecting(true)
    const loadingToast = toast.loading(`جاري اختبار الاتصال بـ ${device.name}...`)

    try {
      const biometricDevice = new BiometricDevice(device)
      const result = await biometricDevice.testConnection()
      
      setConnectionStatus(prev => ({
        ...prev,
        [device.id]: result
      }))

      toast.dismiss(loadingToast)
      
      if (result.success) {
        toast.success(`تم الاتصال بـ ${device.name} بنجاح`)
      } else {
        toast.error(`فشل الاتصال بـ ${device.name}: ${result.message}`)
      }

    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(`خطأ في اختبار الاتصال: ${error.message}`)
      setConnectionStatus(prev => ({
        ...prev,
        [device.id]: { success: false, error: error.message }
      }))
    } finally {
      setIsConnecting(false)
    }
  }

  const importAttendanceData = async (device, fromDate = null) => {
    setIsImporting(true)
    setImportProgress({ current: 0, total: 100, message: 'بدء الاستيراد...' })
    
    const loadingToast = toast.loading(`جاري استيراد بيانات الحضور من ${device.name}...`)

    try {
      const biometricDevice = new BiometricDevice(device)
      
      setImportProgress({ current: 20, total: 100, message: 'الاتصال بالجهاز...' })
      
      // جلب السجلات مع إعادة المحاولة
      const logs = await fetchAttendanceWithRetry(biometricDevice, fromDate)
      
      setImportProgress({ current: 60, total: 100, message: `معالجة ${logs.length} سجل...` })
      
      // تحويل السجلات إلى تنسيق النظام
      const attendanceRecords = logs.map(log => ({
        employeeId: log.employeeId,
        employeeCode: log.employeeCode,
        employeeName: log.employeeName,
        date: log.date,
        time: log.time,
        type: log.logType,
        deviceId: log.deviceId,
        deviceName: log.deviceName,
        timestamp: log.timestamp,
        verifyMode: log.verifyMode,
        workCode: log.workCode,
        status: 'imported',
        createdAt: new Date().toISOString()
      }))

      // حفظ البيانات المستوردة للعرض
      setLastImportedData(attendanceRecords)

      setImportProgress({ current: 80, total: 100, message: 'حفظ البيانات...' })
      
      // حفظ السجلات في localStorage (في التطبيق الحقيقي ستحفظ في قاعدة البيانات)
      const existingRecords = JSON.parse(localStorage.getItem('hr_attendance_records') || '[]')
      const allRecords = [...existingRecords, ...attendanceRecords]
      
      // إزالة التكرارات
      const uniqueRecords = allRecords.filter((record, index, self) => 
        index === self.findIndex(r => 
          r.employeeId === record.employeeId && 
          r.timestamp === record.timestamp
        )
      )
      
      localStorage.setItem('hr_attendance_records', JSON.stringify(uniqueRecords))
      
      setImportProgress({ current: 100, total: 100, message: 'تم الاستيراد بنجاح!' })
      
      // حفظ وقت آخر مزامنة
      saveLastSyncTime(device.id)
      
      await biometricDevice.disconnect()
      
      toast.dismiss(loadingToast)
      toast.success(`تم استيراد ${attendanceRecords.length} سجل حضور بنجاح`)
      
      // إشعار المكون الأب بالبيانات الجديدة
      if (onDataImported) {
        onDataImported(attendanceRecords)
      }

    } catch (error) {
      console.error('خطأ في استيراد البيانات:', error)
      toast.dismiss(loadingToast)
      toast.error(`فشل في استيراد البيانات: ${error.message}`)
    } finally {
      setIsImporting(false)
      setImportProgress(null)
    }
  }

  const addNewDevice = () => {
    const newDevice = {
      id: Date.now(),
      name: `جهاز بصمة ${devices.length + 1}`,
      ip: '192.168.0.201',
      port: 4370,
      deviceId: `device_${devices.length + 1}`,
      timeout: 5000
    }
    
    const updatedDevices = [...devices, newDevice]
    setDevices(updatedDevices)
    localStorage.setItem('hr_biometric_devices', JSON.stringify(updatedDevices))
    setSelectedDevice(newDevice)
  }

  const updateDevice = (deviceId, updates) => {
    const updatedDevices = devices.map(device => 
      device.id === deviceId ? { ...device, ...updates } : device
    )
    setDevices(updatedDevices)
    localStorage.setItem('hr_biometric_devices', JSON.stringify(updatedDevices))
    
    if (selectedDevice?.id === deviceId) {
      setSelectedDevice({ ...selectedDevice, ...updates })
    }
  }

  const deleteDevice = (deviceId) => {
    if (confirm('هل أنت متأكد من حذف هذا الجهاز؟')) {
      const updatedDevices = devices.filter(device => device.id !== deviceId)
      setDevices(updatedDevices)
      localStorage.setItem('hr_biometric_devices', JSON.stringify(updatedDevices))
      
      if (selectedDevice?.id === deviceId) {
        setSelectedDevice(updatedDevices[0] || null)
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* خلفية */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />

          {/* النافذة */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-neu max-w-6xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* رأس النافذة */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-800">إدارة أجهزة البصمة</h2>
                <p className="text-sm text-gray-500 mt-1">
                  الاتصال بأجهزة البصمة واستيراد بيانات الحضور والانصراف
                </p>
              </div>
              <button
                onClick={onClose}
                className="neu-btn p-2"
                disabled={isConnecting || isImporting}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* محتوى النافذة */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* قائمة الأجهزة */}
                <div className="lg:col-span-1">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">الأجهزة المتاحة</h3>
                    <button
                      onClick={addNewDevice}
                      className="neu-btn-primary text-sm"
                      disabled={isConnecting || isImporting}
                    >
                      <i className="fas fa-plus"></i>
                      إضافة جهاز
                    </button>
                  </div>

                  <div className="space-y-3">
                    {devices.map(device => (
                      <motion.div
                        key={device.id}
                        className={`neu-card p-4 cursor-pointer transition-all ${
                          selectedDevice?.id === device.id ? 'ring-2 ring-primary-500' : ''
                        }`}
                        onClick={() => setSelectedDevice(device)}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800">{device.name}</h4>
                            <p className="text-sm text-gray-500">{device.ip}:{device.port}</p>
                            <p className="text-xs text-blue-600 mt-1">
                              {device.protocol || 'tcp'} • {device.deviceId}
                            </p>
                            {lastSyncTimes[device.id] && (
                              <p className="text-xs text-green-600 mt-1">
                                آخر مزامنة: {new Date(lastSyncTimes[device.id]).toLocaleString('en-GB')}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <DeviceStatusIndicator
                              device={device}
                              onStatusChange={(deviceId, status) => {
                                setConnectionStatus(prev => ({
                                  ...prev,
                                  [deviceId]: { success: status === 'connected' }
                                }))
                              }}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteDevice(device.id)
                              }}
                              className="text-red-500 hover:text-red-700 p-1"
                              disabled={isConnecting || isImporting}
                            >
                              <i className="fas fa-trash text-sm"></i>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* تفاصيل الجهاز المحدد */}
                <div className="lg:col-span-2">
                  {selectedDevice ? (
                    <div className="space-y-6">
                      {/* إعدادات الجهاز */}
                      <div className="neu-card p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">إعدادات الجهاز</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              اسم الجهاز
                            </label>
                            <input
                              type="text"
                              value={selectedDevice.name}
                              onChange={(e) => updateDevice(selectedDevice.id, { name: e.target.value })}
                              className="neu-input"
                              disabled={isConnecting || isImporting}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              البروتوكول
                            </label>
                            <select
                              value={selectedDevice.protocol || 'tcp'}
                              onChange={(e) => updateDevice(selectedDevice.id, { protocol: e.target.value })}
                              className="neu-select"
                              disabled={isConnecting || isImporting}
                            >
                              <option value="tcp">TCP (افتراضي)</option>
                              <option value="http">HTTP API</option>
                              <option value="websocket">WebSocket</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              عنوان IP
                            </label>
                            <input
                              type="text"
                              value={selectedDevice.ip}
                              onChange={(e) => updateDevice(selectedDevice.id, { ip: e.target.value })}
                              className="neu-input"
                              placeholder="192.168.0.201"
                              disabled={isConnecting || isImporting}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              المنفذ
                            </label>
                            <input
                              type="number"
                              value={selectedDevice.port}
                              onChange={(e) => updateDevice(selectedDevice.id, { port: parseInt(e.target.value) })}
                              className="neu-input"
                              placeholder="4370"
                              disabled={isConnecting || isImporting}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              معرف الجهاز
                            </label>
                            <input
                              type="text"
                              value={selectedDevice.deviceId}
                              onChange={(e) => updateDevice(selectedDevice.id, { deviceId: e.target.value })}
                              className="neu-input"
                              placeholder="device_1"
                              disabled={isConnecting || isImporting}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              اسم المستخدم
                            </label>
                            <input
                              type="text"
                              value={selectedDevice.username || 'admin'}
                              onChange={(e) => updateDevice(selectedDevice.id, { username: e.target.value })}
                              className="neu-input"
                              placeholder="admin"
                              disabled={isConnecting || isImporting}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              كلمة المرور
                            </label>
                            <input
                              type="password"
                              value={selectedDevice.password || '123456'}
                              onChange={(e) => updateDevice(selectedDevice.id, { password: e.target.value })}
                              className="neu-input"
                              placeholder="123456"
                              disabled={isConnecting || isImporting}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              مهلة الاتصال (ثانية)
                            </label>
                            <input
                              type="number"
                              value={(selectedDevice.timeout || 5000) / 1000}
                              onChange={(e) => updateDevice(selectedDevice.id, { timeout: parseInt(e.target.value) * 1000 })}
                              className="neu-input"
                              placeholder="5"
                              min="1"
                              max="30"
                              disabled={isConnecting || isImporting}
                            />
                          </div>
                        </div>
                      </div>

                      {/* حالة الاتصال */}
                      {connectionStatus[selectedDevice.id] && (
                        <div className={`neu-card p-4 ${
                          connectionStatus[selectedDevice.id].success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center gap-3">
                            <i className={`fas ${
                              connectionStatus[selectedDevice.id].success ? 'fa-check-circle text-green-500' : 'fa-times-circle text-red-500'
                            }`}></i>
                            <div>
                              <h4 className="font-semibold">
                                {connectionStatus[selectedDevice.id].success ? 'متصل' : 'غير متصل'}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {connectionStatus[selectedDevice.id].message}
                              </p>
                              {connectionStatus[selectedDevice.id].info && (
                                <div className="text-xs text-gray-500 mt-1">
                                  الإصدار: {connectionStatus[selectedDevice.id].info.firmware} | 
                                  المستخدمين: {connectionStatus[selectedDevice.id].info.userCount} | 
                                  السجلات: {connectionStatus[selectedDevice.id].info.logCount}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* شريط التقدم */}
                      {importProgress && (
                        <div className="neu-card p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              {importProgress.message}
                            </span>
                            <span className="text-sm text-gray-500">
                              {importProgress.current}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${importProgress.current}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* اختبار الاتصال */}
                      <div className="neu-card p-6">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">اختبار الاتصال</h4>
                        <BiometricConnectionTest
                          device={selectedDevice}
                          onConnectionResult={(result) => {
                            setConnectionStatus(prev => ({
                              ...prev,
                              [selectedDevice.id]: result
                            }))
                          }}
                        />
                      </div>

                      {/* أزرار الإجراءات */}
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => importAttendanceData(selectedDevice)}
                            disabled={isConnecting || isImporting}
                            className="neu-btn-success"
                          >
                            {isImporting ? (
                              <div className="flex items-center gap-2">
                                <div className="loading-spinner w-4 h-4"></div>
                                جاري الاستيراد...
                              </div>
                            ) : (
                              <>
                                <i className="fas fa-download"></i>
                                استيراد البيانات
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              const fromDate = prompt('أدخل تاريخ البداية (YYYY-MM-DD) أو اتركه فارغاً لجلب جميع البيانات:')
                              if (fromDate !== null) {
                                importAttendanceData(selectedDevice, fromDate || null)
                              }
                            }}
                            disabled={isConnecting || isImporting}
                            className="neu-btn"
                          >
                            <i className="fas fa-calendar-alt"></i>
                            استيراد من تاريخ محدد
                          </button>

                          <button
                            onClick={() => setIsUsersViewerOpen(true)}
                            className="neu-btn"
                            disabled={isConnecting || isImporting}
                          >
                            <i className="fas fa-users"></i>
                            عرض مستخدمي الجهاز
                          </button>

                          {lastImportedData.length > 0 && (
                            <button
                              onClick={() => setIsDataViewerOpen(true)}
                              className="neu-btn-primary"
                            >
                              <i className="fas fa-eye"></i>
                              عرض البيانات المستوردة ({lastImportedData.length})
                            </button>
                          )}
                        </div>

                        {/* معلومات آخر استيراد */}
                        {lastImportedData.length > 0 && (
                          <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                            <div className="flex items-center gap-3">
                              <i className="fas fa-check-circle text-green-500"></i>
                              <div>
                                <h5 className="font-semibold text-green-800">آخر استيراد ناجح</h5>
                                <p className="text-sm text-green-700">
                                  تم استيراد {lastImportedData.length} سجل •
                                  {new Set(lastImportedData.map(log => log.employeeId)).size} موظف •
                                  {new Set(lastImportedData.map(log => log.date)).size} يوم
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                  من {lastImportedData[lastImportedData.length - 1]?.date} إلى {lastImportedData[0]?.date}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="neu-card p-8 text-center">
                      <i className="fas fa-fingerprint text-6xl text-gray-300 mb-4"></i>
                      <h3 className="text-lg font-medium text-gray-500 mb-2">لا يوجد جهاز محدد</h3>
                      <p className="text-gray-400">اختر جهازاً من القائمة أو أضف جهازاً جديداً</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* أزرار النافذة */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="neu-btn"
                disabled={isConnecting || isImporting}
              >
                <i className="fas fa-times"></i>
                إغلاق
              </button>
            </div>
          </motion.div>

          {/* نافذة عرض البيانات المستوردة */}
          <AttendanceDataViewer
            isOpen={isDataViewerOpen}
            onClose={() => setIsDataViewerOpen(false)}
            attendanceData={lastImportedData}
          />

          {/* نافذة عرض مستخدمي الجهاز */}
          <BiometricUsersViewer
            isOpen={isUsersViewerOpen}
            onClose={() => setIsUsersViewerOpen(false)}
            device={selectedDevice}
          />
        </div>
      )}
    </AnimatePresence>
  )
}

export default BiometricManager
