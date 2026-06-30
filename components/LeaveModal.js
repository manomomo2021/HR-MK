import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const LEAVE_TYPES = [
  { value: 'annual', label: 'إجازة سنوية', icon: '🏖️', color: 'text-cyan-600' },
  { value: 'casual', label: 'إجازة عارضة', icon: '⚡', color: 'text-amber-600' },
  { value: 'sick', label: 'إجازة مرضية', icon: '🏥', color: 'text-rose-600' },
  { value: 'emergency', label: 'إجازة طارئة', icon: '🚨', color: 'text-orange-600' },
]

// ─── Field wrapper ──────────────────────────────────────────────────────────
const Field = ({ label, error, children }) => (
  <div>
    <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-1.5">{label}</label>
    {children}
    {error && <p className="text-rose-500 text-xs mt-1 flex items-center gap-1"><i className="fas fa-triangle-exclamation"></i>{error}</p>}
  </div>
)

const inputCls = "w-full bg-white border border-gray-200 text-gray-900 px-4 py-2.5 rounded-xl focus:border-teal-500 outline-none transition-colors placeholder-gray-400 shadow-sm"

// ═══════════════════════════════════════════════════════════════════════════
const LeaveModal = ({ isOpen, onClose, leave, employees = [], onSave }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [calculatedDays, setCalcDays] = useState(0)

  const {
    register, handleSubmit, formState: { errors },
    reset, watch, setValue
  } = useForm()

  const selectedType = watch('type')

  const startDate = watch('startDate')
  const endDate = watch('endDate')

  // auto-calculate days
  useEffect(() => {
    if (startDate && endDate) {
      const s = new Date(startDate), e = new Date(endDate)
      if (e >= s) {
        const days = Math.ceil(Math.abs(e - s) / 86400000) + 1
        setCalcDays(days); setValue('days', days)
      } else { setCalcDays(0); setValue('days', 0) }
    }
  }, [startDate, endDate, setValue])

  // load existing leave on edit
  useEffect(() => {
    if (isOpen) {
      if (leave) {
        reset({
          employeeId: leave.employeeId || leave.employee_id || '',
          type: leave.leave_type || leave.type || '',
          startDate: leave.startDate || leave.start_date || '',
          endDate: leave.endDate || '',
          days: leave.days || 0,
          reason: leave.reason || '',
        })
        setCalcDays(leave.days || 0)
      } else {
        reset({ employeeId: '', type: '', startDate: '', endDate: '', days: 0, reason: '' })
        setCalcDays(0)
      }
    }
  }, [isOpen, leave, reset])

  const onSubmit = async (data) => {
    // validate employee
    const emp = employees.find(e => String(e.id) === String(data.employeeId))
    if (!emp) { toast.error('اختار موظف صحيح الأول'); return }

    // validate dates
    if (new Date(data.endDate) < new Date(data.startDate)) {
      toast.error('تاريخ النهاية قبل البداية!'); return
    }
    const days = calculatedDays || parseInt(data.days) || 0
    if (days <= 0) { toast.error('لازم تاريخ البداية والنهاية صح'); return }

    setIsLoading(true)
    try {
      await onSave({
        employeeId: data.employeeId,
        employeeName: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        days,
        reason: data.reason,
      })
    } catch (err) {
      console.error(err)
      toast.error('حدث خطأ أثناء حفظ الطلب')
    } finally {
      setIsLoading(false)
    }
  }

  const isEdit = !!leave

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* backdrop */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-md" onClick={onClose} />

          {/* modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            className="relative bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden"
          >
            {/* glow orb */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-teal-50 rounded-full blur-3xl pointer-events-none" />

            {/* header */}
            <div className="relative flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shadow-sm border border-teal-100">
                  <i className="fas fa-file-signature text-teal-600 text-sm"></i>
                </div>
                <div>
                  <h2 className="text-gray-900 font-black text-lg">
                    {isEdit ? 'تعديل طلب الإجازة' : 'طلب إجازة جديد'}
                  </h2>
                  <p className="text-gray-500 text-xs">كل الحقول المرمزة بـ * مطلوبة</p>
                </div>
              </div>
              <button onClick={onClose} disabled={isLoading}
                className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-all cursor-pointer border border-gray-200">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            {/* body */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh] custom-scrollbar">

                {/* employee */}
                <Field label="الموظف *" error={errors.employeeId?.message}>
                  <select {...register('employeeId', { required: 'اختار الموظف الأول' })} className={inputCls + ' appearance-none'}>
                    <option value="">— اختر الموظف —</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim()}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* leave type — card picker */}
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-2">نوع الإجازة *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LEAVE_TYPES.map(t => (
                      <label key={t.value}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all
                          ${selectedType === t.value
                            ? 'bg-teal-50 border-teal-200 shadow-sm'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" value={t.value} {...register('type', { required: 'اختار نوع الإجازة' })}
                          className="hidden" />
                        <span className="text-xl">{t.icon}</span>
                        <span className={`font-bold text-sm ${selectedType === t.value ? 'text-teal-700' : 'text-gray-600'}`}>{t.label}</span>
                        {selectedType === t.value && <i className="fas fa-check-circle text-teal-600 text-xs mr-auto"></i>}
                      </label>
                    ))}
                  </div>
                  {errors.type && <p className="text-rose-500 text-xs mt-1"><i className="fas fa-triangle-exclamation mr-1"></i>{errors.type.message}</p>}
                </div>

                {/* dates */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="من تاريخ *" error={errors.startDate?.message}>
                    <input type="date" {...register('startDate', { required: 'تاريخ البداية مطلوب' })}
                      min={new Date().toISOString().split('T')[0]}
                      className={inputCls} />
                  </Field>
                  <Field label="إلى تاريخ *" error={errors.endDate?.message}>
                    <input type="date" {...register('endDate', { required: 'تاريخ النهاية مطلوب' })}
                      min={startDate || new Date().toISOString().split('T')[0]}
                      className={inputCls} />
                  </Field>
                </div>

                {/* days badge */}
                {calculatedDays > 0 && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 bg-teal-50 border border-teal-100 rounded-xl p-4 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                      <i className="fas fa-moon text-teal-600"></i>
                    </div>
                    <div>
                      <p className="text-teal-700 font-black text-xl">{calculatedDays} يوم</p>
                      <p className="text-teal-600/70 text-xs font-medium">المدة الإجمالية للإجازة</p>
                    </div>
                  </motion.div>
                )}

                {/* reason */}
                <Field label="سبب الإجازة *" error={errors.reason?.message}>
                  <textarea {...register('reason', { required: 'اكتب سبب الإجازة' })}
                    rows={3} className={inputCls}
                    placeholder="اكتب سبب طلب الإجازة بوضوح..." />
                </Field>

              </div>

              {/* footer */}
              <div className="flex items-center gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button type="button" onClick={onClose} disabled={isLoading}
                  className="flex-1 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 font-bold py-2.5 rounded-xl transition-all cursor-pointer shadow-sm">
                  إلغاء
                </button>
                <button type="submit" disabled={isLoading}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 border border-teal-700">
                  {isLoading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جاري الحفظ...</>
                    : <><i className="fas fa-paper-plane"></i>{isEdit ? 'حفظ التعديلات' : 'إرسال الطلب'}</>
                  }
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default LeaveModal
