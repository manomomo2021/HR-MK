import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

// =============================================
// قاموس محافظات مصر مشفر من الرقم القومي
// =============================================
const EGYPT_GOVERNORATES = {
  '01': 'القاهرة', '02': 'الإسكندرية', '03': 'بور سعيد', '04': 'السويس',
  '11': 'دمياط', '12': 'الدقهلية', '13': 'الشرقية', '14': 'القليوبية',
  '15': 'كفر الشيخ', '16': 'الغربية', '17': 'المنوفية', '18': 'البحيرة',
  '19': 'الإسماعيلية', '21': 'الجيزة', '22': 'بني سويف', '23': 'الفيوم',
  '24': 'المنيا', '25': 'أسيوط', '26': 'سوهاج', '27': 'قنا',
  '28': 'أسوان', '29': 'الأقصر', '31': 'البحر الأحمر', '32': 'الوادي الجديد',
  '33': 'مطروح', '34': 'شمال سيناء', '35': 'جنوب سيناء', '88': 'خارج الجمهورية'
}

// =============================================
// محلل بيانات الرقم القومي المصري
// =============================================
const parseNationalId = (id) => {
  if (!id || id.length !== 14 || !/^\d+$/.test(id)) return null

  const centuryCode = id.charAt(0)
  if (!['2', '3'].includes(centuryCode)) return null

  const century = centuryCode === '2' ? '19' : '20'
  const year = century + id.substring(1, 3)
  const month = id.substring(3, 5)
  const day = id.substring(5, 7)
  const govCode = id.substring(7, 9)
  const seq = parseInt(id.substring(9, 13))

  const monthInt = parseInt(month)
  const dayInt = parseInt(day)
  if (monthInt < 1 || monthInt > 12 || dayInt < 1 || dayInt > 31) return null

  const birthDateStr = `${year}-${month}-${day}`
  const birthDate = new Date(birthDateStr)
  if (isNaN(birthDate.getTime())) return null

  // حساب العمر بدقة
  const today = new Date()
  let age = today.getFullYear() - parseInt(year)
  const m = today.getMonth() - (monthInt - 1)
  if (m < 0 || (m === 0 && today.getDate() < dayInt)) age--

  // النوع: الترقيم الفردي = ذكر، الزوجي = أنثى
  const gender = seq % 2 === 0 ? 'female' : 'male'

  const governorate = EGYPT_GOVERNORATES[govCode] || 'غير محددة'

  return { birthDate: birthDateStr, gender, governorate, age: age > 0 ? age : null }
}

