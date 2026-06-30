import { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import LoanModal from '../components/LoanModal'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { formatCurrency, CURRENCIES } from '../utils/currency'
import database from '../utils/database'

export default function Loans() {
  const { employees, loading } = useData()
  const { user, hasPermission, logActivity } = useAuth()
  const { language } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e
  const [loans, setLoans] = useState([])
  const [filteredLoans, setFilteredLoans] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [stats, setStats] = useState({ totalLoans: 0, pendingLoans: 0, approvedLoans: 0, rejectedLoans: 0, totalAmount: 0, paidAmount: 0, remainingAmount: 0 })

  useEffect(() => { loadLoans() }, [])
  useEffect(() => { if (loans.length > 0) { applyFilters(); calculateStats() } }, [loans, searchQuery, statusFilter, typeFilter])

  const loadLoans = async () => { try { setLoans(await database.getLoans()) } catch (e) { toast.error(ar('حدث خطأ في تحميل السلف', 'Error loading loans')) } }
  const saveLoans = async (loansData) => { setLoans(loansData); for (const l of loansData) { try { await database.saveLoan(l) } catch (e) {} } }

  const applyFilters = () => {
    let filtered = [...loans]
    if (user?.role === 'employee') filtered = filtered.filter(loan => loan.employeeId === user.employeeId)
    if (searchQuery) filtered = filtered.filter(loan => loan.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || loan.purpose.toLowerCase().includes(searchQuery.toLowerCase()))
    if (statusFilter) filtered = filtered.filter(loan => loan.status === statusFilter)
    if (typeFilter) filtered = filtered.filter(loan => loan.type === typeFilter)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    setFilteredLoans(filtered)
  }

  const calculateStats = () => {
    const totalAmount = loans.reduce((sum, l) => sum + l.amount, 0)
    const paidAmount = loans.reduce((sum, l) => sum + (l.paidAmount || 0), 0)
    setStats({ totalLoans: loans.length, pendingLoans: loans.filter(l => l.status === 'pending').length, approvedLoans: loans.filter(l => l.status === 'approved').length, rejectedLoans: loans.filter(l => l.status === 'rejected').length, totalAmount, paidAmount, remainingAmount: totalAmount - paidAmount })
  }

  const getNextLoanId = () => loans.reduce((max, l) => Math.max(max, l.id || 0), 0) + 1
  const handleAddLoan = () => { setSelectedLoan(null); setIsModalOpen(true) }
  const handleEditLoan = (loan) => { setSelectedLoan(loan); setIsModalOpen(true) }

  const handleDeleteLoan = (loan) => {
    if (confirm(ar('هل أنت متأكد من حذف طلب السلفة؟', 'Are you sure you want to delete this loan request?'))) {
      saveLoans(loans.filter(l => l.id !== loan.id))
      toast.success(ar('تم حذف طلب السلفة بنجاح', 'Loan deleted'))
      logActivity('loan_delete', ar(`تم حذف طلب سلفة: ${loan.employeeName}`, `Loan deleted: ${loan.employeeName}`))
    }
  }

  const handleExportLoans = () => {
    try {
      const loadingToast = toast.loading(ar('جاري تصدير بيانات السلف...', 'Exporting loan data...'))
      const csvContent = '\ufeff' +
        `${ar('تقرير السلف الشامل', 'Loan Report')}\n` +
        `${ar('تاريخ الإنشاء: ', 'Generated: ')}${new Date().toLocaleString('en-GB')}\n\n` +
        ['رقم السلفة', 'اسم الموظف', 'النوع', 'المبلغ', 'المسدد', 'المتبقي', 'الحالة', 'التاريخ'].map(h => ar(h, h)).join(',') + '\n' +
        filteredLoans.map(l =>
          [l.id, l.employeeName, getTypeText(l.type), l.amount, l.paidAmount || 0, (l.amount - (l.paidAmount || 0)).toFixed(2), getStatusText(l.status), l.requestDate ? new Date(l.requestDate).toLocaleDateString('en-GB') : '']
            .map(v => `"${v}"`).join(',')
        ).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `loans_${new Date().toISOString().split('T')[0]}.csv`; link.click()
      toast.dismiss(loadingToast); toast.success(ar(`تم تصدير ${filteredLoans.length} سلفة بنجاح`, `Exported ${filteredLoans.length} loans`))
    } catch (e) { toast.error(ar('حدث خطأ أثناء تصدير البيانات', 'Export error')) }
  }

  const handleSaveLoan = async (loanData) => {
    try {
      if (selectedLoan) {
        saveLoans(loans.map(l => l.id === selectedLoan.id ? { ...l, ...loanData, updatedAt: new Date().toISOString() } : l))
        toast.success(ar('تم تحديث طلب السلفة بنجاح', 'Loan updated'))
      } else {
        saveLoans([...loans, { id: getNextLoanId(), ...loanData, status: 'pending', paidAmount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }])
        toast.success(ar('تم تسجيل طلب السلفة بنجاح', 'Loan added'))
      }
      setIsModalOpen(false)
      logActivity(selectedLoan ? 'loan_update' : 'loan_add', ar(`سلفة: ${loanData.employeeName}`, `Loan: ${loanData.employeeName}`))
    } catch (e) { toast.error(ar('حدث خطأ أثناء حفظ طلب السلفة', 'Error saving loan')) }
  }

  const handleStatusChange = (loan, newStatus) => {
    saveLoans(loans.map(l => l.id === loan.id ? { ...l, status: newStatus, updatedAt: new Date().toISOString() } : l))
    toast.success(ar(`تم ${getStatusText(newStatus)} طلب السلفة`, `Loan ${getStatusText(newStatus)}`))
    logActivity('loan_status_change', ar(`تغيير حالة سلفة: ${loan.employeeName}`, `Loan status changed: ${loan.employeeName}`))
  }

  const handlePayment = (loan, paymentAmount) => {
    const newPaidAmount = (loan.paidAmount || 0) + paymentAmount
    saveLoans(loans.map(l => l.id === loan.id ? { ...l, paidAmount: newPaidAmount, status: newPaidAmount >= l.amount ? 'completed' : l.status, updatedAt: new Date().toISOString() } : l))
    toast.success(ar('تم تسجيل الدفعة بنجاح', 'Payment recorded'))
  }

  const getStatusText = (status) => ({ 'pending': ar('في الانتظار', 'Pending'), 'approved': ar('معتمد', 'Approved'), 'rejected': ar('مرفوض', 'Rejected'), 'completed': ar('مكتمل', 'Completed') }[status] || status)
  const getTypeText = (type) => ({ 'salary_advance': ar('سلفة راتب', 'Salary Advance'), 'emergency': ar('سلفة طارئة', 'Emergency'), 'personal': ar('سلفة شخصية', 'Personal'), 'medical': ar('سلفة طبية', 'Medical') }[type] || type)

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="page-title">{ar('السلف والقروض', 'Loans & Advances')}</h1>
              <p className="page-description">{ar('تتبع وإدارة القروض وسلف الموظفين وتاريخ سدادها', 'Track employee loans, advances, and payment history')}</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {(hasPermission('add_loan') || hasPermission('request_loan')) && (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleAddLoan} className="btn btn-primary btn-md">
                  <i className="fas fa-plus-circle text-sm"></i> {ar('طلب سلفة جديد', 'New Loan')}
                </motion.button>
              )}
              <div className="flex bg-white border border-surface-200 rounded-xl p-1 gap-1 shadow-sm">
                <button onClick={loadLoans} className="w-9 h-9 rounded-lg flex items-center justify-center text-surface-500 hover:bg-surface-50 hover:text-surface-900 transition-colors" title={ar('مزامنة', 'Sync')}><i className="fas fa-sync-alt text-xs"></i></button>
                <button onClick={handleExportLoans} className="w-9 h-9 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors" title={ar('تصدير Excel', 'Export Excel')}><i className="fas fa-file-export text-xs"></i></button>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: ar('إجمالي الطلبات', 'Total Requests'), val: stats.totalLoans, icon: 'fa-hand-holding-usd', color: 'bg-brand-50 text-brand-600 border-brand-100' },
              { label: ar('في الانتظار', 'Pending'), val: stats.pendingLoans, icon: 'fa-clock', color: 'bg-amber-50 text-amber-600 border-amber-100' },
              { label: ar('طلبات معتمدة', 'Approved'), val: stats.approvedLoans, icon: 'fa-check-double', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
              { label: ar('إجمالي المبالغ', 'Total Amount'), val: formatCurrency(stats.totalAmount, 'EGP'), icon: 'fa-money-bill-wave', color: 'bg-rose-50 text-rose-600 border-rose-100' }
            ].map((item, i) => (
              <div key={i} className="bg-white border border-surface-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color.split(' ')[0]} ${item.color.split(' ')[1]}`}>
                  <i className={`fas ${item.icon} text-lg`}></i>
                </div>
                <div><p className="text-xl font-black text-surface-900 leading-none">{item.val}</p><p className="text-xs font-bold text-surface-500 mt-1">{item.label}</p></div>
              </div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: ar('المبلغ المسدد', 'Paid Amount'), val: formatCurrency(stats.paidAmount, 'EGP'), sub: ar(`نسبة السداد: ${stats.totalAmount > 0 ? ((stats.paidAmount / stats.totalAmount) * 100).toFixed(1) : 0}%`, `Repayment: ${stats.totalAmount > 0 ? ((stats.paidAmount / stats.totalAmount) * 100).toFixed(1) : 0}%`), color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
              { label: ar('المبلغ المتبقي', 'Remaining'), val: formatCurrency(stats.remainingAmount, 'EGP'), sub: ar(`نسبة المتبقي: ${stats.totalAmount > 0 ? ((stats.remainingAmount / stats.totalAmount) * 100).toFixed(1) : 0}%`, `Remaining: ${stats.totalAmount > 0 ? ((stats.remainingAmount / stats.totalAmount) * 100).toFixed(1) : 0}%`), color: 'text-rose-600 bg-rose-50 border-rose-100' },
              { label: ar('متوسط القرض', 'Average Loan'), val: formatCurrency(stats.totalLoans > 0 ? stats.totalAmount / stats.totalLoans : 0, 'EGP'), sub: ar('لكل سجل نشط', 'Per active record'), color: 'text-brand-600 bg-brand-50 border-brand-100' }
            ].map((s, i) => (
              <div key={i} className="bg-white border border-surface-200 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
                <div><p className="text-xs font-bold text-surface-500 mb-1">{s.label}</p><h4 className="text-lg font-black text-surface-900">{s.val}</h4><p className="text-[10px] font-bold text-surface-400 mt-1.5">{s.sub}</p></div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color.split(' ')[1]} ${s.color.split(' ')[0]}`}><i className="fas fa-chart-line text-sm"></i></div>
              </div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white border border-surface-200 p-5 rounded-2xl shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="relative sm:col-span-2">
                <i className="fas fa-search absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none"></i>
                <input type="text" placeholder={ar('ابحث باسم الموظف أو الغرض...', 'Search by name or purpose...')} className="input pr-10 text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select text-sm">
                <option value="">{ar('جميع الحالات', 'All Status')}</option>
                <option value="pending">{ar('في الانتظار', 'Pending')}</option>
                <option value="approved">{ar('معتمد', 'Approved')}</option>
                <option value="rejected">{ar('مرفوض', 'Rejected')}</option>
                <option value="completed">{ar('مكتمل', 'Completed')}</option>
              </select>
              <div className="flex gap-2">
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="select text-sm flex-1">
                  <option value="">{ar('جميع الأنواع', 'All Types')}</option>
                  <option value="salary_advance">{ar('سلفة راتب', 'Salary Advance')}</option>
                  <option value="emergency">{ar('سلفة طارئة', 'Emergency')}</option>
                  <option value="personal">{ar('سلفة شخصية', 'Personal')}</option>
                  <option value="medical">{ar('سلفة طبية', 'Medical')}</option>
                </select>
                {(searchQuery || statusFilter || typeFilter) && <button onClick={() => { setSearchQuery(''); setStatusFilter(''); setTypeFilter('') }} className="btn btn-ghost btn-md px-3 text-danger border border-surface-200 bg-surface-50"><i className="fas fa-times"></i></button>}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="table-container">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center"><i className="fas fa-hand-holding-usd text-brand-600 text-sm"></i></div>
                <span className="text-sm font-black text-surface-700">{ar('طلبات السلف والقروض', 'Loan Requests')}</span>
              </div>
              <span className="badge badge-neutral">{ar(`${filteredLoans.length} سجل`, `${filteredLoans.length} records`)}</span>
            </div>

            {filteredLoans.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr>
                    <th>{ar('الموظف', 'Employee')}</th><th>{ar('النوع والغرض', 'Type & Purpose')}</th><th>{ar('القيم المالية', 'Amounts')}</th><th>{ar('تاريخ الطلب', 'Date')}</th><th>{ar('الحالة', 'Status')}</th><th className="text-center">{ar('الإجراءات', 'Actions')}</th>
                  </tr></thead>
                  <tbody>
                    {filteredLoans.map((loan, i) => (
                      <motion.tr key={loan.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} className="group">
                        <td><div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center text-brand-600 font-black text-sm flex-shrink-0">{loan.employeeName.charAt(0)}</div>
                          <div><p className="font-black text-surface-900 text-sm">{loan.employeeName}</p><p className="text-xs text-surface-400 font-mono mt-0.5">ID: {loan.employeeId}</p></div>
                        </div></td>
                        <td><p className="font-bold text-surface-800 text-sm">{getTypeText(loan.type)}</p><p className="text-xs text-surface-400 mt-1 max-w-[200px] truncate" title={loan.purpose}>{loan.purpose || ar('لا يوجد غرض محدد', 'No purpose specified')}</p></td>
                        <td><div className="space-y-1 font-mono">
                          <div className="flex items-center gap-1.5"><span className="text-brand-600 font-black text-sm">{formatCurrency(loan.amount, 'EGP')}</span><span className="text-[10px] text-surface-400 font-bold">{ar('المبلغ', 'Amount')}</span></div>
                          <div className="flex items-center gap-2 text-[10px] font-bold"><span className="text-success">{formatCurrency(loan.paidAmount || 0, 'EGP')} {ar('مسدد', 'Paid')}</span><span className="text-surface-300">|</span><span className="text-danger">{formatCurrency(loan.amount - (loan.paidAmount || 0), 'EGP')} {ar('متبقي', 'Remaining')}</span></div>
                        </div></td>
                        <td><span className="text-xs font-bold text-surface-600">{loan.requestDate ? new Date(loan.requestDate).toLocaleDateString('en-GB') : '—'}</span></td>
                        <td><span className={`badge ${loan.status === 'approved' ? 'badge-success' : loan.status === 'pending' ? 'badge-warning' : loan.status === 'completed' ? 'badge-brand' : 'badge-danger'}`}>{getStatusText(loan.status)}</span></td>
                        <td><div className="flex items-center justify-center gap-2">
                          {loan.status === 'pending' && hasPermission('approve_loan') && (
                            <><button onClick={() => handleStatusChange(loan, 'approved')} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }} onMouseEnter={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.color = 'white' }} onMouseLeave={e => { e.currentTarget.style.background = '#ecfdf5'; e.currentTarget.style.color = '#059669' }} title={ar('قبول', 'Approve')}><i className="fas fa-check text-xs"></i></button>
                            <button onClick={() => handleStatusChange(loan, 'rejected')} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200" style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3' }} onMouseEnter={e => { e.currentTarget.style.background = '#e11d48'; e.currentTarget.style.color = 'white' }} onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#e11d48' }} title={ar('رفض', 'Reject')}><i className="fas fa-times text-xs"></i></button></>
                          )}
                          {(hasPermission('edit_loan') || (user?.role === 'employee' && loan.employeeId === user.employeeId && loan.status === 'pending')) && (
                            <button onClick={() => handleEditLoan(loan)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200" style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }} onMouseEnter={e => { e.currentTarget.style.background = '#4f46e5'; e.currentTarget.style.color = 'white' }} onMouseLeave={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.color = '#4f46e5' }} title={ar('تعديل', 'Edit')}><i className="fas fa-pen text-xs"></i></button>
                          )}
                          {hasPermission('delete_loan') && (
                            <button onClick={() => handleDeleteLoan(loan)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200" style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3' }} onMouseEnter={e => { e.currentTarget.style.background = '#e11d48'; e.currentTarget.style.color = 'white' }} onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#e11d48' }} title={ar('حذف', 'Delete')}><i className="fas fa-trash text-xs"></i></button>
                          )}
                        </div></td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><i className="fas fa-hand-holding-usd text-surface-400"></i></div>
                <h3 className="empty-title">{ar('لا يوجد طلبات سلف', 'No loan requests')}</h3>
                <p className="empty-desc mb-6">{searchQuery || statusFilter || typeFilter ? ar('لا توجد نتائج مطابقة للفلاتر', 'No matching results') : ar('لم يتم تسجيل أي طلبات سلف وقروض في النظام بعد', 'No loan requests recorded yet')}</p>
                {!searchQuery && !statusFilter && !typeFilter && <button onClick={handleAddLoan} className="btn btn-primary btn-md"><i className="fas fa-plus"></i> {ar('بدء طلب سلفة', 'Start Loan Request')}</button>}
              </div>
            )}
          </motion.div>
        </div>
        <LoanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} loan={selectedLoan} employees={employees} onSave={handleSaveLoan} />
      </Layout>
    </ProtectedRoute>
  )
}
