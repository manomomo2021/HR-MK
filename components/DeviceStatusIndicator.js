import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const DeviceStatusIndicator = ({ device, onStatusChange }) => {
  const [status, setStatus] = useState('unknown') // unknown, connecting, connected, disconnected, error
  const [lastCheck, setLastCheck] = useState(null)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    // فحص دوري لحالة الجهاز كل 30 ثانية
    const interval = setInterval(() => {
      checkDeviceStatus()
    }, 30000)

    // فحص أولي
    checkDeviceStatus()

    return () => clearInterval(interval)
  }, [device])

  const checkDeviceStatus = async () => {
    if (!device || isChecking) return

    setIsChecking(true)
    
    try {
      // محاولة ping بسيط للجهاز
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const testUrl = `http://${device.ip}:${device.port || 80}`
      
      await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors'
      })
      
      clearTimeout(timeoutId)
      setStatus('connected')
      setLastCheck(new Date())
      
      if (onStatusChange) {
        onStatusChange(device.id, 'connected')
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus('disconnected')
      } else {
        setStatus('error')
      }
      setLastCheck(new Date())
      
      if (onStatusChange) {
        onStatusChange(device.id, 'disconnected')
      }
    } finally {
      setIsChecking(false)
    }
  }

  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'bg-green-500',
          text: 'متصل',
          icon: 'fa-check-circle',
          textColor: 'text-green-700'
        }
      case 'disconnected':
        return {
          color: 'bg-red-500',
          text: 'غير متصل',
          icon: 'fa-times-circle',
          textColor: 'text-red-700'
        }
      case 'connecting':
        return {
          color: 'bg-yellow-500',
          text: 'جاري الاتصال',
          icon: 'fa-spinner fa-spin',
          textColor: 'text-yellow-700'
        }
      case 'error':
        return {
          color: 'bg-orange-500',
          text: 'خطأ',
          icon: 'fa-exclamation-triangle',
          textColor: 'text-orange-700'
        }
      default:
        return {
          color: 'bg-gray-500',
          text: 'غير معروف',
          icon: 'fa-question-circle',
          textColor: 'text-gray-700'
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="flex items-center gap-2">
      {/* مؤشر الحالة */}
      <motion.div
        className={`w-3 h-3 rounded-full ${statusInfo.color}`}
        animate={isChecking ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 1, repeat: isChecking ? Infinity : 0 }}
      />
      
      {/* نص الحالة */}
      <span className={`text-sm font-medium ${statusInfo.textColor}`}>
        <i className={`fas ${statusInfo.icon} mr-1`}></i>
        {statusInfo.text}
      </span>
      
      {/* وقت آخر فحص */}
      {lastCheck && (
        <span className="text-xs text-gray-500">
          ({lastCheck.toLocaleTimeString('ar-SA')})
        </span>
      )}
      
      {/* زر الفحص اليدوي */}
      <button
        onClick={checkDeviceStatus}
        disabled={isChecking}
        className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
        title="فحص الحالة"
      >
        <i className={`fas fa-sync-alt ${isChecking ? 'fa-spin' : ''}`}></i>
      </button>
    </div>
  )
}

export default DeviceStatusIndicator
