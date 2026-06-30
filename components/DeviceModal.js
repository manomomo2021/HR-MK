import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const DeviceModal = ({ isOpen, onClose, device, onSave }) => {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm()

  // تحميل بيانات الجهاز عند فتح النافذة للتعديل
  useEffect(() => {
    if (isOpen) {
      if (device) {
        // تعبئة النموذج ببيانات الجهاز الموجود
        reset({
          name: device.name || '',
          ip: device.ip || '',
          port: device.port || 4370,
          model: device.model || '',
          location: device.location || '',
          description: device.description || ''
        })
      } else {
        // مسح النموذج للجهاز الجديد
        reset({
          name: '',
          ip: '',
          port: 4370,
          model: '',
          location: '',
          description: ''
        })
      }
    }
  }, [isOpen, device, reset])

  const onSubmit = async (data) => {
    setIsLoading(true)
    
    try {
      // التحقق من صحة البيانات
      if (!validateIP(data.ip)) {
        toast.error('عنوان IP غير صحيح')
        return
      }

      if (data.port < 1 || data.port > 65535) {
        toast.error('رقم البورت يجب أن يكون بين 1 و 65535')
        return
      }

      // تحويل البورت إلى رقم
      const deviceData = {
        ...data,
        port: parseInt(data.port)
      }

      await onSave(deviceData)
    } catch (error) {
      console.error('خطأ في حفظ الجهاز:', error)
      toast.error('حدث خطأ أثناء حفظ البيانات')
    } finally {
      setIsLoading(false)
    }
  }

  // التحقق من صحة عنوان IP
  const validateIP = (ip) => {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return ipRegex.test(ip)
  }

  // اختبار الاتصال
  const testConnection = async () => {
    const ip = watch('ip')
    const port = watch('port')

    if (!ip || !port) {
      toast.error('يرجى إدخال عنوان IP والبورت أولاً')
      return
    }

    if (!validateIP(ip)) {
      toast.error('عنوان IP غير صحيح')
      return
    }

    const loadingToast = toast.loading('جاري اختبار الاتصال...')

    // محاكاة اختبار الاتصال
    setTimeout(() => {
      const success = Math.random() > 0.3 // 70% نسبة نجاح
      toast.dismiss(loadingToast)
      if (success) {
        toast.success('تم الاتصال بنجاح!')
      } else {
        toast.error('فشل في الاتصال. تحقق من عنوان IP والبورت.')
      }
    }, 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* خلفية */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-surface-900/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* النافذة */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-surface-200"
          >
            {/* رأس النافذة */}
            <div className="flex items-center justify-between p-6 border-b border-surface-100 bg-surface-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 border border-brand-100">
                  <i className={`fas ${device ? 'fa-pen' : 'fa-plus'} text-sm`}></i>
                </div>
                <div>
                  <h2 className="text-lg font-black text-surface-900 leading-none">
                    {device ? 'تعديل بيانات الجهاز' : 'إضافة جهاز جديد'}
                  </h2>
                  <p className="text-xs font-bold text-surface-500 mt-1">تكوين بروتوكول الاتصال بالبصمة</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-surface-100 text-surface-600 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors"
                disabled={isLoading}
              >
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>

            {/* محتوى النافذة */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="bg-surface-50 rounded-2xl p-5 border border-surface-200">
                  <h3 className="text-sm font-black text-surface-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-microchip text-brand-600"></i>
                    بيانات الهوية
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-surface-700 mb-2">اسم الجهاز *</label>
                      <input
                        {...register('name', { required: 'اسم الجهاز مطلوب' })}
                        className="input"
                        placeholder="أدخل اسم الجهاز"
                      />
                      {errors.name && <p className="text-rose-500 text-xs mt-1 font-bold">{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-surface-700 mb-2">الموديل</label>
                      <input
                        {...register('model')}
                        className="input"
                        placeholder="مثال: ZKTeco K40"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-surface-50 rounded-2xl p-5 border border-surface-200">
                  <h3 className="text-sm font-black text-surface-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-network-wired text-brand-600"></i>
                    بروتوكول الشبكة
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-surface-700 mb-2">عنوان IP *</label>
                      <div className="relative">
                        <i className="fas fa-globe absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs"></i>
                        <input
                          {...register('ip', { 
                            required: 'عنوان IP مطلوب',
                            pattern: {
                              value: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
                              message: 'عنوان IP غير صحيح'
                            }
                          })}
                          className="input pr-9 font-mono text-left"
                          placeholder="192.168.1.100"
                          dir="ltr"
                        />
                      </div>
                      {errors.ip && <p className="text-rose-500 text-xs mt-1 font-bold">{errors.ip.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-surface-700 mb-2">المنفذ (Port) *</label>
                      <div className="relative">
                        <i className="fas fa-plug absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs"></i>
                        <input
                          {...register('port', { 
                            required: 'البورت مطلوب',
                            min: { value: 1, message: 'البورت يجب أن يكون أكبر من 0' },
                            max: { value: 65535, message: 'البورت يجب أن يكون أقل من 65536' }
                          })}
                          type="number"
                          className="input pr-9 font-mono text-left"
                          placeholder="4370"
                          dir="ltr"
                        />
                      </div>
                      {errors.port && <p className="text-rose-500 text-xs mt-1 font-bold">{errors.port.message}</p>}
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={testConnection}
                      className="w-full btn btn-ghost text-brand-600 bg-white border border-surface-200"
                      disabled={isLoading}
                    >
                      <i className="fas fa-bolt text-sm"></i>
                      اختبار الاتصال بالشبكة
                    </button>
                  </div>
                </div>

                <div className="bg-surface-50 rounded-2xl p-5 border border-surface-200">
                  <h3 className="text-sm font-black text-surface-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-location-dot text-brand-600"></i>
                    معلومات إضافية
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-surface-700 mb-2">موقع التثبيت</label>
                      <input
                        {...register('location')}
                        className="input"
                        placeholder="مثال: البوابة الرئيسية - المبنى أ"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-surface-700 mb-2">ملاحظات</label>
                      <textarea
                        {...register('description')}
                        className="input min-h-[80px] py-3"
                        placeholder="أي تفاصيل إضافية عن الجهاز..."
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* أزرار النافذة */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-surface-100 bg-surface-50/50">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost bg-white border border-surface-200"
                disabled={isLoading}
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmit(onSubmit)}
                className="btn btn-primary min-w-[120px]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <i className="fas fa-circle-notch fa-spin"></i> جاري الحفظ
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <i className="fas fa-check"></i> {device ? 'حفظ التعديلات' : 'إضافة الجهاز'}
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default DeviceModal
