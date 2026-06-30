import { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import PerformanceModal from '../components/PerformanceModal'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Performance() {
  const { employees, loading } = useData()
  const { user, hasPermission, logActivity } = useAuth()
  const { language } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e
  const [evaluations, setEvaluations] = useState([])
  const [filteredEvaluations, setFilteredEvaluations] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEvaluation, setSelectedEvaluation] = useState(null)
  const [stats, setStats] = useState({ totalEvaluations: 0, completedEvaluations: 0, pendingEvaluations: 0, averageScore: 0, excellentPerformers: 0, needsImprovement: 0 })

  useEffect(() => { loadEvaluations() }, [])
  useEffect(() => { if (evaluations.length > 0) { applyFilters(); calculateStats() } }, [evaluations, searchQuery, periodFilter, statusFilter])

  const loadEvaluations = () => {
    try {
      const data = localStorage.getItem('hr_system_evaluations')
      setEvaluations(data ? JSON.parse(data) : [])
    } catch (e) { toast.error(ar('حدث خطأ في تحميل التقييمات', 'Error loading evaluations')) }
  }

  const saveEvaluations = (data) => { setEvaluations(data); localStorage.setItem('hr_system_evaluations', JSON.stringify(data)) }

  const applyFilters = () => {
    let filtered = [...evaluations]
    if (user?.role === 'employee') filtered = filtered.filter(e => e.employeeId === user.employeeId)
    if (searchQuery) filtered = filtered.filter(e => e.employeeName.toLowerCase().includes(searchQuery.toLowerCase()))
    if (periodFilter) filtered = filtered.filter(e => e.period === periodFilter)
    if (statusFilter) filtered = filtered.filter(e => e.status === statusFilter)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    setFilteredEvaluations(filtered)
  }

  const calculateStats = () => {
    const completed = evaluations.filter(e => e.status === 'completed')
    const avg = completed.length ? completed.reduce((s, e) => s + (e.totalScore || 0), 0) / completed.length : 0
    setStats({
      totalEvaluations: evaluations.length,
      completedEvaluations: completed.length,
      pendingEvaluations: evaluations.filter(e => e.status === 'pending').length,
      averageScore: avg,
      excellentPerformers: completed.filter(e => e.totalScore >= 90).length,
      needsImprovement: completed.filter(e => e.totalScore < 60).length
    })
  }

  const getNextId = () => evaluations.reduce((max, e) => Math.max(max, e.id || 0), 0) + 1
  const handleAddEvaluation = () => { setSelectedEvaluation(null); setIsModalOpen(true) }
  const handleEditEvaluation = (evaluation) => { setSelectedEvaluation(evaluation); setIsModalOpen(true) }

  const handleDeleteEvaluation = (evaluation) => {
    if (confirm(ar(`هل أنت متأكد من حذف تقييم ${evaluation.employeeName}؟`, `Delete evaluation for ${evaluation.employeeName}?`))) {
      saveEvaluations(evaluations.filter(e => e.id !== evaluation.id))
      toast.success(ar('تم حذف التقييم بنجاح', 'Evaluation deleted'))
      logActivity('evaluation_delete', ar(`تم حذف تقييم: ${evaluation.employeeName}`, `Deleted: ${evaluation.employeeName}`))
    }
  }

  const handleSaveEvaluation = async (data) => {
    try {
      if (selectedEvaluation) {
        saveEvaluations(evaluations.map(e => e.id === selectedEvaluation.id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e))
        toast.success(ar('تم تحديث التقييم بنجاح', 'Evaluation updated'))
      } else {
        saveEvaluations([...evaluations, { id: getNextId(), ...data, status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }])
        toast.success(ar('تم إضافة التقييم بنجاح', 'Evaluation added'))
      }
      setIsModalOpen(false)
      logActivity(selectedEvaluation ? 'evaluation_update' : 'evaluation_add', ar(`تقييم: ${data.employeeName}`, `Evaluation: ${data.employeeName}`))
    } catch (e) { toast.error(ar('حدث خطأ أثناء حفظ التقييم', 'Error saving evaluation')) }
  }

  const handleCompleteEvaluation = (evaluation) => {
    saveEvaluations(evaluations.map(e => e.id === evaluation.id ? { ...e, status: 'completed', completedAt: new Date().toISOString() } : e))
    toast.success(ar('تم إكمال التقييم بنجاح', 'Evaluation completed'))
  }

  const getPerformanceLevel = (score) => {
    if (score >= 90) return { text: ar('ممتاز', 'Excellent'), color: 'text-green-600', bg: 'bg-green-100' }
    if (score >= 80) return { text: ar('جيد جداً', 'Very Good'), color: 'text-blue-600', bg: 'bg-blue-100' }
    if (score >= 70) return { text: ar('جيد', 'Good'), color: 'text-yellow-600', bg: 'bg-yellow-100' }
    if (score >= 60) return { text: ar('مقبول', 'Acceptable'), color: 'text-orange-600', bg: 'bg-orange-100' }
    return { text: ar('يحتاج تحسين', 'Needs Improvement'), color: 'text-red-600', bg: 'bg-red-100' }
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="page-title">{ar('تقييم الأداء', 'Performance Review')}</h1>
              <p className="page-description">{ar('إدارة تقييمات أداء الموظفين والمراجعات الدورية', 'Manage employee performance reviews')}</p>
            </div>
            {(hasPermission('add_performance') || hasPermission('add_department_performance')) && (
              <motion.button onClick={handleAddEvaluation} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="btn btn-primary btn-md">
                <i className="fas fa-plus"></i> {ar('تقييم جديد', 'New Evaluation')}
              </motion.button>
            )}
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: ar('إجمالي التقييمات', 'Total'), value: stats.totalEvaluations, icon: 'fa-chart-line', color: 'bg-brand-50 text-brand-600' },
              { label: ar('تقييمات مكتملة', 'Completed'), value: stats.completedEvaluations, icon: 'fa-check-circle', color: 'bg-emerald-50 text-emerald-600' },
              { label: ar('في الانتظار', 'Pending'), value: stats.pendingEvaluations, icon: 'fa-clock', color: 'bg-amber-50 text-amber-600' },
              { label: ar('متوسط الدرجات', 'Avg Score'), value: stats.averageScore.toFixed(1), icon: 'fa-star', color: 'bg-violet-50 text-violet-600' },
              { label: ar('أداء ممتاز', 'Excellent'), value: stats.excellentPerformers, icon: 'fa-trophy', color: 'bg-emerald-50 text-emerald-600' },
              { label: ar('يحتاج تحسين', 'Needs Improvement'), value: stats.needsImprovement, icon: 'fa-exclamation-triangle', color: 'bg-rose-50 text-rose-600' }
            ].map((s, i) => (
              <div key={i} className="bg-white border border-surface-200 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color.split(' ')[0]} ${s.color.split(' ')[1]}`}>
                  <i className={`fas ${s.icon} text-sm`}></i>
                </div>
                <div><p className="text-lg font-black text-surface-900 leading-none">{s.value}</p><p className="text-xs font-bold text-surface-500 mt-0.5">{s.label}</p></div>
              </div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-surface-200 p-5 rounded-2xl shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <i className="fas fa-search absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none"></i>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input pr-10 text-sm" placeholder={ar('البحث بالاسم...', 'Search by name...')} />
              </div>
              <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} className="select text-sm">
                <option value="">{ar('جميع الفترات', 'All Periods')}</option>
                <option value="Q1-2024">{ar('الربع الأول 2024', 'Q1 2024')}</option>
                <option value="Q2-2024">{ar('الربع الثاني 2024', 'Q2 2024')}</option>
                <option value="Q3-2024">{ar('الربع الثالث 2024', 'Q3 2024')}</option>
                <option value="Q4-2024">{ar('الربع الرابع 2024', 'Q4 2024')}</option>
                <option value="annual-2024">{ar('سنوي 2024', 'Annual 2024')}</option>
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select text-sm">
                <option value="">{ar('جميع الحالات', 'All Status')}</option>
                <option value="pending">{ar('في الانتظار', 'Pending')}</option>
                <option value="completed">{ar('مكتمل', 'Completed')}</option>
              </select>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-surface-200 bg-surface-50/50 flex items-center justify-between">
              <h3 className="text-sm font-black text-surface-700 flex items-center gap-2">
                <i className="fas fa-chart-line text-brand-600"></i> {ar('تقييمات الأداء', 'Performance Evaluations')}
              </h3>
              <span className="badge badge-neutral">{ar(`${filteredEvaluations.length} تقييم`, `${filteredEvaluations.length} evaluations`)}</span>
            </div>

            {filteredEvaluations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead><tr className="bg-surface-50 border-b border-surface-200 text-surface-500">
                    <th className="py-4 px-6 font-bold">{ar('الموظف', 'Employee')}</th>
                    <th className="py-4 px-6 font-bold">{ar('الفترة', 'Period')}</th>
                    <th className="py-4 px-6 font-bold">{ar('الدرجة', 'Score')}</th>
                    <th className="py-4 px-6 font-bold">{ar('مستوى الأداء', 'Level')}</th>
                    <th className="py-4 px-6 font-bold">{ar('الحالة', 'Status')}</th>
                    <th className="py-4 px-6 font-bold text-center">{ar('الإجراءات', 'Actions')}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-surface-100">
                    {filteredEvaluations.map((evaluation, i) => {
                      const pl = evaluation.totalScore ? getPerformanceLevel(evaluation.totalScore) : null
                      return (
                        <motion.tr key={evaluation.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }} className="hover:bg-surface-50/50 transition-colors">
                          <td className="py-4 px-6 font-bold">{evaluation.employeeName}</td>
                          <td className="py-4 px-6">{evaluation.period}</td>
                          <td className="py-4 px-6 font-bold text-brand-600">{evaluation.totalScore ? `${evaluation.totalScore}/100` : ar('غير محدد', 'N/A')}</td>
                          <td className="py-4 px-6">{pl && <span className={`px-3 py-1 rounded-full text-xs font-bold ${pl.bg} ${pl.color}`}>{pl.text}</span>}</td>
                          <td className="py-4 px-6">
                            <span className={`badge ${evaluation.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                              {evaluation.status === 'completed' ? ar('مكتمل', 'Completed') : ar('في الانتظار', 'Pending')}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-2">
                              {evaluation.status === 'pending' && hasPermission('edit_performance') && (
                                <button onClick={() => handleCompleteEvaluation(evaluation)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-colors" title={ar('إكمال التقييم', 'Complete')}><i className="fas fa-check text-xs"></i></button>
                              )}
                              {(hasPermission('edit_performance') || hasPermission('edit_department_performance')) && (
                                <button onClick={() => handleEditEvaluation(evaluation)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }} onMouseEnter={e => { e.currentTarget.style.background = '#4f46e5'; e.currentTarget.style.color = 'white' }} onMouseLeave={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.color = '#4f46e5' }} title={ar('تعديل', 'Edit')}><i className="fas fa-pen text-xs"></i></button>
                              )}
                              {hasPermission('delete_performance') && (
                                <button onClick={() => handleDeleteEvaluation(evaluation)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3' }} onMouseEnter={e => { e.currentTarget.style.background = '#e11d48'; e.currentTarget.style.color = 'white' }} onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#e11d48' }} title={ar('حذف', 'Delete')}><i className="fas fa-trash text-xs"></i></button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><i className="fas fa-chart-line text-surface-400"></i></div>
                <h3 className="empty-title">{ar('لا توجد تقييمات', 'No evaluations')}</h3>
                <p className="empty-desc mb-6">{searchQuery || periodFilter || statusFilter ? ar('لا توجد نتائج مطابقة للبحث', 'No matching results') : ar('ابدأ بإضافة تقييم أداء جديد', 'Start by adding a new evaluation')}</p>
                {!searchQuery && !periodFilter && !statusFilter && (hasPermission('add_performance') || hasPermission('add_department_performance')) && (
                  <button onClick={handleAddEvaluation} className="btn btn-primary btn-md"><i className="fas fa-plus"></i> {ar('تقييم جديد', 'New Evaluation')}</button>
                )}
              </div>
            )}
          </motion.div>
        </div>
        <PerformanceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} evaluation={selectedEvaluation} employees={employees} onSave={handleSaveEvaluation} />
      </Layout>
    </ProtectedRoute>
  )
}
