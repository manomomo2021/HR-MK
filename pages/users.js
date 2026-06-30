import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import UserModal from '../components/UserModal'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Users() {
  const { user, hasPermission, logActivity } = useAuth()
  const { language } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0
  })

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/users')
      const result = await res.json()

      if (result.success) {
        let loadedUsers = result.data

        // التحقق من وجود بيانات في localStorage للمزامنة لمرة واحدة
        const localData = localStorage.getItem('hr_system_users')
        if (loadedUsers.length === 0 && localData) {
          const parsedLocal = JSON.parse(localData)
          if (parsedLocal.length > 0) {
            toast.loading('مزامنة البيانات القديمة...', { id: 'sync' })
            for (const u of parsedLocal) {
              await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  username: u.username,
                  password: u.password || '123456', // كجحر مؤقت
                  name: u.name,
                  email: u.email,
                  role: u.role,
                  department: u.department,
                  employeeId: u.employeeId,
                  phone: u.phone,
                  customPermissions: u.customPermissions || []
                })
              })
            }
            toast.success('تمت المزامنة بنجاح', { id: 'sync' })
            // إعادة تحميل البيانات بعد المزامنة
            const finalRes = await fetch('/api/users')
            const finalResult = await finalRes.json()
            loadedUsers = finalResult.data
            // مسح البيانات من localStorage بعد المزامنة الناجحة
            localStorage.removeItem('hr_system_users')
          }
        }

        setUsers(loadedUsers)
        calculateStats(loadedUsers)
      } else {
        toast.error('خطأ في تحميل البيانات من الخادم')
      }
    } catch (error) {
      console.error('API Error:', error)
      toast.error('فشل الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    applyFilters()
  }, [users, searchQuery, roleFilter, statusFilter])

  const calculateStats = (data) => {
    setStats({
      total: data.length,
      active: data.filter(u => u.status === 'active').length,
      inactive: data.filter(u => u.status === 'inactive').length,
      admins: data.filter(u => ['admin', 'super_admin'].includes(u.role)).length
    })
  }

  const applyFilters = () => {
    let filtered = [...users]
    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    if (roleFilter) filtered = filtered.filter(u => u.role === roleFilter)
    if (statusFilter) filtered = filtered.filter(u => u.status === statusFilter)
    setFilteredUsers(filtered)
  }

  const handleAddUser = () => {
    setSelectedUser(null)
    setIsModalOpen(true)
  }

  const handleEditUser = (user) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const handleDeleteUser = async (userToDelete) => {
    if (userToDelete.id === user.id) return toast.error('لا يمكنك حذف حسابك الخاص')

    if (confirm(`هل أنت متأكد من حذف المستخدم "${userToDelete.name}"؟`)) {
      try {
        const res = await fetch(`/api/users?id=${userToDelete.id}`, { method: 'DELETE' })
        const result = await res.json()
        if (result.success) {
          toast.success('تم حذف المستخدم بنجاح')
          loadUsers()
          logActivity('user_delete', `تم حذف المستخدم: ${userToDelete.name}`)
        } else {
          toast.error('فشل حذف المستخدم')
        }
      } catch (error) {
        toast.error('حدث خطأ أثناء الحذف')
      }
    }
  }

  const handleToggleStatus = async (u) => {
    if (u.id === user.id) return toast.error('لا يمكنك تعطيل حسابك الخاص')

    const newStatus = u.status === 'active' ? 'inactive' : 'active'
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...u, status: newStatus })
      })
      const result = await res.json()
      if (result.success) {
        toast.success(`تم ${newStatus === 'active' ? 'تفعيل' : 'تعطيل'} المستخدم`)
        loadUsers()
        logActivity('user_status_change', `تم ${newStatus === 'active' ? 'تفعيل' : 'تعطيل'} المستخدم: ${u.name}`)
      }
    } catch (error) {
      toast.error('فشل تحديث الحالة')
    }
  }

  const handleSaveUser = async (userData) => {
    try {
      const method = selectedUser ? 'PUT' : 'POST'
      const payload = selectedUser ? { ...userData, id: selectedUser.id } : userData

      const res = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await res.json()

      if (result.success) {
        toast.success(selectedUser ? 'تم التحديث بنجاح' : 'تمت الإضافة بنجاح')
        setIsModalOpen(false)
        loadUsers()
        logActivity(selectedUser ? 'user_update' : 'user_add', `المستخدم: ${userData.name}`)
      } else {
        toast.error(result.error || 'فشل حفظ البيانات')
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ')
    }
  }

  const roleMap = {
    'super_admin': { text: ar('مدير عام', 'Super Admin'), color: '#a855f7', icon: 'fa-crown' },
    'admin': { text: ar('مدير نظام', 'Admin'), color: '#ef4444', icon: 'fa-user-shield' },
    'hr_manager': { text: ar('مدير موارد', 'HR Manager'), color: '#3b82f6', icon: 'fa-user-tie' },
    'finance_manager': { text: ar('مدير مالي', 'Finance Manager'), color: '#10b981', icon: 'fa-wallet' },
    'department_manager': { text: ar('مدير قسم', 'Dept. Manager'), color: '#f59e0b', icon: 'fa-sitemap' },
    'employee': { text: ar('موظف', 'Employee'), color: '#94a3b8', icon: 'fa-user' }
  }

  if (!hasPermission('view_users') && user?.role !== 'super_admin' && user?.role !== 'admin') {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="empty-state bg-white border border-surface-200 rounded-2xl shadow-sm my-12">
            <div className="empty-icon"><i className="fas fa-lock text-rose-500"></i></div>
            <h3 className="empty-title text-rose-600">الوصول مقيد</h3>
            <p className="empty-desc">ليس لديك الصلاحيات الكافية لعرض أو إدارة المستخدمين في النظام.</p>
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">

          {/* ── Page Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <h1 className="page-title">{ar('إدارة المستخدمين', 'User Management')}</h1>
              <p className="page-description">التحكم في مستخدمي النظام والصلاحيات والمستويات الأمنية</p>
            </div>
            {(hasPermission('add_user') || user?.role === 'admin' || user?.role === 'super_admin') && (
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={handleAddUser}
                className="btn btn-primary btn-md"
              >
                <i className="fas fa-plus text-sm"></i> إضافة بروتوكول مستخدم
              </motion.button>
            )}
          </motion.div>

          {/* ── Stats HUD ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              { label: 'إجمالي الحسابات', value: stats.total, icon: 'fa-users', color: 'bg-brand-50 text-brand-600' },
              { label: 'حسابات نشطة', value: stats.active, icon: 'fa-user-check', color: 'bg-emerald-50 text-emerald-600' },
              { label: 'حسابات معطلة', value: stats.inactive, icon: 'fa-user-slash', color: 'bg-rose-50 text-rose-600' },
              { label: 'المستوى الإداري', value: stats.admins, icon: 'fa-shield-halved', color: 'bg-violet-50 text-violet-600' }
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white border border-surface-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color.split(' ')[0]} ${stat.color.split(' ')[1]}`}>
                  <i className={`fas ${stat.icon} text-lg`}></i>
                </div>
                <div>
                  <p className="text-xl font-black text-surface-900 leading-none">{stat.value}</p>
                  <p className="text-xs font-bold text-surface-500 mt-1">{stat.label}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* ── Filters Bar ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-surface-200 p-5 rounded-2xl shadow-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="relative sm:col-span-2">
                <i className="fas fa-search absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none"></i>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم، اسم المستخدم، البريد..."
                  className="input pr-10 text-sm"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="select text-sm"
              >
                <option value="">جميع الرتب</option>
                {Object.entries(roleMap).map(([key, val]) => (
                  <option key={key} value={key}>{val.text}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="select text-sm flex-1"
                >
                  <option value="">كل الحالات</option>
                  <option value="active">نشط</option>
                  <option value="inactive">معطل</option>
                </select>
                {(searchQuery || roleFilter || statusFilter) && (
                  <button
                    onClick={() => { setSearchQuery(''); setRoleFilter(''); setStatusFilter(''); }}
                    className="btn btn-ghost btn-md px-3 text-danger border border-surface-200 bg-surface-50"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* ── User Cards Grid ── */}
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="w-10 h-10 border-4 border-surface-300 border-t-brand-600 rounded-full animate-spin"></div>
                <p className="text-surface-500 font-bold text-xs animate-pulse">جاري تحميل بيانات المستخدمين...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                {filteredUsers.map((u, i) => (
                  <motion.div
                    key={u.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="group relative overflow-hidden p-5 rounded-2xl bg-white border border-surface-200 hover:border-brand-200 transition-all duration-200 flex flex-col shadow-sm hover:shadow-md"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0"
                          style={{
                            backgroundColor: `${roleMap[u.role]?.color}15`,
                            borderColor: `${roleMap[u.role]?.color}30`
                          }}
                        >
                          <i className={`fas ${roleMap[u.role]?.icon || 'fa-user'} text-lg`} style={{ color: roleMap[u.role]?.color }}></i>
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-surface-900 group-hover:text-brand-600 transition-colors">{u.name}</h3>
                          <p className="text-xs text-surface-400 font-medium font-mono mt-0.5">@{u.username}</p>
                        </div>
                      </div>
                      <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {u.status === 'active' ? 'نشط' : 'معطل'}
                      </span>
                    </div>

                    {/* Meta info details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 bg-surface-50 p-2.5 rounded-lg border border-surface-200">
                        <i className="fas fa-envelope text-brand-600 text-xs w-4 text-center"></i>
                        <span className="text-xs text-surface-600 truncate font-medium">{u.email || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-surface-50 p-2.5 rounded-lg border border-surface-200">
                        <i className="fas fa-shield-halved text-violet-600 text-xs w-4 text-center"></i>
                        <span className="text-xs font-bold" style={{ color: roleMap[u.role]?.color }}>
                          {roleMap[u.role]?.text}
                        </span>
                      </div>
                      {u.department && (
                        <div className="flex items-center gap-2 bg-surface-50 p-2.5 rounded-lg border border-surface-200">
                          <i className="fas fa-sitemap text-amber-600 text-xs w-4 text-center"></i>
                          <span className="text-xs text-surface-600 font-bold">{u.department}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions footer */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100 mt-auto">
                      <button
                        onClick={() => handleEditUser(u)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                        style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}
                        onMouseEnter={e => { e.currentTarget.style.background='#4f46e5'; e.currentTarget.style.color='white' }}
                        onMouseLeave={e => { e.currentTarget.style.background='#eef2ff'; e.currentTarget.style.color='#4f46e5' }}
                        title="تعديل المستخدم وصلاحياته"
                      >
                        <i className="fas fa-pen text-xs"></i>
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                          u.status === 'active'
                            ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white'
                        }`}
                        title={u.status === 'active' ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                      >
                        <i className={`fas ${u.status === 'active' ? 'fa-user-slash' : 'fa-user-check'} text-xs`}></i>
                      </button>
                      {user?.role === 'super_admin' && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                          style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3' }}
                          onMouseEnter={e => { e.currentTarget.style.background='#e11d48'; e.currentTarget.style.color='white' }}
                          onMouseLeave={e => { e.currentTarget.style.background='#fff1f2'; e.currentTarget.style.color='#e11d48' }}
                          title="حذف نهائي"
                        >
                          <i className="fas fa-trash text-xs"></i>
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="empty-state bg-white border border-surface-200 rounded-2xl shadow-sm">
                <div className="empty-icon"><i className="fas fa-user-secret text-surface-400"></i></div>
                <h3 className="empty-title">لا توجد سجلات مستخدمين</h3>
                <p className="empty-desc">جرب تعديل معايير البحث أو إضافة بروتوكول مستخدم جديد.</p>
              </div>
            )}
          </AnimatePresence>

        </div>

        <UserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          user={selectedUser}
          onSave={handleSaveUser}
        />
      </Layout>
    </ProtectedRoute>
  )
}
