import { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import LeaveModal from '../components/LeaveModal'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function LeaveRegistration() {
  const { employees, leaves, loading, addLeave, updateLeave, updateLeaveStatus, deleteLeave } = useData()
  const { logActivity } = useAuth()
  const { language } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e
  const [filteredLeaves, setFilteredLeaves] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState(null)
  const [stats, setStats] = useState({ totalRequests: 0, pendingRequests: 0, approvedRequests: 0, rejectedRequests: 0 })

  useEffect(() => { if (!loading) { applyFilters(); calculateStats() } }, [loading, leaves, searchQuery, statusFilter, typeFilter])

  const applyFilters = () => {
    let filtered = [...leaves]
    if (searchQuery) filtered = filtered.filter(leave => leave.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || leave.reason?.toLowerCase().includes(searchQuery.toLowerCase()))
    if (statusFilter) filtered = filtered.filter(leave => leave.status === statusFilter)
    if (typeFilter) filtered = filtered.filter(leave => leave.type === typeFilter)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    setFilteredLeaves(filtered)
  }

  const calculateStats = () => {
    setStats({
      totalRequests: leaves.length,
      pendingRequests: leaves.filter(l => l.status === 'pending').length,
      approvedRequests: leaves.filter(l => l.status === 'approved').length,
      rejectedRequests: leaves.filter(l => l.status === 'rejected').length
    })
  }

  const handleAddLeave = () => { setSelectedLeave(null); setIsModalOpen(true) }
  const handleEditLeave = (leave) => { setSelectedLeave(leave); setIsModalOpen(true) }

  const handleDeleteLeave = async (leave) => {
    if (confirm(ar('أكيد عايز تمسح الطلب ده من السجلات؟ الإجراء ده ملوش رجعة!', 'Are you sure you want to permanently delete this request?'))) {
      const res = await deleteLeave(leave.id)
      if (res.success) { toast.success(ar('تم مسح الطلب بنجاح', 'Request deleted')); logActivity('leave_delete', ar(`مسح إجازة للموظف: ${leave.employeeName}`, `Deleted leave for: ${leave.employeeName}`)) }
    }
  }

  const handleSaveLeave = async (leaveData) => {
    if (selectedLeave) {
      const res = await updateLeave(selectedLeave.id, leaveData)
      if (res.success) { 
        toast.success(ar('تم تعديل الطلب بنجاح', 'Request updated')); 
        logActivity('leave_update', ar(`تعديل إجازة: ${leaveData.employeeName}`, `Leave updated: ${leaveData.employeeName}`)); 
        setIsModalOpen(false) 
      } else {
        toast.error(res.error || ar('حدث خطأ أثناء تعديل الطلب', 'Error updating request'))
      }
    } else {
      const res = await addLeave(leaveData)
      if (res.success) { 
        toast.success(ar('تم تقديم الطلب بنجاح 🚀', 'Request submitted 🚀')); 
        logActivity('leave_add', ar(`طلب إجازة جديد: ${leaveData.employeeName}`, `New leave: ${leaveData.employeeName}`)); 
        setIsModalOpen(false) 
      } else {
        toast.error(res.error || ar('حدث خطأ أثناء تقديم الطلب', 'Error submitting request'))
      }
    }
  }

  const handleStatusChange = async (leave, newStatus) => {
    const res = await updateLeaveStatus(leave.id, newStatus)
    if (res.success) {
      const msg = newStatus === 'approved' ? ar('تمت الموافقة على الطلب ✅', 'Request approved ✅') : ar('تم رفض الطلب ❌', 'Request rejected ❌')
      toast.success(msg)
      logActivity('leave_status_change', ar(`حالة الإجازة اتغيرت لـ ${getStatusText(newStatus)}: ${leave.employeeName}`, `Leave status changed to ${getStatusText(newStatus)}: ${leave.employeeName}`))
    }
  }

  const getStatusStyle = (status) => ({ 'pending': 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm', 'approved': 'bg-teal-50 text-teal-600 border-teal-200 shadow-sm', 'rejected': 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm' }[status] || 'bg-gray-50 text-gray-500 border-gray-200')
  const getStatusIcon = (status) => ({ 'pending': 'fa-hourglass-half animate-pulse', 'approved': 'fa-check-circle', 'rejected': 'fa-times-circle' }[status] || 'fa-info-circle')
  const getStatusText = (status) => ({ 'pending': ar('قيد المراجعة', 'Pending'), 'approved': ar('مقبول', 'Approved'), 'rejected': ar('مرفوض', 'Rejected') }[status] || status)
  const getTypeInfo = (type) => ({ 'annual': { text: ar('سنوية', 'Annual'), icon: 'fa-umbrella-beach', color: 'text-cyan-600' }, 'casual': { text: ar('عارضة', 'Casual'), icon: 'fa-bolt', color: 'text-amber-600' }, 'sick': { text: ar('مرضية', 'Sick'), icon: 'fa-hand-holding-medical', color: 'text-rose-600' }, 'emergency': { text: ar('طارئة', 'Emergency'), icon: 'fa-exclamation-triangle', color: 'text-orange-600' } }[type] || { text: type, icon: 'fa-file', color: 'text-gray-500' })
  const clearFilters = () => { setSearchQuery(''); setStatusFilter(''); setTypeFilter('') }

  if (loading) return <ProtectedRoute><Layout><div className="flex justify-center items-center h-screen"><div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin"></div></div></Layout></ProtectedRoute>

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="page-title">{ar('طلبات الإجازات', 'Leave Requests')}</h1>
              <p className="page-description">{ar('تسجيل ومتابعة طلبات الإجازات وحالتها واعتمادها', 'Track and manage leave requests and approvals')}</p>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleAddLeave} className="btn btn-primary btn-md">
              <i className="fas fa-plus text-sm"></i> {ar('تقديم طلب جديد', 'New Request')}
            </motion.button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: ar('إجمالي الطلبات', 'Total Requests'), value: stats.totalRequests, icon: 'fa-layer-group', color: 'bg-brand-50 text-brand-600' },
              { label: ar('طلبات قيد المراجعة', 'Pending'), value: stats.pendingRequests, icon: 'fa-hourglass-half', color: 'bg-amber-50 text-amber-600' },
              { label: ar('طلبات مقبولة', 'Approved'), value: stats.approvedRequests, icon: 'fa-check-double', color: 'bg-emerald-50 text-emerald-600' },
              { label: ar('طلبات مرفوضة', 'Rejected'), value: stats.rejectedRequests, icon: 'fa-ban', color: 'bg-rose-50 text-rose-600' }
            ].map((s, idx) => (
              <div key={idx} className="bg-white border border-surface-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color.split(' ')[0]} ${s.color.split(' ')[1]}`}>
                  <i className={`fas ${s.icon} text-lg`}></i>
                </div>
                <div>
                  <p className="text-xl font-black text-surface-900 leading-none">{s.value}</p>
                  <p className="text-xs font-bold text-surface-500 mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }} className="bg-white border border-surface-200 p-5 rounded-2xl shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative">
                <i className="fas fa-search absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none"></i>
                <input type="text" placeholder={ar('ابحث باسم الموظف أو السبب...', 'Search by employee name or reason...')}
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input pr-10 text-sm" />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select text-sm">
                <option value="">{ar('كل الحالات', 'All Status')}</option>
                <option value="pending">{ar('قيد المراجعة', 'Pending')}</option>
                <option value="approved">{ar('مقبول', 'Approved')}</option>
                <option value="rejected">{ar('مرفوض', 'Rejected')}</option>
              </select>
              <div className="flex gap-2">
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="select text-sm flex-1">
                  <option value="">{ar('كل الأنواع', 'All Types')}</option>
                  <option value="annual">{ar('سنوية', 'Annual')}</option>
                  <option value="casual">{ar('عارضة', 'Casual')}</option>
                  <option value="sick">{ar('مرضية', 'Sick')}</option>
                  <option value="emergency">{ar('طارئة', 'Emergency')}</option>
                </select>
                {(searchQuery || statusFilter || typeFilter) && (
                  <button onClick={clearFilters} className="btn btn-ghost btn-md px-3 text-danger border border-surface-200 bg-surface-50">
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-sm font-black text-surface-700">{ar('سجل الطلبات', 'Request Records')}</span>
              <span className="badge badge-neutral">{ar(`${filteredLeaves.length} طلب`, `${filteredLeaves.length} requests`)}</span>
            </div>

            {filteredLeaves.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredLeaves.map((leave, i) => {
                  const info = getTypeInfo(leave.leave_type)
                  return (
                    <motion.div key={leave.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="group bg-white border border-surface-200 hover:border-brand-200 rounded-2xl p-5 transition-all duration-200 relative overflow-hidden flex flex-col h-full shadow-sm hover:shadow-md">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm border flex-shrink-0 ${info.color.replace('text-', 'bg-').replace('-600', '-50')} ${info.color}`}>
                            <i className={`fas ${info.icon} text-lg`}></i>
                          </div>
                          <div>
                            <h4 className="text-surface-900 font-black text-sm">{leave.employeeName}</h4>
                            <p className="text-surface-400 text-xs mt-0.5">{ar('إجازة', 'Leave')} {info.text}</p>
                          </div>
                        </div>
                        <span className={`badge ${leave.status === 'approved' ? 'badge-success' : leave.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                          <i className={`fas ${getStatusIcon(leave.status)} text-[10px]`}></i> {getStatusText(leave.status)}
                        </span>
                      </div>

                      <div className="bg-surface-50 rounded-xl p-4 mb-4 border border-surface-200">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-surface-200 text-center">
                          <div className="flex-1">
                            <p className="text-surface-400 text-[10px] font-bold uppercase tracking-wider mb-1">{ar('من تاريخ', 'From')}</p>
                            <p className="text-surface-800 font-mono font-black text-xs">{leave.startDate}</p>
                          </div>
                          <div className="flex-1 px-3 border-x border-surface-200">
                            <p className="text-brand-600 font-black text-base">{leave.days} {ar('يوم', 'days')}</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-surface-400 text-[10px] font-bold uppercase tracking-wider mb-1">{ar('إلى تاريخ', 'To')}</p>
                            <p className="text-surface-800 font-mono font-black text-xs">{leave.endDate}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-surface-400 text-[10px] font-bold uppercase tracking-wider mb-1">{ar('السبب / الملاحظات:', 'Reason / Notes:')}</p>
                          <p className="text-surface-600 text-xs leading-relaxed line-clamp-2" title={leave.reason}>{leave.reason || ar('لا توجد ملاحظات مكتوبة', 'No notes provided')}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 mt-auto">
                        {leave.status === 'pending' && (
                          <>
                            <button onClick={() => handleStatusChange(leave, 'approved')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white">
                              <i className="fas fa-check mr-1 text-[10px]"></i> {ar('موافقة', 'Approve')}
                            </button>
                            <button onClick={() => handleStatusChange(leave, 'rejected')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white">
                              <i className="fas fa-times mr-1 text-[10px]"></i> {ar('رفض', 'Reject')}
                            </button>
                            <span className="w-px h-5 bg-surface-200 mx-1"></span>
                          </>
                        )}
                        <button onClick={() => handleEditLeave(leave)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                          style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#4f46e5'; e.currentTarget.style.color = 'white' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.color = '#4f46e5' }}
                          title={ar('تعديل', 'Edit')}>
                          <i className="fas fa-pen text-xs"></i>
                        </button>
                        <button onClick={() => handleDeleteLeave(leave)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                          style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#e11d48'; e.currentTarget.style.color = 'white' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#e11d48' }}
                          title={ar('حذف', 'Delete')}>
                          <i className="fas fa-trash text-xs"></i>
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state bg-white border border-surface-200 rounded-2xl shadow-sm">
                <div className="empty-icon"><i className="fas fa-file-signature text-surface-400"></i></div>
                <h3 className="empty-title">{ar('لا توجد طلبات إجازة', 'No leave requests')}</h3>
                <p className="empty-desc mb-6">{searchQuery || statusFilter || typeFilter ? ar('لا توجد نتائج مطابقة للفلاتر', 'No matching results') : ar('لم يتم تسجيل أي طلبات إجازة حالياً', 'No leave requests recorded yet')}</p>
                {!searchQuery && !statusFilter && !typeFilter && (
                  <button onClick={handleAddLeave} className="btn btn-primary btn-md">
                    <i className="fas fa-plus"></i> {ar('تقديم طلب جديد', 'New Request')}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
        <LeaveModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} leave={selectedLeave} employees={employees} onSave={handleSaveLeave} />
      </Layout>
    </ProtectedRoute>
  )
}
