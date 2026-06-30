import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { formatCurrency, CURRENCIES } from '../utils/currency'

const LoanModal = ({ isOpen, onClose, loan, employees, onSave }) => {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm()

  const selectedEmployeeId = watch('employeeId')
  const loanAmount = parseFloat(watch('amount')) || 0
  const installments = parseInt(watch('installments')) || 1
  const autoDeduction = watch('autoDeduction') !== false // افتراضياً مفعل

  // العثور على الموظف المحدد
  const selectedEmployee = employees?.find(emp => emp.id === selectedEmployeeId)
  const employeeSalary = parseFloat(selectedEmployee?.salary || selectedEmployee?.basicSalary || 0)

  // حسابات الخصم التلقائي
  const monthlyDeduction = loanAmount > 0 && installments > 0 ? loanAmount / installments : 0
  const maxAllowedDeduction = employeeSalary > 0 ? employeeSalary * 0.25 : 0 // 25% من الراتب كحد أقصى
  const isDeductionValid = employeeSalary > 0 && monthlyDeduction <= maxAllowedDeduction && monthlyDeduction > 0
  const deductionPercentage = employeeSalary > 0 && monthlyDeduction > 0 ? (monthlyDeduction / employeeSalary) * 100 : 0
  const salaryAfterDeduction = employeeSalary > 0 ? Math.max(0, employeeSalary - monthlyDeduction) : 0

  // تحميل بيانات السلفة عند فتح النافذة للتعديل
  useEffect(() => {
    if (isOpen) {
      if (loan) {
        reset({
          employeeId: loan.employeeId || '',
          employeeName: loan.employeeName || '',
          type: loan.type || '',
          amount: loan.amount || '',
          purpose: loan.purpose || '',
          installments: loan.installments || 1,
          notes: loan.notes || ''
        })
      } else {
        // للموظف العادي، تعيين بياناته تلقائياً
        const defaultEmployeeId = user?.role === 'employee' ? user.employeeId : ''
        const defaultEmployeeName = user?.role === 'employee' ? user.name : ''

        reset({
          employeeId: defaultEmployeeId,
          employeeName: defaultEmployeeName,
          type: '',
          amount: '',
          purpose: '',
          installments: 1,
          notes: ''
        })
      }
    }
  }, [isOpen, loan, reset, user])

  // تحديث اسم الموظف وبياناته عند تغيير الموظف المحدد
  useEffect(() => {
    if (selectedEmployeeId && employees.length > 0) {
      const selectedEmployee = employees.find(emp => emp.id.toString() === selectedEmployeeId.toString())
      if (selectedEmployee) {
        reset(prev => ({
          ...prev,
          employeeName: selectedEmployee.name
        }))

        // إشعار بمعلومات الموظف والحد المسموح للخصم
        const salary = selectedEmployee.salary || selectedEmployee.basicSalary || 0
        const maxDeduction = salary * 0.25

        if (salary > 0) {
          toast.success(
            `تم اختيار: ${selectedEmployee.name}\n` +
            `الراتب: ${formatCurrency(salary, 'EGP')}\n` +
            `الحد الأقصى للخصم (25%): ${formatCurrency(maxDeduction, 'EGP')}`,
            {
              duration: 5000,
              icon: '👤',
              style: {
                background: '#f0f9ff',
                border: '1px solid #0ea5e9',
                color: '#0c4a6e'
              }
            }
          )
        }
      }
    }
  }, [selectedEmployeeId, employees, reset])

  const onSubmit = async (data) => {
    setIsLoading(true)

    try {
      // التحقق من صحة البيانات
      if (parseFloat(data.amount) <= 0) {
        toast.error('مبلغ السلفة يجب أن يكون أكبر من صفر')
        return
      }

      if (parseInt(data.installments) <= 0) {
        toast.error('عدد الأقساط يجب أن يكون أكبر من صفر')
        return
      }

      // العثور على اسم الموظف
      const selectedEmployee = employees.find(emp => emp.id.toString() === data.employeeId.toString())
      if (!selectedEmployee) {
        toast.error('يرجى اختيار موظف صحيح')
        return
      }

      // التحقق من وجود راتب للموظف
      if (!selectedEmployee.salary && !selectedEmployee.basicSalary) {
        toast.error(`لا يوجد راتب محدد للموظف "${selectedEmployee.name}". يرجى تحديد الراتب أولاً في شاشة إدارة الموظفين.`)
        return
      }

      // التحقق من صحة الخصم التلقائي
      if (data.autoDeduction && employeeSalary > 0 && !isDeductionValid) {
        toast.error(
          `قيمة القسط الشهري (${formatCurrency(monthlyDeduction, 'EGP')}) تتجاوز الحد المسموح (${formatCurrency(maxAllowedDeduction, 'EGP')}).\n` +
          `يرجى تقليل المبلغ أو زيادة عدد الأقساط.`,
          { duration: 6000 }
        )
        return
      }

      const loanData = {
        ...data,
        id: loan?.id || Date.now().toString(),
        employeeId: parseInt(data.employeeId),
        employeeName: selectedEmployee.name,
        amount: parseFloat(data.amount),
        installments: parseInt(data.installments),
        monthlyInstallment: parseFloat(data.amount) / parseInt(data.installments),
        monthlyDeduction: monthlyDeduction,
        deductionPercentage: deductionPercentage.toFixed(2),
        autoDeduction: data.autoDeduction || false,
        employeeSalary: employeeSalary,
        maxAllowedDeduction: maxAllowedDeduction,
        status: loan?.status || 'pending',
        requestDate: loan?.requestDate || new Date().toISOString(),
        createdAt: loan?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        requestedBy: user?.name || 'مجهول',
        currency: 'EGP'
      }

      await onSave(loanData)
      toast.success(loan ? 'تم تحديث طلب السلفة بنجاح' : 'تم إرسال طلب السلفة بنجاح')
      onClose()
    } catch (error) {
      console.error('خطأ في حفظ السلفة:', error)
      toast.error('حدث خطأ أثناء حفظ البيانات')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
          {/* Backdrop with Blur */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative bg-white border border-gray-200 rounded-[2.5rem] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Ambient Glows */}
            <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>

            {/* Header */}
            <div className="flex items-center justify-between p-8 border-b border-gray-200 relative bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
                  <i className={`fas ${loan ? 'fa-edit' : 'fa-plus-circle'} text-xl`}></i>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic">
                    {loan ? 'تعديل السلفة' : 'طلب سلفة جديد'}
                  </h2>
                  <p className="text-[10px] text-gray-500 font-bold tracking-[0.2em] uppercase">العمليات المالية</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all border border-gray-200 shadow-sm"
                disabled={isLoading}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Content Container */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
              <form id="loan-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                {/* Section 1: Core Parameters */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] flex items-center gap-2 mb-6">
                    <span className="w-8 h-px bg-indigo-500/30"></span>
                    البيانات الأساسية
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">الموظف المستهدف</label>
                      <div className="relative group/field">
                        <select
                          {...register('employeeId', { required: 'اختيار الموظف مطلوب' })}
                          className="w-full bg-white border border-gray-200 text-gray-900 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer shadow-sm"
                          disabled={user?.role === 'employee'}
                        >
                          <option value="" className="bg-white">اختر الموظف</option>
                          {employees.map(employee => (
                            <option key={employee.id} value={employee.id} className="bg-white">
                              {employee.name}
                            </option>
                          ))}
                        </select>
                        <i className="fas fa-chevron-down absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover/field:text-indigo-600 transition-colors"></i>
                      </div>
                      {errors.employeeId && <p className="text-rose-500 text-[10px] font-bold px-2">{errors.employeeId.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">تصنيف العملية</label>
                      <div className="relative group/field">
                        <select
                          {...register('type', { required: 'نوع السلفة مطلوب' })}
                          className="w-full bg-white border border-gray-200 text-gray-900 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer shadow-sm"
                        >
                          <option value="" className="bg-white">اختر النوع</option>
                          <option value="salary_advance" className="bg-white">سلفة راتب</option>
                          <option value="emergency" className="bg-white">سلفة طارئة</option>
                          <option value="personal" className="bg-white">سلفة شخصية</option>
                          <option value="medical" className="bg-white">سلفة طبية</option>
                        </select>
                        <i className="fas fa-chevron-down absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover/field:text-indigo-600 transition-colors"></i>
                      </div>
                      {errors.type && <p className="text-rose-500 text-[10px] font-bold px-2">{errors.type.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">القيمة الإجمالية (EGP)</label>
                      <div className="relative group/field">
                        <input
                          {...register('amount', { required: 'مبلغ السلفة مطلوب', min: { value: 1, message: 'المبلغ يجب أن يكون أكبر من صفر' } })}
                          type="number" step="0.01"
                          className="w-full bg-white border border-gray-200 text-gray-900 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-400 shadow-sm"
                          placeholder="0.00"
                        />
                        <i className="fas fa-coins absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                      </div>
                      {errors.amount && <p className="text-rose-500 text-[10px] font-bold px-2">{errors.amount.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">عدد دورات السداد (أشهر)</label>
                      <div className="relative group/field">
                        <input
                          {...register('installments', { required: 'عدد الأقساط مطلوب', min: { value: 1, message: 'عدد الأقساط يجب أن يكون أكبر من صفر' } })}
                          type="number"
                          className="w-full bg-white border border-gray-200 text-gray-900 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-400 shadow-sm"
                          placeholder="1"
                        />
                        <i className="fas fa-calendar-check absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                      </div>
                      {errors.installments && <p className="text-rose-500 text-[10px] font-bold px-2">{errors.installments.message}</p>}
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">موجبات السداد / الغرض</label>
                      <textarea
                        {...register('purpose', { required: 'الغرض من السلفة مطلوب' })}
                        className="w-full bg-white border border-gray-200 text-gray-900 rounded-[1.5rem] px-5 py-4 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-400 min-h-[100px] resize-none shadow-sm"
                        placeholder="وثق الغرض من هذه العملية هنا..."
                      />
                      {errors.purpose && <p className="text-rose-500 text-[10px] font-bold px-2">{errors.purpose.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Section 2: Financial Telemetry */}
                <div className="bg-gray-50 border border-gray-200 rounded-[2rem] p-6 space-y-6 overflow-hidden relative shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 blur-3xl rounded-full pointer-events-none"></div>

                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] flex items-center gap-2">
                      <span className="w-8 h-px bg-emerald-500/30"></span>
                      التحليل المالي
                    </h3>

                    <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                      <input
                        {...register('autoDeduction')}
                        type="checkbox"
                        id="autoDeduction"
                        className="w-4 h-4 rounded bg-gray-50 border-gray-200 text-indigo-600 focus:ring-indigo-500/20"
                        defaultChecked={true}
                      />
                      <label htmlFor="autoDeduction" className="text-[10px] font-black text-gray-500 uppercase tracking-tighter cursor-pointer px-1">الخصم التلقائي مفعل</label>
                    </div>
                  </div>

                  {selectedEmployee && employeeSalary > 0 ? (
                    <div className="space-y-6 relative z-10">
                      {/* Employee HUD Card */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white border border-gray-200 p-4 rounded-2xl flex flex-col items-center shadow-sm">
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">الراتب الأساسي</p>
                          <p className="text-lg font-black text-gray-900">{formatCurrency(employeeSalary, 'EGP')}</p>
                        </div>
                        <div className="bg-white border border-gray-200 p-4 rounded-2xl flex flex-col items-center shadow-sm">
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">الحد الأقصى للخصم</p>
                          <p className="text-lg font-black text-amber-600">{formatCurrency(maxAllowedDeduction, 'EGP')}</p>
                        </div>
                        <div className="bg-white border border-gray-200 p-4 rounded-2xl flex flex-col items-center shadow-sm">
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">القسط المتوقع</p>
                          <p className={`text-lg font-black ${isDeductionValid ? 'text-emerald-600' : 'text-rose-600 animate-pulse'}`}>
                            {formatCurrency(monthlyDeduction, 'EGP')}
                          </p>
                        </div>
                      </div>

                      {/* Deduction Analysis */}
                      <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl relative overflow-hidden group/hud">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/0 via-white/50 to-indigo-50/0 translate-x-[-100%] group-hover/hud:translate-x-[100%] transition-transform duration-1000"></div>

                        <div className="flex flex-col md:flex-row justify-between gap-6 items-center">
                          <div className="flex-1 w-full space-y-4">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                              <span>نسبة الضغط المالي</span>
                              <span className={isDeductionValid ? 'text-emerald-600' : 'text-rose-600'}>{deductionPercentage.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }} animate={{ width: `${Math.min(100, deductionPercentage)}%` }}
                                className={`h-full rounded-full transition-all duration-700 ${isDeductionValid ? 'bg-gradient-to-r from-indigo-500 to-emerald-500' : 'bg-rose-500'}`}
                              ></motion.div>
                            </div>
                          </div>

                          <div className="text-center md:text-right relative z-10">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">الراتب بعد التنفيذ</p>
                            <h5 className={`text-2xl font-black italic tracking-tighter ${salaryAfterDeduction >= employeeSalary * 0.5 ? 'text-indigo-600' : 'text-amber-600'}`}>
                              {formatCurrency(salaryAfterDeduction, 'EGP')}
                            </h5>
                          </div>
                        </div>

                        {!isDeductionValid && loanAmount > 0 && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-4">
                            <i className="fas fa-exclamation-triangle text-rose-600 mt-1"></i>
                            <div>
                              <p className="text-xs font-black text-rose-600 uppercase tracking-tight mb-1">تحذير تجاوز الحد</p>
                              <p className="text-[10px] text-gray-600 font-medium">القسط يتجاوز 25% من الراتب. يوصى بهيكل سداد أطول.</p>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Fast Fill Presets */}
                      <div className="flex flex-wrap gap-3 pt-2">
                        {[
                          { label: '3 أشهر', amount: Math.round(maxAllowedDeduction * 3), dur: 3, icon: 'fa-bolt', color: 'indigo' },
                          { label: '6 أشهر', amount: Math.round(maxAllowedDeduction * 6), dur: 6, icon: 'fa-calendar-alt', color: 'emerald' },
                          { label: '12 أشهر', amount: Math.round(maxAllowedDeduction * 12), dur: 12, icon: 'fa-history', color: 'violet' }
                        ].map((btn, i) => (
                          <motion.button
                            key={i} type="button" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              reset({ ...watch(), amount: btn.amount, installments: btn.dur })
                              toast.success(`تم اختيار: ${btn.label}`, { icon: '⚡' })
                            }}
                            className={`px-4 py-2.5 bg-${btn.color}-50 hover:bg-${btn.color}-100 border border-${btn.color}-200 text-${btn.color}-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2`}
                          >
                            <i className={`fas ${btn.icon}`}></i>
                            {btn.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Additional Metadata */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-right space-y-4 shadow-sm">
                  <div className="flex items-center gap-3 text-gray-500 mb-2">
                    <i className="fas fa-microchip text-[10px]"></i>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">بيانات إضافية</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[8px] text-gray-400 uppercase font-black tracking-widest mb-1">بواسطة</p>
                      <p className="text-[10px] text-gray-600 font-bold uppercase">{user?.name || 'مدير النظام'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-gray-400 uppercase font-black tracking-widest mb-1">الوقت</p>
                      <p className="text-[10px] text-gray-600 font-bold uppercase tabular-nums">{new Date().toLocaleDateString('en-GB')}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-gray-400 uppercase font-black tracking-widest mb-1">العملة</p>
                      <p className="text-[10px] text-gray-600 font-bold uppercase">Egyptian Pound (EGP)</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-gray-400 uppercase font-black tracking-widest mb-1">الحالة</p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">متاح</p>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Footer / Controls */}
            <div className="p-8 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="hidden md:flex items-center gap-4 text-gray-500">
                <i className="fas fa-shield-alt text-xs"></i>
                <span className="text-[8px] font-black uppercase tracking-[0.3em]">تم تأمين العملية بنجاح</span>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors bg-white border border-gray-200 rounded-2xl shadow-sm hover:bg-gray-100"
                  disabled={isLoading}
                >
                  إلغاء
                </button>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit(onSubmit)}
                  className="flex-1 md:flex-none px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-md transition-all border border-indigo-700 flex items-center justify-center gap-3"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <i className="fas fa-check"></i>
                      تأكيد العملية
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default LoanModal
