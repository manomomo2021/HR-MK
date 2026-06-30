import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { BiometricDevice } from '../utils/biometric'

const BiometricConnectionTest = ({ device, onConnectionResult }) => {
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState(null)
  const [testLogs, setTestLogs] = useState([])
  const [advancedMode, setAdvancedMode] = useState(false)

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('ar-SA')
    setTestLogs(prev => [...prev, { timestamp, message, type }])
  }

  const clearLogs = () => {
    setTestLogs([])
    setConnectionResult(null)
  }

  const testConnection = async () => {
    setIsTestingConnection(true)
    setConnectionResult(null)
    clearLogs()

    const loadingToast = toast.loading('جاري اختبار الاتصال...')

    try {
      addLog(`بدء اختبار الاتصال مع ${device.name}`, 'info')
      addLog(`العنوان: ${device.ip}:${device.port}`, 'info')
      addLog(`البروتوكول: ${device.protocol || 'tcp'}`, 'info')

      const biometricDevice = new BiometricDevice(device)

      // اختبار الوصول للشبكة أولاً
      addLog('اختبار الوصول للشبكة...', 'info')
      await testNetworkAccess(device)
      addLog('✅ الجهاز قابل للوصول عبر الشبكة', 'success')

      // محاولة الاتصال
      addLog('محاولة الاتصال بالجهاز...', 'info')
      await biometricDevice.connect()
      addLog('✅ تم الاتصال بنجاح', 'success')

      // جلب معلومات الجهاز
      addLog('جلب معلومات الجهاز...', 'info')
      const deviceInfo = await biometricDevice.getDeviceInfo()
      addLog(`✅ معلومات الجهاز: ${deviceInfo.model || 'غير معروف'} - الإصدار: ${deviceInfo.firmware}`, 'success')
      addLog(`عدد المستخدمين: ${deviceInfo.userCount} - عدد السجلات: ${deviceInfo.logCount}`, 'info')

      // اختبار جلب السجلات (عينة صغيرة)
      if (advancedMode) {
        addLog('اختبار جلب السجلات...', 'info')
        const logs = await biometricDevice.getAttendanceLogs()
        addLog(`✅ تم جلب ${logs.length} سجل بنجاح`, 'success')
      }

      // قطع الاتصال
      await biometricDevice.disconnect()
      addLog('✅ تم قطع الاتصال بنجاح', 'success')

      const result = {
        success: true,
        info: deviceInfo,
        message: 'تم الاتصال بنجاح',
        logs: testLogs
      }

      setConnectionResult(result)
      toast.dismiss(loadingToast)
      toast.success('تم اختبار الاتصال بنجاح')

      if (onConnectionResult) {
        onConnectionResult(result)
      }

    } catch (error) {
      addLog(`❌ خطأ: ${error.message}`, 'error')
      
      const result = {
        success: false,
        error: error.message,
        message: 'فشل في الاتصال',
        logs: testLogs
      }

      setConnectionResult(result)
      toast.dismiss(loadingToast)
      toast.error(`فشل في الاتصال: ${error.message}`)

      if (onConnectionResult) {
        onConnectionResult(result)
      }
    } finally {
      setIsTestingConnection(false)
    }
  }

  const testNetworkAccess = async (device) => {
    // اختبار الوصول للشبكة
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      // محاولة ping بسيط
      const testUrl = `http://${device.ip}:${device.port || 80}`
      await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors'
      })
      clearTimeout(timeoutId)
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('انتهت مهلة الاتصال - تحقق من عنوان IP والمنفذ')
      }
      // قد يكون الجهاز متاحاً حتى لو فشل HTTP
      addLog('⚠️ تحذير: لا يمكن التحقق عبر HTTP، سيتم المحاولة مع البروتوكول المحدد', 'warning')
    }
  }

  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return 'fas fa-check-circle text-green-500'
      case 'error': return 'fas fa-times-circle text-red-500'
      case 'warning': return 'fas fa-exclamation-triangle text-yellow-500'
      default: return 'fas fa-info-circle text-blue-500'
    }
  }

  return (
    <div className="space-y-4">
      {/* أزرار التحكم */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={testConnection}
            disabled={isTestingConnection}
            className="neu-btn-primary"
          >
            {isTestingConnection ? (
              <div className="flex items-center gap-2">
                <div className="loading-spinner w-4 h-4"></div>
                جاري الاختبار...
              </div>
            ) : (
              <>
                <i className="fas fa-plug"></i>
                اختبار الاتصال
              </>
            )}
          </button>

          <button
            onClick={clearLogs}
            disabled={isTestingConnection}
            className="neu-btn text-sm"
          >
            <i className="fas fa-trash"></i>
            مسح السجلات
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={advancedMode}
            onChange={(e) => setAdvancedMode(e.target.checked)}
            className="rounded"
          />
          وضع متقدم (اختبار البيانات)
        </label>
      </div>

      {/* نتيجة الاختبار */}
      {connectionResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`neu-card p-4 ${
            connectionResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <i className={`fas ${
              connectionResult.success 
                ? 'fa-check-circle text-green-500' 
                : 'fa-times-circle text-red-500'
            }`}></i>
            <div>
              <h4 className="font-semibold">
                {connectionResult.success ? 'نجح الاتصال' : 'فشل الاتصال'}
              </h4>
              <p className="text-sm text-gray-600">{connectionResult.message}</p>
            </div>
          </div>

          {connectionResult.success && connectionResult.info && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">الموديل:</span> {connectionResult.info.model || 'غير معروف'}
              </div>
              <div>
                <span className="font-medium">الإصدار:</span> {connectionResult.info.firmware}
              </div>
              <div>
                <span className="font-medium">المستخدمين:</span> {connectionResult.info.userCount}
              </div>
              <div>
                <span className="font-medium">السجلات:</span> {connectionResult.info.logCount}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* سجلات الاختبار */}
      {testLogs.length > 0 && (
        <div className="neu-card">
          <div className="p-4 border-b border-gray-200">
            <h4 className="font-semibold text-gray-800">سجلات الاختبار</h4>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            <div className="space-y-2">
              {testLogs.map((log, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 text-sm"
                >
                  <span className="text-gray-500 font-mono text-xs mt-0.5">
                    {log.timestamp}
                  </span>
                  <i className={getLogIcon(log.type)}></i>
                  <span className={`flex-1 ${
                    log.type === 'error' ? 'text-red-700' :
                    log.type === 'success' ? 'text-green-700' :
                    log.type === 'warning' ? 'text-yellow-700' :
                    'text-gray-700'
                  }`}>
                    {log.message}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* نصائح الاستكشاف */}
      <div className="neu-card p-4 bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">
          <i className="fas fa-lightbulb mr-2"></i>
          نصائح لاستكشاف الأخطاء
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• تأكد من أن الجهاز متصل بنفس الشبكة</li>
          <li>• تحقق من عنوان IP والمنفذ</li>
          <li>• تأكد من أن الجدار الناري لا يحجب الاتصال</li>
          <li>• جرب بروتوكولات مختلفة (TCP, HTTP, WebSocket)</li>
          <li>• تحقق من اسم المستخدم وكلمة المرور</li>
        </ul>
      </div>
    </div>
  )
}

export default BiometricConnectionTest
