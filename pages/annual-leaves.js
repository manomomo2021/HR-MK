import { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import LeaveHistoryModal from '../components/LeaveHistoryModal'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function AnnualLeaves() {
  const { employees, leaves, loading } = useData()
  const { logActivity } = useAuth()
  const { language } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [activeEmployee, setActiveEmployee] = useState(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedEmpIds, setSelectedEmpIds] = useState([])
  const [newBase, setNewBase] = useState(21)
  const [empSearchQuery, setEmpSearchQuery] = useState('')
  const [baseBalances, setBaseBalances] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`hr_system_customLeaveBalances_${selectedYear}`)
      if (saved) setBaseBalances(JSON.parse(saved))
      else setBaseBalances({})
    } catch { }
  }, [selectedYear])

  const saveBaseBalance = (empId, val) => {
    const num = parseInt(val) || 0
    const newBalances = { ...baseBalances, [empId]: num }
    setBaseBalances(newBalances)
    localStorage.setItem(`hr_system_customLeaveBalances_${selectedYear}`, JSON.stringify(newBalances))
    setEditingId(null)
    toast.success(ar('تم تعديل الرصيد الأساسي بنجاح', 'Base balance updated successfully'))
    logActivity('balance_update', ar(`تعديل رصيد الإجازات السنوية للموظف كود ${empId} إلى ${num} يوم`, `Updated annual leave balance for employee ${empId} to ${num} days`))
  }

  const handleAddMultipleEmployees = () => {
    if (selectedEmpIds.length === 0) return toast.error(ar('يرجى اختيار موظف واحد على الأقل', 'Please select at least one employee'))
    let updatedBalances = { ...baseBalances }
    selectedEmpIds.forEach(id => { updatedBalances[id] = parseInt(newBase) || 21 })
    setBaseBalances(updatedBalances)
    localStorage.setItem(`hr_system_customLeaveBalances_${selectedYear}`, JSON.stringify(updatedBalances))
    setIsAddModalOpen(false)
    setSelectedEmpIds([])
    setNewBase(21)
    setEmpSearchQuery('')
    toast.success(ar(`تم إضافة ${selectedEmpIds.length} موظف للمتابعة بنجاح`, `Added ${selectedEmpIds.length} employees to tracking`))
    logActivity('balance_multi_add', ar(`إضافة ${selectedEmpIds.length} موظف لمتابعة الرصيد السنوي لعام ${selectedYear}`, `Added ${selectedEmpIds.length} employees to annual tracking for ${selectedYear}`))
  }

  const toggleEmployeeSelection = (id) => {
    if (selectedEmpIds.includes(id)) setSelectedEmpIds(selectedEmpIds.filter(empId => empId !== id))
    else setSelectedEmpIds([...selectedEmpIds, id])
  }

  const selectAllFiltered = (filteredEmps) => {
    const allIds = filteredEmps.map(e => e.id)
    const isAllSelected = allIds.every(id => selectedEmpIds.includes(id))
    if (isAllSelected) setSelectedEmpIds(selectedEmpIds.filter(id => !allIds.includes(id)))
    else setSelectedEmpIds([...new Set([...selectedEmpIds, ...allIds])])
  }

  const untrackedEmployees = employees.filter(e => baseBalances[e.id] === undefined)
  const modalFilteredEmployees = untrackedEmployees.filter(e =>
    (e.name || e.first_name || '').toLowerCase().includes(empSearchQuery.toLowerCase()) ||
    (e.code || e.employee_id || '').toString().includes(empSearchQuery)
  )

  const handleRemoveEmployeeTracking = (empId) => {
    if (confirm(ar('متأكد إنك عايز تشيل الموظف ده من متابعة الرصيد؟', 'Are you sure you want to remove this employee from balance tracking?'))) {
      const newBalances = { ...baseBalances }
      delete newBalances[empId]
      setBaseBalances(newBalances)
      localStorage.setItem(`hr_system_customLeaveBalances_${selectedYear}`, JSON.stringify(newBalances))
      toast.success(ar('تم الحذف من المتابعة', 'Removed from tracking'))
    }
  }

  const trackedEmployees = employees.filter(emp => baseBalances[emp.id] !== undefined)

  const balancesData = trackedEmployees.map(emp => {
    const baseAnnual = baseBalances[emp.id]
    const empLeavesThisYear = leaves.filter(l =>
      String(l.employee_id) === String(emp.id) && l.status === 'approved' && new Date(l.start_date).getFullYear() === selectedYear
    )
    let usedAnnual = 0, usedCasual = 0, usedSick = 0, usedEmergency = 0
    empLeavesThisYear.forEach(l => {
      const d = parseInt(l.days) || 0
      if (l.leave_type === 'annual') usedAnnual += d
      else if (l.leave_type === 'casual') usedCasual += d
      else if (l.leave_type === 'sick') usedSick += d
      else if (l.leave_type === 'emergency') usedEmergency += d
    })
    return { ...emp, baseAnnual, usedAnnual, remainingAnnual: baseAnnual - usedAnnual, usedCasual, usedSick, usedEmergency, totalUsed: usedAnnual + usedCasual + usedSick + usedEmergency }
  })

  const filtered = balancesData.filter(b =>
    (b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.code || b.employee_id || '').toString().includes(searchQuery)
  )

  const totalEmployees = balancesData.length
  const totalBase = balancesData.reduce((sum, b) => sum + b.baseAnnual, 0)
  const totalUsedAnnual = balancesData.reduce((sum, b) => sum + b.usedAnnual, 0)
  const totalRemaining = balancesData.reduce((sum, b) => sum + b.remainingAnnual, 0)

  const openHistory = (emp) => { setActiveEmployee(emp); setIsHistoryModalOpen(true) }

  const getAvailableYears = () => {
    const years = new Set(leaves.map(l => new Date(l.start_date).getFullYear()).filter(y => !isNaN(y)))
    years.add(new Date().getFullYear())
    return [...years].sort((a, b) => b - a)
  }

  if (loading) return <ProtectedRoute><Layout><div className="flex justify-center items-center h-screen"><div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin"></div></div></Layout></ProtectedRoute>

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="page-title">{ar('أرصدة الإجازات', 'Leave Balances')}</h1>
              <p className="page-description">{ar('إدارة ومتابعة الرصيد السنوي للموظفين وإحصائيات استخدام إجازاتهم', 'Manage and track annual leave balances and usage statistics')}</p>
            </div>
            <div className="relative min-w-[140px]">
              <label className="text-[10px] font-black text-surface-500 uppercase tracking-wider block mb-1.5 mr-1">{ar('سنة الجرد', 'Year')}</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="select py-2.5 text-xs font-bold w-full">
                {getAvailableYears().map(y => <option key={y} value={y}>{ar(`سنة ${y}`, `${y}`)}</option>)}
              </select>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: ar('إجمالي الموظفين', 'Total Employees'), value: totalEmployees, icon: "fa-users", color: "bg-brand-50 text-brand-600" },
              { label: ar('إجمالي الرصيد (أيام)', 'Total Balance (Days)'), value: totalBase, icon: "fa-calendar-alt", color: "bg-cyan-50 text-cyan-600" },
              { label: ar('إجازات مستهلكة', 'Used Leave'), value: totalUsedAnnual, icon: "fa-calendar-minus", color: "bg-rose-50 text-rose-600" },
              { label: ar('الرصيد المتبقي الإجمالي', 'Total Remaining'), value: totalRemaining, icon: "fa-calendar-check", color: "bg-emerald-50 text-emerald-600" }
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
            transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <i className="fas fa-magnifying-glass absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none"></i>
              <input type="text" placeholder={ar('البحث في سجل المتابعة الحالي...', 'Search current tracking records...')}
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pr-10 text-sm shadow-sm" />
            </div>
            <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary btn-md flex-shrink-0">
              <i className="fas fa-plus"></i> {ar('إضافة وتخصيص أرصدة', 'Add & Assign Balances')}
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((b, i) => {
                  const perc = b.baseAnnual > 0 ? (b.remainingAnnual / b.baseAnnual) * 100 : 0
                  const isLow = perc < 25
                  const name = b.name || `${b.first_name || ''} ${b.last_name || ''}`.trim()
                  return (
                    <motion.div key={b.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="group bg-white border border-surface-200 hover:border-brand-200 rounded-2xl p-5 transition-all duration-200 relative overflow-hidden flex flex-col cursor-pointer shadow-sm hover:shadow-md"
                      onClick={() => openHistory(b)}>
                      {isLow && <div className="absolute top-0 bottom-0 right-0 w-1 bg-rose-500"></div>}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm border flex-shrink-0 ${isLow ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-surface-50 border-surface-200 text-surface-500'}`}>
                            {name.slice(0, 2)}
                          </div>
                          <div>
                            <h3 className="text-surface-900 font-black text-sm truncate w-40">{name}</h3>
                            <p className="text-surface-400 text-xs mt-0.5">{ar('كود', 'Code')}: {b.code || b.employee_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button onClick={() => openHistory(b)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-cyan-600 bg-cyan-50 border border-cyan-100 hover:bg-cyan-600 hover:text-white transition-all duration-200"
                            title={ar('سجل الإجازات', 'Leave History')}>
                            <i className="fas fa-history text-xs"></i>
                          </button>
                          <button onClick={() => handleRemoveEmployeeTracking(b.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-400 bg-surface-50 border border-surface-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all duration-200"
                            title={ar('إزالة المتابعة', 'Remove Tracking')}>
                            <i className="fas fa-times text-xs"></i>
                          </button>
                        </div>
                      </div>
                      <div className="bg-surface-50 rounded-xl p-4 mb-4 border border-surface-200">
                        <div className="flex justify-between items-end mb-3">
                          <div>
                            <p className="text-surface-400 text-[10px] font-bold uppercase tracking-wider mb-1">{ar('الرصيد المتبقي', 'Remaining')}</p>
                            <p className={`text-2xl font-black leading-none ${isLow ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {Math.max(0, b.remainingAnnual)} <span className="text-xs font-bold text-surface-500">{ar('يوم', 'days')}</span>
                            </p>
                          </div>
                          <div className="text-left" onClick={e => e.stopPropagation()}>
                            <p className="text-surface-400 text-[10px] font-bold uppercase tracking-wider mb-1">{ar('الرصيد الأساسي', 'Base')}</p>
                            {editingId === b.id ? (
                              <div className="flex items-center gap-1.5">
                                <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
                                  className="w-12 bg-white border border-brand-300 text-surface-900 rounded-lg text-xs py-1 text-center font-black outline-none" autoFocus
                                  onKeyDown={e => e.key === 'Enter' && saveBaseBalance(b.id, editValue)} />
                                <button onClick={() => saveBaseBalance(b.id, editValue)}
                                  className="w-6 h-6 rounded-md bg-brand-600 text-white flex items-center justify-center text-xs"><i className="fas fa-check"></i></button>
                              </div>
                            ) : (
                              <button onClick={() => { setEditingId(b.id); setEditValue(b.baseAnnual) }}
                                className="flex items-center gap-1 group/edit text-surface-700 hover:text-brand-600 transition-colors">
                                <span className="text-lg font-black leading-none">{b.baseAnnual}</span>
                                <i className="fas fa-pen text-[9px] text-brand-600 opacity-0 group-hover/edit:opacity-100 transition-opacity bg-brand-50 p-1 rounded"></i>
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-surface-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, perc))}%` }}></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2.5 mt-auto">
                        <div className="bg-amber-50 border border-amber-100 rounded-xl py-2 px-1 text-center">
                          <p className="text-amber-600 text-[10px] font-bold"><i className="fas fa-bolt mr-0.5"></i> {ar('عارضة', 'Casual')}</p>
                          <p className="text-amber-700 font-black text-base mt-0.5">{b.usedCasual}</p>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 rounded-xl py-2 px-1 text-center">
                          <p className="text-rose-600 text-[10px] font-bold"><i className="fas fa-hand-holding-medical mr-0.5"></i> {ar('مرضي', 'Sick')}</p>
                          <p className="text-rose-700 font-black text-base mt-0.5">{b.usedSick}</p>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 rounded-xl py-2 px-1 text-center">
                          <p className="text-orange-600 text-[10px] font-bold"><i className="fas fa-triangle-exclamation mr-0.5"></i> {ar('طارئ', 'Emergency')}</p>
                          <p className="text-orange-700 font-black text-base mt-0.5">{b.usedEmergency}</p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state bg-white border border-surface-200 rounded-2xl shadow-sm">
                <div className="empty-icon"><i className="fas fa-umbrella-beach text-surface-400"></i></div>
                <h3 className="empty-title">{ar(`لا يوجد موظفون في المتابعة لسنة ${selectedYear}`, `No employees tracked for year ${selectedYear}`)}</h3>
                <p className="empty-desc mb-6">{ar('ابدأ باختيار وتخصيص أرصدة الإجازات السنوية للموظفين لتبدأ المتابعة الحية لها.', 'Start by selecting employees and assigning annual leave balances to begin tracking.')}</p>
                <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary btn-md">
                  <i className="fas fa-user-plus"></i> {ar('إضافة موظف للمتابعة', 'Add Employee to Tracking')}
                </button>
              </div>
            )}
          </motion.div>
        </div>

        <LeaveHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)}
          employee={activeEmployee} leaves={leaves} />

        <AnimatePresence>
          {isAddModalOpen && (
            <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} className="modal-panel max-w-2xl">
                <div className="modal-header">
                  <div>
                    <h2 className="text-lg font-black text-surface-900">{ar('تخصيص أرصدة الإجازات', 'Assign Leave Balances')}</h2>
                    <p className="text-xs text-surface-500 font-medium mt-0.5">{ar('اختر الموظفين وحدد لهم رصيداً سنوياً موحداً لبدء التتبع.', 'Select employees and set a uniform annual balance to start tracking.')}</p>
                  </div>
                  <button onClick={() => setIsAddModalOpen(false)}
                    className="w-9 h-9 rounded-xl bg-surface-50 text-surface-500 hover:bg-surface-100 hover:text-surface-900 border border-surface-200 flex items-center justify-center transition-colors">
                    <i className="fas fa-times text-sm"></i>
                  </button>
                </div>
                <div className="p-5 border-b border-surface-200 bg-surface-50 flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <i className="fas fa-search absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none"></i>
                    <input type="text" placeholder={ar('ابحث باسم الموظف أو الكود...', 'Search by name or code...')}
                      value={empSearchQuery} onChange={(e) => setEmpSearchQuery(e.target.value)} className="input pr-10 text-sm" />
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-surface-200 rounded-xl px-4 py-2.5 shadow-sm">
                    <span className="text-xs font-bold text-surface-500">{ar('الرصيد:', 'Balance:')}</span>
                    <input type="number" value={newBase} onChange={e => setNewBase(e.target.value)}
                      className="w-12 bg-transparent text-brand-600 font-black text-base outline-none text-center" min="1" />
                    <span className="text-xs font-bold text-surface-400">{ar('يوم', 'days')}</span>
                  </div>
                </div>
                <div className="modal-body max-h-[40vh]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-surface-500">{ar(`الموظفون المتاحون للاستيراد (${modalFilteredEmployees.length})`, `Available employees (${modalFilteredEmployees.length})`)}</span>
                    <button onClick={() => selectAllFiltered(modalFilteredEmployees)}
                      className="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors">
                      {modalFilteredEmployees.length > 0 && modalFilteredEmployees.every(e => selectedEmpIds.includes(e.id)) ? ar('إلغاء التحديد', 'Deselect All') : ar('تحديد الكل', 'Select All')}
                    </button>
                  </div>
                  {modalFilteredEmployees.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {modalFilteredEmployees.map((emp) => {
                        const isSelected = selectedEmpIds.includes(emp.id)
                        const name = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
                        return (
                          <div key={emp.id} onClick={() => toggleEmployeeSelection(emp.id)}
                            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all duration-200 cursor-pointer ${isSelected ? 'bg-brand-50 border-brand-200' : 'bg-surface-50 border-surface-200 hover:border-surface-300'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs border ${isSelected ? 'bg-brand-600 text-white border-transparent' : 'bg-white border-surface-200 text-surface-400'}`}>{name.slice(0, 2)}</div>
                              <div>
                                <p className="text-sm font-bold text-surface-900 truncate w-32 md:w-40">{name}</p>
                                <p className="text-[10px] text-surface-400 font-mono">{ar('كود', 'Code')}: {emp.code || emp.employee_id}</p>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-brand-600 border-brand-600 text-white' : 'border-surface-300 text-transparent'}`}>
                              <i className="fas fa-check text-[10px]"></i>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-surface-400">
                      <i className="fas fa-user-check text-3xl mb-2"></i>
                      <p className="text-xs font-bold">{ar('لا يوجد موظفون متاحون للتخصيص حالياً', 'No employees available for assignment')}</p>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <span className="text-xs font-bold text-surface-500">
                    {ar('تم تحديد', 'Selected')} <span className="text-brand-600 font-black text-sm">{selectedEmpIds.length}</span> {ar('موظف', 'employees')}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary btn-sm">{ar('إلغاء', 'Cancel')}</button>
                    <button onClick={handleAddMultipleEmployees} disabled={selectedEmpIds.length === 0}
                      className="btn btn-primary btn-sm">{ar('حفظ وتخصيص', 'Save & Assign')}</button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Layout>
    </ProtectedRoute>
  )
}
