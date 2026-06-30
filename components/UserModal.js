import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const UserModal = ({ isOpen, onClose, user, onSave }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm()

  const selectedRole = watch('role')
  const customPermissions = watch('customPermissions') || []

  useEffect(() => {
    if (isOpen) {
      if (user) {
        reset({
          name: user.name || '',
          username: user.username || '',
          email: user.email || '',
          role: user.role || '',
          department: user.department || '',
          employeeId: user.employeeId || '',
          phone: user.phone || '',
          customPermissions: user.customPermissions || []
        })
      } else {
        reset({
          name: '',
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: '',
          department: '',
          employeeId: '',
          phone: '',
          customPermissions: []
        })
      }
    }
  }, [isOpen, user, reset])

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      if (!user && data.password !== data.confirmPassword) {
        toast.error('كلمات المرور غير متطابقة')
        setIsLoading(false)
        return
      }

      const userData = {
        name: data.name,
        username: data.username,
        email: data.email,
        role: data.role,
        department: data.department,
        employeeId: data.employeeId ? parseInt(data.employeeId) : null,
        phone: data.phone,
        customPermissions: data.customPermissions || []
      }

      if (!user) userData.password = data.password
      else if (data.password) userData.password = data.password

      await onSave(userData)
    } catch (error) {
      console.error('Save Error:', error)
      toast.error('خطأ في حفظ البيانات')
    } finally {
      setIsLoading(false)
    }
  }

  const permissionGroups = [
    {
      label: 'الموظفين',
      icon: 'fa-users',
      perms: [
        { id: 'view_employees', name: 'عرض' },
        { id: 'add_employee', name: 'إضافة' },
        { id: 'edit_employee', name: 'تعديل' },
        { id: 'delete_employee', name: 'حذف' }
      ]
    },
    {
      label: 'الحضور',
      icon: 'fa-clock',
      perms: [
        { id: 'view_attendance', name: 'عرض' },
        { id: 'edit_attendance', name: 'تعديل' }
      ]
    },
    {
      label: 'المالية',
      icon: 'fa-money-bill-transfer',
      perms: [
        { id: 'view_payroll', name: 'الرواتب' },
        { id: 'calculate_payroll', name: 'حساب الراتب' },
        { id: 'view_loans', name: 'السلف' },
        { id: 'approve_loan', name: 'اعتماد السلف' }
      ]
    },
    {
      label: 'الأجازات',
      icon: 'fa-calendar-day',
      perms: [
        { id: 'view_leaves', name: 'عرض' },
        { id: 'approve_leave', name: 'اعتماد' }
      ]
    },
    {
      label: 'أخرى',
      icon: 'fa-ellipsis',
      perms: [
        { id: 'view_reports', name: 'تقارير' },
        { id: 'view_performance', name: 'الأداء' }
      ]
    }
  ]

  const togglePermission = (id) => {
    const current = [...customPermissions]
    const index = current.indexOf(id)
    if (index > -1) current.splice(index, 1)
    else current.push(id)
    setValue('customPermissions', current)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-4xl bg-[#111218]/95 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-3xl"
          >
            {/* Header Area */}
            <div className="relative p-8 border-b border-white/5 bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
              <div className="absolute top-0 right-1/4 w-32 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-white flex items-center gap-3">
                    <i className={`fas ${user ? 'fa-user-pen' : 'fa-user-plus'} text-indigo-400`}></i>
                    {user ? 'تعديل بروتوكول المستخدم' : 'إنشاء سجل مستخدم جديد'}
                  </h2>
                  <p className="text-gray-400 mt-1 font-medium italic">Protocol Unit: {user ? user.username : 'NEW_ENTRY'}</p>
                </div>
                <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10 text-gray-400 hover:text-white">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
              {/* Primary Identity Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    الهوية الأساسية
                  </h3>

                  <div className="space-y-4">
                    <div className="group">
                      <label className="text-xs font-bold text-gray-500 mb-2 block mr-2">الاسم الكامل الرسمي</label>
                      <input
                        {...register('name', { required: true })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-indigo-500 group-focus-within:bg-white/[0.08] transition-all"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="group">
                        <label className="text-xs font-bold text-gray-500 mb-2 block mr-2">اسم المستخدم</label>
                        <input
                          {...register('username', { required: true })}
                          disabled={!!user}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 transition-all font-mono"
                          placeholder="j.doe"
                        />
                      </div>
                      <div className="group">
                        <label className="text-xs font-bold text-gray-500 mb-2 block mr-2">رقم الموظف</label>
                        <input
                          {...register('employeeId')}
                          type="number"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                          placeholder="000"
                        />
                      </div>
                    </div>

                    <div className="group">
                      <label className="text-xs font-bold text-gray-500 mb-2 block mr-2">البريد الإلكتروني للعمل</label>
                      <input
                        {...register('email')}
                        type="email"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-indigo-500 transition-all"
                        placeholder="user@corp.id"
                      />
                    </div>
                  </div>
                </div>

                {/* Authentication & Access Section */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-purple-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                    إعدادات الوصول
                  </h3>

                  <div className="space-y-4">
                    <div className="group">
                      <label className="text-xs font-bold text-gray-500 mb-2 block mr-2">الرتبة النظامية</label>
                      <select
                        {...register('role', { required: true })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-purple-500 appearance-none cursor-pointer transition-all"
                      >
                        <option value="" className="bg-[#111218]">اختر الرتبة...</option>
                        <option value="super_admin" className="bg-[#111218]">مدير عام (SUPER_USER)</option>
                        <option value="admin" className="bg-[#111218]">مدير نظام (SYS_ADMIN)</option>
                        <option value="hr_manager" className="bg-[#111218]">مدير موارد (HR_SEC)</option>
                        <option value="finance_manager" className="bg-[#111218]">مدير مالي (FIN_SEC)</option>
                        <option value="department_manager" className="bg-[#111218]">مدير قسم (DEPT_OVR)</option>
                        <option value="employee" className="bg-[#111218]">موظف (STANDARD)</option>
                      </select>
                    </div>

                    <div className="group">
                      <label className="text-xs font-bold text-gray-500 mb-2 block mr-2">القسم الوظيفي</label>
                      <input
                        {...register('department')}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-purple-500 transition-all font-medium"
                        placeholder="Operations / Tech / HR"
                      />
                    </div>

                    <div className="group relative">
                      <label className="text-xs font-bold text-gray-500 mb-2 block mr-2">
                        {user ? 'تحديث مفتاح التشفير (اختياري)' : 'مفتاح التشفير الصادر'}
                      </label>
                      <div className="relative">
                        <input
                          {...register('password', { required: !user })}
                          type={showPassword ? 'text' : 'password'}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-5 pl-12 text-white focus:outline-none focus:border-purple-500 font-mono tracking-widest"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                          <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                    </div>

                    {!user && (
                      <div className="group">
                        <label className="text-xs font-bold text-gray-500 mb-2 block mr-2">تأكيد مفتاح التشفير</label>
                        <input
                          {...register('confirmPassword', { required: true })}
                          type={showPassword ? 'text' : 'password'}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-purple-500 font-mono tracking-widest"
                          placeholder="••••••••"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Advanced Permission Protocol Matrix */}
              {selectedRole && selectedRole !== 'super_admin' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pt-8 border-t border-white/5 space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <i className="fas fa-microchip"></i>
                      مصفوفة الصلاحيات المتقدمة
                    </h3>
                    <span className="text-[10px] text-gray-500 font-mono italic">ACTIVE_PROTOCOL_OVERRIDE</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {permissionGroups.map((group, gi) => (
                      <div key={gi} className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                          <i className={`fas ${group.icon} text-amber-500/50`}></i>
                          <span className="font-bold text-white text-sm tracking-wide">{group.label}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {group.perms.map(p => {
                            const isActive = customPermissions.includes(p.id)
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => togglePermission(p.id)}
                                className={`flex items-center justify-center py-2 px-3 rounded-xl border text-[11px] font-bold transition-all ${isActive
                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                                    : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                                  }`}
                              >
                                {p.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </form>

            {/* Footer Actions */}
            <div className="p-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold transition-all"
              >
                إلغاء الأمر
              </button>
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={isLoading}
                className="px-10 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-lg shadow-indigo-500/10 flex items-center gap-3 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <i className="fas fa-save"></i>
                )}
                {user ? 'تحديث التشفير' : 'حفظ السجل'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default UserModal