const EmployeeModal = ({ isOpen, onClose, employee, onSave }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [age, setAge] = useState('')
  const [governorate, setGovernorate] = useState('')
  const [idStatus, setIdStatus] = useState('idle') // 'idle' | 'valid' | 'invalid'

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm()

  const nationalId = watch('nationalId')
  const birthDate = watch('birthDate')

  // تحديث العمر عند تغيير تاريخ الميلاد يدوياً
  useEffect(() => {
    if (birthDate) {
      const today = new Date()
      const birth = new Date(birthDate)
      let calculatedAge = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        calculatedAge--
      }
      setAge(calculatedAge > 0 ? `${calculatedAge} سنة` : '')
    } else {
      setAge('')
    }
  }, [birthDate])

  // === محرك استخلاص الرقم القومي ===
  useEffect(() => {
    if (!nationalId) {
      setIdStatus('idle')
      setGovernorate('')
      return
    }
    if (nationalId.length === 14) {
      const parsed = parseNationalId(nationalId)
      if (parsed) {
        setValue('birthDate', parsed.birthDate)
        setValue('gender', parsed.gender)
        setGovernorate(parsed.governorate)
        setAge(parsed.age ? `${parsed.age} سنة` : '')
        setIdStatus('valid')
        toast.success(`✅ رقم قومي صحيح — ${parsed.governorate} — ${parsed.gender === 'male' ? 'ذكر' : 'أنثى'}`, { duration: 3000 })
      } else {
        setIdStatus('invalid')
        setGovernorate('')
      }
    } else {
      setIdStatus('idle')
      setGovernorate('')
    }
  }, [nationalId, setValue])

  useEffect(() => {
    if (isOpen) {
      if (employee) {
        // دمج أسماء الحقول: البيانات قد تأتي من النموذج (camelCase)
        // أو من قاعدة البيانات (snake_case) — نتعامل مع كليهما
        const fullName = employee.name
          || (employee.first_name ? `${employee.first_name} ${employee.last_name || ''}`.trim() : '')

        const birthDateVal = employee.birthDate || employee.birth_date || ''
        const hireDateVal = employee.hireDate || employee.hire_date || ''
        const salaryVal = employee.basicSalary ?? employee.salary ?? ''
        const codeVal = employee.code || employee.employee_id || ''
        const deptVal = employee.department || employee.department_name || ''
        const posVal = employee.position || employee.position_name || ''


        reset({
          code: codeVal,
          name: fullName,
          nationalId: employee.nationalId || employee.national_id || '',
          birthDate: birthDateVal,
          gender: employee.gender || '',
          maritalStatus: employee.maritalStatus || employee.marital_status || '',
          address: employee.address || '',
          phone: employee.phone || '',
          email: employee.email || '',
          department: deptVal,
          position: posVal,
          hireDate: hireDateVal,
          contractType: employee.contractType || employee.contract_type || '',
          basicSalary: salaryVal,
          allowances: employee.allowances || 0
        })

        // استعادة المحافظة
        if (employee.governorate) {
          setGovernorate(employee.governorate)
          setIdStatus('valid')
        }

        // استعادة العمر من تاريخ الميلاد
        if (birthDateVal) {
          const today = new Date()
          const birth = new Date(birthDateVal)
          let calcAge = today.getFullYear() - birth.getFullYear()
          const m = today.getMonth() - birth.getMonth()
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) calcAge--
          setAge(calcAge > 0 ? `${calcAge} سنة` : '')
        }

      } else {
        reset({
          code: '', name: '', nationalId: '', birthDate: '', gender: '',
          maritalStatus: '', address: '', phone: '', email: '',
          department: '', position: '', hireDate: '', contractType: '',
          basicSalary: '', allowances: 0
        })
        setAge('')
        setGovernorate('')
        setIdStatus('idle')
      }
    }
  }, [isOpen, employee, reset])


  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      if (!validateEgyptianNationalId(data.nationalId)) { toast.error('الرقم القومي مش صح، اتأكد منه'); return }
      if (!validateEgyptianPhone(data.phone)) { toast.error('رقم التليفون مش صح'); return }
      if (data.email && !validateEmail(data.email)) { toast.error('الإيميل مش صح'); return }

      const employeeData = {
        ...data,
        governorate,
        basicSalary: parseFloat(data.basicSalary) || 0,
        allowances: parseFloat(data.allowances) || 0
      }
      await onSave(employeeData)
    } catch (error) {
      toast.error('في مشكلة في الحفظ، حاول تاني')
    } finally {
      setIsLoading(false)
    }
  }

  const validateEgyptianNationalId = (id) => {
    if (!id || id.length !== 14 || !/^\d+$/.test(id)) return false
    const century = id.charAt(0)
    if (!['2', '3'].includes(century)) return false
    const month = parseInt(id.substring(3, 5))
    const day = parseInt(id.substring(5, 7))
    if (month < 1 || month > 12 || day < 1 || day > 31) return false
    return true
  }

  const validateEgyptianPhone = (phone) => {
    if (!phone) return false
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
    const patterns = [/^01[0125]\d{8}$/, /^\+201[0125]\d{8}$/, /^00201[0125]\d{8}$/, /^0[2-9]\d{6,7}$/, /^\+20[2-9]\d{6,7}$/, /^0020[2-9]\d{6,7}$/]
    return patterns.some(p => p.test(cleanPhone))
  }

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const idBorderColor = idStatus === 'valid' ? 'border-emerald-500 bg-emerald-950/20' : idStatus === 'invalid' ? 'border-rose-500 bg-rose-950/20' : 'border-white/10'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 !m-0">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-indigo-500/10 max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5 relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2"></div>
              <h2 className="text-2xl font-black text-white relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <i className={`fas ${employee ? 'fa-user-edit' : 'fa-user-plus'}`}></i>
                </div>
                {employee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
              </h2>
              <button onClick={onClose} disabled={isLoading} className="relative z-10 w-10 h-10 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all flex items-center justify-center cursor-pointer border border-transparent hover:border-rose-500/20 group">
                <i className="fas fa-times group-hover:rotate-90 transition-transform"></i>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 relative hide-scrollbar">
              <form id="employee-form" onSubmit={handleSubmit(onSubmit)} className="space-y-10 relative z-10">

                {/* Personal Information Section */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-indigo-400 mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20"><i className="fas fa-id-card text-sm"></i></span>
                    البيانات الشخصية
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">الكود *</label>
                      <input {...register('code', { required: 'الكود مطلوب' })} className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:border-indigo-500 focus:bg-slate-900 outline-none transition-colors" placeholder="EMP-001" />
                      {errors.code && <p className="text-rose-400 text-xs font-bold mt-1.5"><i className="fas fa-exclamation-circle mr-1"></i>{errors.code.message}</p>}
                    </div>

                    <div className="space-y-1 lg:col-span-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">الاسم الكامل *</label>
                      <input {...register('name', { required: 'الاسم مطلوب' })} className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:border-indigo-500 focus:bg-slate-900 outline-none transition-colors" placeholder="الاسم كاملاً" />
                      {errors.name && <p className="text-rose-400 text-xs font-bold mt-1.5"><i className="fas fa-exclamation-circle mr-1"></i>{errors.name.message}</p>}
                    </div>

                    {/* === الرقم القومي مع مؤشر حالة === */}
                    <div className="space-y-1 lg:col-span-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                        الرقم القومي / الهوية *
                        {idStatus === 'valid' && <span className="text-emerald-400 text-xs font-bold flex items-center gap-1"><i className="fas fa-check-circle"></i> تم التحقق والاستخلاص</span>}
                        {idStatus === 'invalid' && <span className="text-rose-400 text-xs font-bold flex items-center gap-1"><i className="fas fa-times-circle"></i> رقم غير صحيح</span>}
                      </label>
                      <div className="relative">
                        <input
                          {...register('nationalId', { required: 'الرقم القومي مطلوب', pattern: { value: /^\d{14}$/, message: 'لازم يكون 14 رقم بالظبط' } })}
                          className={`w-full border text-white px-4 py-3 pr-12 rounded-xl focus:ring-1 outline-none transition-all font-mono ${idBorderColor}`}
                          placeholder="12345678901234"
                          maxLength="14"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          {idStatus === 'valid' && <i className="fas fa-fingerprint text-emerald-400 text-lg"></i>}
                          {idStatus === 'invalid' && <i className="fas fa-exclamation-triangle text-rose-400 text-lg"></i>}
                          {idStatus === 'idle' && <i className="fas fa-id-card text-slate-500 text-lg"></i>}
                        </div>
                      </div>
                      {errors.nationalId && <p className="text-rose-400 text-xs font-bold mt-1.5"><i className="fas fa-exclamation-circle mr-1"></i>{errors.nationalId.message}</p>}
                    </div>

                    {/* === المحافظة المستخلصة === */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">المحافظة</label>
                      <div className={`w-full border rounded-xl px-4 py-3 flex items-center gap-2 transition-all ${governorate ? 'border-indigo-500/40 bg-indigo-500/10' : 'border-white/5 bg-slate-950/80'}`}>
                        <i className={`fas fa-map-marker-alt ${governorate ? 'text-indigo-400' : 'text-slate-600'}`}></i>
                        <span className={`font-bold ${governorate ? 'text-indigo-300' : 'text-slate-600'} text-sm`}>
                          {governorate || 'هتتحدد تلقائي من الرقم القومي'}
                        </span>
                      </div>
                    </div>

                    {/* === تاريخ الميلاد المستخلص === */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">تاريخ الميلاد *</label>
                      <input type="date" {...register('birthDate', { required: 'تاريخ الميلاد مطلوب' })} className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:border-indigo-500 focus:bg-slate-900 outline-none transition-colors" />
                      {errors.birthDate && <p className="text-rose-400 text-xs font-bold mt-1.5"><i className="fas fa-exclamation-circle mr-1"></i>{errors.birthDate.message}</p>}
                    </div>

                    {/* === العمر المحسوب === */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">العمر الحالي</label>
                      <div className={`w-full border rounded-xl px-4 py-3 flex items-center gap-2 transition-all ${age ? 'border-purple-500/40 bg-purple-500/10' : 'border-white/5 bg-slate-950/80'}`}>
                        <i className={`fas fa-hourglass-half ${age ? 'text-purple-400 animate-pulse' : 'text-slate-600'}`}></i>
                        <span className={`font-black text-lg ${age ? 'text-purple-300' : 'text-slate-600 text-sm'}`}>
                          {age || 'بيتحسب تلقائي'}
                        </span>
                      </div>
                    </div>

                    {/* === النوع المستخلص === */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">الجنس *</label>
                      <select {...register('gender', { required: 'الجنس مطلوب' })} className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:border-indigo-500 focus:bg-slate-900 outline-none transition-colors appearance-none">
                        <option value="">اختار...</option>
                        <option value="male">ذكر</option>
                        <option value="female">أنثى</option>
                      </select>
                      {errors.gender && <p className="text-rose-400 text-xs font-bold mt-1.5"><i className="fas fa-exclamation-circle mr-1"></i>{errors.gender.message}</p>}
                    </div>

                    <div className="space-y-1 lg:col-span-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">الحالة الاجتماعية</label>
                      <select {...register('maritalStatus')} className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:border-indigo-500 focus:bg-slate-900 outline-none transition-colors appearance-none">
                        <option value="">اختار...</option>
                        <option value="single">أعزب</option>
                        <option value="married">متجوز</option>
                        <option value="divorced">مطلق</option>
                        <option value="widowed">أرمل</option>
                      </select>
                    </div>

                    <div className="space-y-1 lg:col-span-3">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">العنوان</label>
                      <input {...register('address')} className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:border-indigo-500 focus:bg-slate-900 outline-none transition-colors" placeholder="العنوان بالتفصيل" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">رقم التليفون *</label>
                      <input type="tel" {...register('phone', { required: 'رقم التليفون مطلوب' })} className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:border-indigo-500 focus:bg-slate-900 outline-none transition-colors font-mono" placeholder="01X-XXX-XXXX" />
                      {errors.phone && <p className="text-rose-400 text-xs font-bold mt-1.5"><i className="fas fa-exclamation-circle mr-1"></i>{errors.phone.message}</p>}
                    </div>

                    <div className="space-y-1 lg:col-span-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">الإيميل</label>
                      <input type="email" {...register('email')} className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:border-indigo-500 focus:bg-slate-900 outline-none transition-colors font-mono" placeholder="example@company.com" />
                    </div>
                  </div>
                </div>

                {/* Organizational Structure */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-rose-500/10 rounded-full blur-[60px] pointer-events-none"></div>
                  <h3 className="text-xl font-bold text-rose-400 mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20"><i className="fas fa-network-wired text-sm"></i></span>
                    بيانات الوظيفة والراتب
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">القسم *</label>
                      <input {...register('department', { required: 'القسم مطلوب' })} className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:border-rose-500 focus:bg-slate-900 outline-none transition-colors" placeholder="اسم القسم" />
                      {errors.department && <p className="text-rose-400 text-xs font-bold mt-1.5"><i className="fas fa-exclamation-circle mr-1"></i>{errors.department.message}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">الوظيفة *</label>
                      <input {...register('position', { required: 'الوظيفة مطلوبة' })} className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:border-rose-500 focus:bg-slate-900 outline-none transition-colors" placeholder="المسمى الوظيفي" />
                      {errors.position && <p className="text-rose-400 text-xs font-bold mt-1.5"><i className="fas fa-exclamation-circle mr-1"></i>{errors.position.message}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">تاريخ التعيين *</label>
                      <input type="date" {...register('hireDate', { required: 'تاريخ التعيين مطلوب' })} className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:border-rose-500 focus:bg-slate-900 outline-none transition-colors" />
                      {errors.hireDate && <p className="text-rose-400 text-xs font-bold mt-1.5"><i className="fas fa-exclamation-circle mr-1"></i>{errors.hireDate.message}</p>}
                    </div>

                    <div className="space-y-1 lg:col-span-3">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">نوع العقد *</label>
                      <select {...register('contractType', { required: 'نوع العقد مطلوب' })} className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:border-rose-500 focus:bg-slate-900 outline-none transition-colors appearance-none">
                        <option value="">اختار...</option>
                        <option value="permanent">دائم</option>
                        <option value="temporary">مؤقت</option>
                      </select>
                      {errors.contractType && <p className="text-rose-400 text-xs font-bold mt-1.5"><i className="fas fa-exclamation-circle mr-1"></i>{errors.contractType.message}</p>}
                    </div>

                    <div className="space-y-1 lg:col-span-2">
                      <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider ml-1">الراتب الأساسي *</label>
                      <div className="relative">
                        <input type="number" step="0.01" {...register('basicSalary', { required: 'الراتب مطلوب', min: { value: 0, message: 'الراتب مينفعش يكون سالب' } })} className="w-full bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 font-black px-4 py-3 pl-12 rounded-xl focus:border-emerald-400 outline-none transition-colors" placeholder="0.00" />
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-500/80 font-bold">ج.م</div>
                      </div>
                      {errors.basicSalary && <p className="text-rose-400 text-xs font-bold mt-1.5"><i className="fas fa-exclamation-circle mr-1"></i>{errors.basicSalary.message}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-400 uppercase tracking-wider ml-1">البدلات والمخصصات</label>
                      <div className="relative">
                        <input type="number" step="0.01" {...register('allowances')} className="w-full bg-amber-950/20 border border-amber-500/30 text-amber-300 font-bold px-4 py-3 pl-12 rounded-xl focus:border-amber-400 outline-none transition-colors" placeholder="سكن، تنقل، وغيره" />
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-amber-500/80 font-bold">ج.م</div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Sticky Action Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 bg-slate-900/80 backdrop-blur-xl shrink-0 relative z-20">
              <button type="button" onClick={onClose} disabled={isLoading} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl border border-white/10 transition-all cursor-pointer">
                إلغاء
              </button>
              <button form="employee-form" type="submit" disabled={isLoading} className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold py-3 px-8 rounded-xl border border-indigo-400/20 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all flex items-center gap-2 cursor-pointer">
                {isLoading ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> جاري الحفظ...</>
                ) : (
                  <><i className="fas fa-floppy-disk"></i> {employee ? 'حفظ التعديلات' : 'إضافة الموظف'}</>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default EmployeeModal
