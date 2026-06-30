import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { formatCurrency, CURRENCIES } from '../utils/currency'
import database from '../utils/database'

const PayrollModal = ({ isOpen, onClose, payroll, onSave }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [autoCalculate, setAutoCalculate] = useState(true)
  const [workingDaysInMonth] = useState(22)
  const [employees, setEmployees] = useState([])
  const [isLoadingEmployeeData, setIsLoadingEmployeeData] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm()

  const employeeId = watch('employeeId')
  const basicSalary = parseFloat(watch('basicSalary')) || 0
  const transportAllowance = parseFloat(watch('transportAllowance')) || 0
  const housingAllowance = parseFloat(watch('housingAllowance')) || 0
  const otherAllowances = parseFloat(watch('otherAllowances')) || 0
  const absentDays = parseFloat(watch('absentDays')) || 0
  const lateDays = parseFloat(watch('lateDays')) || 0
  const loanDeduction = parseFloat(watch('loanDeduction')) || 0
  const otherDeductions = parseFloat(watch('otherDeductions')) || 0

  // Calculations
  const dailySalary = basicSalary / workingDaysInMonth
  const actualWorkingDays = Math.max(0, workingDaysInMonth - absentDays)
  const proportionalSalary = dailySalary * actualWorkingDays
  const totalAllowances = transportAllowance + housingAllowance + otherAllowances
  const grossSalary = proportionalSalary + totalAllowances

  const absentDeduction = dailySalary * absentDays
  const lateDeduction = lateDays * (dailySalary * 0.1) // 10% daily salary deduction per late day
  const insuranceDeduction = grossSalary * 0.09 // 9% social insurance
  const totalDeductions = absentDeduction + lateDeduction + loanDeduction + insuranceDeduction + otherDeductions
  const netSalary = Math.max(0, grossSalary - totalDeductions)

  const deductionRate = grossSalary > 0 ? (totalDeductions / grossSalary) * 100 : 0
  const netRate = grossSalary > 0 ? (netSalary / grossSalary) * 100 : 0

  // Auto calculate field values
  useEffect(() => {
    if (autoCalculate && isOpen) {
      setValue('workingDays', actualWorkingDays)
      setValue('absentDeduction', absentDeduction.toFixed(2))
      setValue('lateDeduction', lateDeduction.toFixed(2))
      setValue('insuranceDeduction', insuranceDeduction.toFixed(2))
    }
  }, [basicSalary, absentDays, lateDays, autoCalculate, isOpen, setValue, actualWorkingDays, absentDeduction, lateDeduction, insuranceDeduction])

  // Load employee choices
  useEffect(() => {
    const loadEmployees = async () => {
      if (isOpen) {
        try {
          const data = await database.getEmployees()
          setEmployees(data || [])
        } catch (error) {
          console.error('Error loading employees:', error)
          toast.error('حدث خطأ أثناء تحميل بيانات الموظفين')
        }
      }
    }
    loadEmployees()
  }, [isOpen])

  // Fill in form values for Edit/Add
  useEffect(() => {
    if (isOpen) {
      if (payroll) {
        reset({
          employeeId: payroll.employeeId || '',
          employeeName: payroll.employeeName || '',
          month: payroll.month || '',
          basicSalary: payroll.basicSalary || 0,
          transportAllowance: payroll.transportAllowance || 0,
          housingAllowance: payroll.housingAllowance || 0,
          otherAllowances: payroll.otherAllowances || 0,
          workingDays: payroll.workingDays || workingDaysInMonth,
          absentDays: payroll.absentDays || 0,
          lateDays: payroll.lateDays || 0,
          loanDeduction: payroll.loanDeduction || 0,
          otherDeductions: payroll.otherDeductions || 0,
          absentDeduction: payroll.absentDeduction || 0,
          lateDeduction: payroll.lateDeduction || 0,
          insuranceDeduction: payroll.insuranceDeduction || 0,
          notes: payroll.notes || ''
        })
      } else {
        reset({
          employeeId: '',
          employeeName: '',
          month: new Date().toISOString().slice(0, 7),
          basicSalary: 0,
          transportAllowance: 0,
          housingAllowance: 0,
          otherAllowances: 0,
          workingDays: workingDaysInMonth,
          absentDays: 0,
          lateDays: 0,
          loanDeduction: 0,
          otherDeductions: 0,
          absentDeduction: 0,
          lateDeduction: 0,
          insuranceDeduction: 0,
          notes: ''
        })
      }
      setActiveTab('basic')
    }
  }, [isOpen, payroll, reset])

  // Get active loans deduction when selecting employee
  const handleEmployeeChange = async (empId) => {
    if (!empId) return
    setIsLoadingEmployeeData(true)
    try {
      const selected = employees.find(e => String(e.id) === String(empId))
      if (selected) {
        setValue('employeeName', selected.name)
        setValue('basicSalary', selected.salary || selected.basicSalary || 0)
        
        // Fetch active loans automatically
        const allLoans = await database.getLoans()
        const activeLoans = allLoans.filter(l => 
          String(l.employeeId) === String(empId) && 
          l.status === 'approved'
        )
        const totalLoanInst = activeLoans.reduce((acc, curr) => acc + (parseFloat(curr.monthlyInstallment) || 0), 0)
        setValue('loanDeduction', totalLoanInst)
      }
    } catch (error) {
      console.error('Error fetching employee loans:', error)
    } finally {
      setIsLoadingEmployeeData(false)
    }
  }

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const selectedEmp = employees.find(e => String(e.id) === String(data.employeeId))
      const payload = {
        ...payroll,
        employeeId: parseInt(data.employeeId),
        employeeName: selectedEmp ? selectedEmp.name : data.employeeName,
        month: data.month,
        basicSalary: parseFloat(data.basicSalary),
        transportAllowance: parseFloat(data.transportAllowance),
        housingAllowance: parseFloat(data.housingAllowance),
        otherAllowances: parseFloat(data.otherAllowances),
        workingDays: parseInt(data.workingDays),
        absentDays: parseFloat(data.absentDays),
        lateDays: parseFloat(data.lateDays),
        loanDeduction: parseFloat(data.loanDeduction),
        otherDeductions: parseFloat(data.otherDeductions),
        absentDeduction: parseFloat(absentDeduction.toFixed(2)),
        lateDeduction: parseFloat(lateDeduction.toFixed(2)),
        insuranceDeduction: parseFloat(insuranceDeduction.toFixed(2)),
        totalAllowances,
        grossSalary,
        totalDeductions,
        netSalary,
        notes: data.notes || '',
        currency: 'EGP',
        status: payroll?.status || 'calculated'
      }
      await onSave(payload)
      toast.success(payroll ? 'تم تحديث الراتب بنجاح' : 'تم احتساب الراتب بنجاح')
      onClose()
    } catch (error) {
      console.error(error)
      toast.error('حدث خطأ أثناء حفظ مسودة الراتب')
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { id: 'basic', label: 'البيانات الأساسية', icon: 'fa-user' },
    { id: 'allowances', label: 'البدلات والامتيازات', icon: 'fa-gift' },
    { id: 'attendance', label: 'الحضور والخصم الزمني', icon: 'fa-clock' },
    { id: 'deductions', label: 'الاستقطاعات القانونية والمالية', icon: 'fa-minus-circle' },
    { id: 'summary', label: 'كشف الحساب الإجمالي', icon: 'fa-file-invoice-dollar' }
  ]

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="modal-panel max-w-4xl"
        >
          {/* Header */}
          <div className="modal-header">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 shadow-sm border border-brand-100">
                <i className="fas fa-money-check-dollar"></i>
              </div>
              <div>
                <h2 className="text-lg font-black text-surface-900">
                  {payroll ? 'تعديل مسودة الراتب المعتمدة' : 'احتساب راتب الموظف يدوياً'}
                </h2>
                <p className="text-xs text-surface-500 mt-0.5">جدول احتساب الحوافز والخصومات لشهر العمل المالي</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-surface-50 text-surface-500 hover:bg-surface-100 border border-surface-200 flex items-center justify-center transition-colors"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>

          {/* Tabs header scrollable */}
          <div className="flex bg-surface-50 border-b border-surface-200 overflow-x-auto hide-scrollbar p-1.5 gap-1">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2.5 rounded-lg font-black text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === t.id ? 'bg-white text-brand-600 shadow-sm' : 'text-surface-500 hover:text-surface-950'
                }`}
              >
                <i className={`fas ${t.icon} text-[10px]`}></i>
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Modal Body */}
            <div className="modal-body space-y-4 max-h-[60vh] overflow-y-auto">
              
              {activeTab === 'basic' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-surface-500">اختر الموظف</label>
                      <select
                        {...register('employeeId', { required: 'يجب اختيار موظف' })}
                        onChange={e => handleEmployeeChange(e.target.value)}
                        className="select text-xs font-bold"
                        disabled={!!payroll}
                      >
                        <option value="">— اختر الموظف —</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.department})
                          </option>
                        ))}
                      </select>
                      {errors.employeeId && <p className="text-xs text-rose-500 font-bold">{errors.employeeId.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-surface-500">الشهر المالي</label>
                      <input
                        type="month"
                        {...register('month', { required: 'الشهر مطلوب' })}
                        className="input text-xs font-bold"
                      />
                      {errors.month && <p className="text-xs text-rose-500 font-bold">{errors.month.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-surface-500">الراتب الأساسي المرجعي (EGP)</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('basicSalary', { required: 'الراتب الأساسي مطلوب', min: 0 })}
                        className="input text-xs font-bold font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-surface-500">ملاحظات محاسبية</label>
                      <input
                        type="text"
                        {...register('notes')}
                        placeholder="مثال: صرف علاوة استثنائية..."
                        className="input text-xs font-bold"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'allowances' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-surface-500">بدل الانتقالات والوقود</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('transportAllowance')}
                        className="input text-xs font-bold font-mono text-emerald-600 bg-emerald-50/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-surface-500">بدل السكن والإعاشة</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('housingAllowance')}
                        className="input text-xs font-bold font-mono text-emerald-600 bg-emerald-50/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-surface-500">علاوات وبدلات أخرى</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('otherAllowances')}
                        className="input text-xs font-bold font-mono text-emerald-600 bg-emerald-50/20"
                      />
                    </div>
                  </div>
                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 flex items-center justify-between text-emerald-800">
                    <span className="text-xs font-bold">إجمالي البدلات المضافة للراتب</span>
                    <span className="text-sm font-black font-mono">{formatCurrency(totalAllowances, 'EGP')}</span>
                  </div>
                </motion.div>
              )}

              {activeTab === 'attendance' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-surface-500">أيام العمل الافتراضية</label>
                      <input
                        type="number"
                        value={workingDaysInMonth}
                        disabled
                        className="input text-xs font-bold font-mono bg-surface-50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-surface-500">أيام الغياب</label>
                      <input
                        type="number"
                        step="0.5"
                        {...register('absentDays')}
                        className="input text-xs font-bold font-mono text-rose-600 bg-rose-50/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-surface-500">أيام التأخير المجمعة</label>
                      <input
                        type="number"
                        step="0.5"
                        {...register('lateDays')}
                        className="input text-xs font-bold font-mono text-rose-600 bg-rose-50/20"
                      />
                    </div>
                  </div>
                  <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-100 grid grid-cols-2 gap-4 text-rose-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold">استقطاع الغياب اليومي</span>
                      <span className="text-xs font-black font-mono">{formatCurrency(absentDeduction, 'EGP')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold">خصومات التأخيرات</span>
                      <span className="text-xs font-black font-mono">{formatCurrency(lateDeduction, 'EGP')}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'deductions' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-surface-500">تأمينات اجتماعية وصحية (9%)</label>
                      <input
                        type="number"
                        value={insuranceDeduction.toFixed(2)}
                        disabled
                        className="input text-xs font-bold font-mono bg-surface-50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-surface-500">أقساط السلف النشطة</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('loanDeduction')}
                        className="input text-xs font-bold font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-surface-500">استقطاعات أخرى</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('otherDeductions')}
                        className="input text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                  <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 flex items-center justify-between text-surface-700">
                    <span className="text-xs font-bold">إجمالي الخصومات والاستقطاعات</span>
                    <span className="text-sm font-black font-mono text-rose-600">{formatCurrency(totalDeductions, 'EGP')}</span>
                  </div>
                </motion.div>
              )}

              {activeTab === 'summary' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-surface-50 border border-surface-200 p-4 rounded-xl text-center">
                      <p className="text-xs text-surface-500 font-bold">الراتب النسبي الفعلي</p>
                      <p className="text-sm font-black text-surface-900 font-mono mt-1">{formatCurrency(proportionalSalary, 'EGP')}</p>
                    </div>
                    <div className="bg-surface-50 border border-surface-200 p-4 rounded-xl text-center">
                      <p className="text-xs text-surface-500 font-bold">الراتب الإجمالي (الجروس)</p>
                      <p className="text-sm font-black text-brand-600 font-mono mt-1">{formatCurrency(grossSalary, 'EGP')}</p>
                    </div>
                    <div className="bg-surface-50 border border-surface-200 p-4 rounded-xl text-center col-span-2 sm:col-span-1">
                      <p className="text-xs text-surface-500 font-bold">نسبة الخصومات</p>
                      <p className="text-sm font-black text-rose-600 font-mono mt-1">{deductionRate.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl text-center">
                    <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider">صافي الراتب المستحق للصرف</p>
                    <p className="text-2xl font-black text-emerald-600 font-mono mt-1.5">{formatCurrency(netSalary, 'EGP')}</p>
                    <p className="text-[10px] text-emerald-500/70 mt-1 font-bold">معادلة الحساب: (الراتب النسبي + البدلات) - الخصومات</p>
                  </div>
                </motion.div>
              )}

            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary btn-md"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary btn-md"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle"></i>
                    {payroll ? 'تحديث الراتب' : 'حفظ الراتب واحتسابه'}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default PayrollModal
