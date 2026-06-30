import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // تحميل المستخدم من Local Storage عند بدء التطبيق
  useEffect(() => {
    const loadUser = () => {
      try {
        const sessionData = localStorage.getItem('hr_system_current_session')
        if (sessionData) {
          const session = JSON.parse(sessionData)
          if (isValidSession(session)) {
            setUser(session.user)
          } else {
            localStorage.removeItem('hr_system_current_session')
          }
        }
      } catch (error) {
        console.error('خطأ في تحميل بيانات المستخدم:', error)
        localStorage.removeItem('hr_system_current_session')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  // التحقق من صحة الجلسة
  const isValidSession = (session) => {
    if (!session || !session.user || !session.expiresAt) {
      return false
    }
    const now = new Date().getTime()
    return now < session.expiresAt
  }

  // تسجيل الدخول
  const login = async (username, password) => {
    try {
      if (!username || !password) {
        throw new Error('يرجى إدخال اسم المستخدم وكلمة المرور')
      }

      // الاتصال بـ API تسجيل الدخول
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      const text = await response.text()
      let result;

      try {
        result = JSON.parse(text)
      } catch (e) {
        console.error('فشل في قراءة استجابة الخادم:', text)
        const errorSnippet = text.substring(0, 100).replace(/[<>]/g, '')
        throw new Error(`خطأ في الاتصال بالخادم: ${errorSnippet}...`)
      }

      if (!result.success) {
        throw new Error(result.error || 'اسم المستخدم أو كلمة المرور غير صحيحة')
      }

      const foundUser = result.user

      // إنشاء جلسة جديدة
      const session = {
        user: {
          id: foundUser.id,
          username: foundUser.username,
          name: foundUser.name,
          role: foundUser.role,
          email: foundUser.email,
          department: foundUser.department,
          employeeId: foundUser.employeeId,
          customPermissions: foundUser.customPermissions
        },
        loginTime: new Date().toISOString(),
        expiresAt: new Date().getTime() + (24 * 60 * 60 * 1000) // 24 ساعة
      }

      // حفظ الجلسة
      localStorage.setItem('hr_system_current_session', JSON.stringify(session))
      setUser(session.user)

      // تسجيل النشاط
      logActivity('login', 'تسجيل دخول ناجح (DB Auth)')

      toast.success(`مرحباً ${session.user.name}`)
      router.push('/dashboard')

      return { success: true, user: session.user }

    } catch (error) {
      toast.error(error.message)
      return { success: false, error: error.message }
    }
  }

  // تسجيل الخروج
  const logout = () => {
    try {
      // تسجيل النشاط
      logActivity('logout', 'تسجيل خروج')

      // مسح الجلسة
      localStorage.removeItem('hr_system_current_session')
      setUser(null)

      toast.success('تم تسجيل الخروج بنجاح')
      router.push('/')

    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error)
      toast.error('حدث خطأ أثناء تسجيل الخروج')
    }
  }

  // التحقق من الصلاحيات
  const hasPermission = (permission) => {
    if (!user) return false

    // المدير العام يملك جميع الصلاحيات
    if (user.role === 'super_admin') return true

    // التحقق من الصلاحيات المخصصة للمستخدم
    if (user.customPermissions && user.customPermissions.includes(permission)) {
      return true
    }

    // تحديد الصلاحيات حسب الدور
    const permissions = {
      'admin': [
        // إدارة الموظفين
        'view_employees', 'add_employee', 'edit_employee', 'delete_employee',
        // إدارة الحضور
        'view_attendance', 'edit_attendance', 'sync_attendance',
        // إدارة الأجازات
        'view_leaves', 'add_leave', 'edit_leave', 'delete_leave', 'approve_leave',
        // إدارة الأجهزة
        'view_devices', 'add_device', 'edit_device', 'delete_device', 'manage_devices',
        // التقارير
        'view_reports', 'export_reports', 'print_reports',
        // الإعدادات
        'view_settings', 'edit_settings',
        // إدارة السلف
        'view_loans', 'add_loan', 'edit_loan', 'delete_loan', 'approve_loan',
        // إدارة الرواتب
        'view_payroll', 'calculate_payroll', 'edit_payroll', 'approve_payroll',
        // تقييم الأداء
        'view_performance', 'add_performance', 'edit_performance',
        // التدريب
        'view_training', 'add_training', 'edit_training', 'delete_training'
      ],
      'hr_manager': [
        // إدارة الموظفين
        'view_employees', 'add_employee', 'edit_employee',
        // إدارة الحضور
        'view_attendance', 'edit_attendance', 'sync_attendance',
        // إدارة الأجازات
        'view_leaves', 'add_leave', 'edit_leave', 'approve_leave',
        // إدارة الأجهزة
        'view_devices', 'manage_devices',
        // التقارير
        'view_reports', 'export_reports',
        // إدارة السلف
        'view_loans', 'add_loan', 'approve_loan',
        // إدارة الرواتب
        'view_payroll', 'calculate_payroll',
        // تقييم الأداء
        'view_performance', 'add_performance', 'edit_performance',
        // التدريب
        'view_training', 'add_training', 'edit_training'
      ],
      'finance_manager': [
        // إدارة الرواتب
        'view_payroll', 'calculate_payroll', 'edit_payroll', 'approve_payroll',
        // إدارة السلف
        'view_loans', 'add_loan', 'edit_loan', 'approve_loan',
        // التقارير المالية
        'view_reports', 'export_reports',
        // عرض الموظفين
        'view_employees'
      ],
      'department_manager': [
        // عرض موظفي القسم
        'view_department_employees',
        // إدارة أجازات القسم
        'view_department_leaves', 'approve_department_leave',
        // تقييم أداء موظفي القسم
        'view_department_performance', 'add_department_performance',
        // التدريب لموظفي القسم
        'view_department_training', 'request_department_training'
      ],
      'employee': [
        // البيانات الشخصية
        'view_own_data', 'edit_own_basic_data',
        // الحضور الشخصي
        'view_own_attendance',
        // الأجازات الشخصية
        'view_own_leaves', 'request_leave',
        // السلف الشخصية
        'view_own_loans', 'request_loan',
        // الراتب الشخصي
        'view_own_payroll',
        // التقييم الشخصي
        'view_own_performance',
        // التدريب الشخصي
        'view_own_training', 'request_training'
      ]
    }

    const userPermissions = permissions[user.role] || []
    return userPermissions.includes(permission)
  }

  // التحقق من صلاحية الوصول للقسم
  const hasAccessToDepartment = (department) => {
    if (!user) return false

    // المدير العام والمدير يمكنهم الوصول لجميع الأقسام
    if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'hr_manager') {
      return true
    }

    // مدير القسم يمكنه الوصول لقسمه فقط
    if (user.role === 'department_manager') {
      return user.department === department
    }

    // الموظف يمكنه الوصول لقسمه فقط
    if (user.role === 'employee') {
      return user.department === department
    }

    return false
  }

  // التحقق من صلاحية الوصول لبيانات موظف معين
  const hasAccessToEmployee = (employeeId) => {
    if (!user) return false

    // المدير العام والمدير ومدير الموارد البشرية يمكنهم الوصول لجميع الموظفين
    if (['super_admin', 'admin', 'hr_manager'].includes(user.role)) {
      return true
    }

    // الموظف يمكنه الوصول لبياناته فقط
    if (user.role === 'employee') {
      return user.employeeId === employeeId
    }

    return false
  }

  // تسجيل النشاطات
  const logActivity = (action, description) => {
    try {
      const activitiesData = localStorage.getItem('hr_system_activities')
      const activities = activitiesData ? JSON.parse(activitiesData) : []

      const activity = {
        id: Date.now(),
        userId: user ? user.id : null,
        username: user ? user.username : 'غير معروف',
        action: action,
        description: description,
        timestamp: new Date().toISOString(),
        ip: 'localhost',
        userAgent: navigator.userAgent
      }

      activities.push(activity)

      // الاحتفاظ بآخر 1000 نشاط فقط
      if (activities.length > 1000) {
        activities.splice(0, activities.length - 1000)
      }

      localStorage.setItem('hr_system_activities', JSON.stringify(activities))
    } catch (error) {
      console.error('خطأ في تسجيل النشاط:', error)
    }
  }

  // تغيير كلمة المرور
  const changePassword = async (oldPassword, newPassword) => {
    try {
      if (!user) {
        throw new Error('يجب تسجيل الدخول أولاً')
      }

      // الاتصال بـ API تغيير كلمة المرور
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          oldPassword,
          newPassword
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'فشل في تغيير كلمة المرور')
      }

      logActivity('password_change', 'تم تغيير كلمة المرور (DB Sync)')
      toast.success('تم تغيير كلمة المرور بنجاح')

      return { success: true }

    } catch (error) {
      toast.error(error.message)
      return { success: false, error: error.message }
    }
  }

  const value = {
    user,
    loading,
    login,
    logout,
    hasPermission,
    hasAccessToDepartment,
    hasAccessToEmployee,
    logActivity,
    changePassword
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
