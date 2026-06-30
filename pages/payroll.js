import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import PayrollModal from '../components/PayrollModal'
import CurrencyManager from '../components/CurrencyManager'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import database from '../utils/database'
import {
  convertCurrency,
  formatCurrency,
  getSupportedCurrencies,
  getExchangeRates,
  CURRENCIES
} from '../utils/currency'

export default function Payroll() {
  const { user, hasPermission, logActivity } = useAuth()
  const { language } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [payrolls, setPayrolls] = useState([])
  const [loans, setLoans] = useState([])
  const [filteredPayrolls, setFilteredPayrolls] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPayroll, setSelectedPayroll] = useState(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isCurrencyManagerOpen, setIsCurrencyManagerOpen] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState('EGP')
  const [exchangeRates, setExchangeRates] = useState({})
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedPayrollDetails, setSelectedPayrollDetails] = useState(null)
  const [stats, setStats] = useState({
    totalEmployees: 0, calculatedPayrolls: 0, approvedPayrolls: 0,
    totalGrossSalary: 0, totalNetSalary: 0, totalDeductions: 0
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([loadEmployees(), loadPayrolls(), loadLoans(), loadExchangeRates()])
        setLoading(false)
      } catch (error) {      toast.error(ar('حدث خطأ في تحميل البيانات', 'Error loading data')); setLoading(false) }
    }
    loadData()
  }, [])

  const loadEmployees = async () => { try { setEmployees(await database.getEmployees()) } catch (e) { toast.error(ar('تعذر جلب ملفات الكوادر', 'Failed to fetch employee files')) } }
  const loadExchangeRates = () => { setExchangeRates(getExchangeRates()) }

  useEffect(() => {
    if (payrolls.length > 0) { applyFilters(); calculateStats() }
  }, [payrolls, selectedMonth, searchQuery, statusFilter, language])

  useEffect(() => { loadPayrolls() }, [selectedMonth])

  const loadPayrolls = async () => { try { setPayrolls(await database.getPayrolls(selectedMonth)) } catch (e) { toast.error(ar('تعذر جلب الرواتب', 'Failed to fetch payrolls')) } }
  const loadLoans = async () => { try { setLoans(await database.getLoans()) } catch (e) { } }

  const savePayrolls = async (payrollsData) => {
    setPayrolls(payrollsData)
    for (const payroll of payrollsData) {
      try { await database.savePayroll(payroll) } catch (error) { }
    }
  }

  const applyFilters = () => {
    let filtered = payrolls.filter(payroll => payroll.month === selectedMonth)
    if (user?.role === 'employee') filtered = filtered.filter(payroll => payroll.employeeId === user.employeeId)
    if (searchQuery) filtered = filtered.filter(payroll => payroll.employeeName.toLowerCase().includes(searchQuery.toLowerCase()))
    if (statusFilter) filtered = filtered.filter(payroll => payroll.status === statusFilter)
    setFilteredPayrolls(filtered)
  }

  const calculateStats = () => {
    const monthPayrolls = payrolls.filter(p => p.month === selectedMonth)
    setStats({
      totalEmployees: employees.length,
      calculatedPayrolls: monthPayrolls.length,
      approvedPayrolls: monthPayrolls.filter(p => p.status === 'approved').length,
      totalGrossSalary: monthPayrolls.reduce((sum, p) => sum + p.grossSalary, 0),
      totalNetSalary: monthPayrolls.reduce((sum, p) => sum + p.netSalary, 0),
      totalDeductions: monthPayrolls.reduce((sum, p) => sum + p.totalDeductions, 0)
    })
  }

  const calculateMonthlyPayroll = async () => {
    if (!hasPermission('calculate_payroll')) return toast.error(ar('صلاحيات غير كافية لحساب الرواتب', 'Insufficient permissions to calculate payroll'))
    setIsCalculating(true)
    const loadingToast = toast.loading(ar('جاري توليد الرواتب عبر المصفوفة المالية...', 'Generating payroll through financial matrix...'))
    try {
      const monthPayrolls = []
      for (const employee of employees) {
        if (payrolls.find(p => p.employeeId === employee.id && p.month === selectedMonth)) continue
        let monthAttendance = []
        try { monthAttendance = await database.getAttendance(employee.id, selectedMonth) } catch (e) { }

        const workingDays = monthAttendance.length
        const lateDays = monthAttendance.filter(a => a.status === 'late').length
        const overtimeDays = monthAttendance.filter(a => a.overtimeMinutes > 0).length
        const totalOvertimeHours = monthAttendance.reduce((sum, a) => sum + (a.overtimeMinutes || 0), 0) / 60
        const workingDaysInMonth = 26
        const absentDays = Math.max(0, workingDaysInMonth - workingDays)

        const basicSalary = parseFloat(employee.basicSalary) || parseFloat(employee.salary) || 5000
        const dailySalary = basicSalary / workingDaysInMonth
        const hourlySalary = dailySalary / 8

        const transportAllowance = parseFloat(employee.transportAllowance) || 0
        const housingAllowance = parseFloat(employee.housingAllowance) || 0
        const mealAllowance = parseFloat(employee.mealAllowance) || 0
        const phoneAllowance = parseFloat(employee.phoneAllowance) || 0
        const otherAllowances = parseFloat(employee.otherAllowances) || 0
        const overtimeRate = parseFloat(employee.overtimeRate) || 1.5
        const overtimeAllowance = totalOvertimeHours * hourlySalary * overtimeRate
        const totalAllowances = transportAllowance + housingAllowance + mealAllowance + phoneAllowance + otherAllowances + overtimeAllowance

        const employeeCurrency = employee.currency || 'EGP'
        const absentDeduction = absentDays * dailySalary
        const lateDeduction = lateDays * (dailySalary * 0.1)
        const severeLateDeduction = monthAttendance.filter(a => a.lateMinutes > 60).length * (dailySalary * 0.5)

        const employeeLoans = loans.filter(l => l.employeeId === employee.id && l.status === 'approved' && l.autoDeduction === true && (l.paidAmount || 0) < l.amount)
        let totalLoanDeduction = 0
        const loanDetails = []
        for (const loan of employeeLoans) {
          const monthlyDeduction = loan.monthlyDeduction || loan.monthlyInstallment || 0
          const remainingAmount = loan.amount - (loan.paidAmount || 0)
          if (remainingAmount > 0 && monthlyDeduction > 0) {
            const actualDeduction = Math.min(monthlyDeduction, remainingAmount)
            totalLoanDeduction += actualDeduction
            loanDetails.push({ loanId: loan.id, amount: actualDeduction, remainingBefore: remainingAmount, remainingAfter: remainingAmount - actualDeduction })
          }
        }
        const loanDeduction = totalLoanDeduction
        const insuranceDeduction = basicSalary * 0.09
        const grossSalaryCalc = basicSalary + totalAllowances
        const taxDeduction = grossSalaryCalc > 15000 ? (grossSalaryCalc - 15000) * 0.1 : 0
        const fixedDeductions = parseFloat(employee.fixedDeductions) || 0
        const disciplinaryDeductions = parseFloat(employee.disciplinaryDeductions) || 0
        const otherDeductions = fixedDeductions + disciplinaryDeductions
        const totalDeductions = absentDeduction + lateDeduction + severeLateDeduction + loanDeduction + insuranceDeduction + taxDeduction + otherDeductions
        const grossSalary = basicSalary + totalAllowances
        const netSalary = grossSalary - totalDeductions
        const dailyNetSalary = dailySalary * workingDays / workingDaysInMonth
        const effectiveDailySalary = workingDays > 0 ? grossSalary / workingDays : dailySalary

        const payrollData = {
          id: Date.now() + employee.id, employeeId: employee.id, employeeName: employee.name, employeeCode: employee.code || employee.id,
          department: employee.department || 'غير محدد', position: employee.position || 'غير محدد', month: selectedMonth,
          basicSalary, transportAllowance, housingAllowance, mealAllowance, phoneAllowance, otherAllowances, overtimeAllowance,
          totalAllowances, grossSalary, workingDaysInMonth, workingDays, absentDays, lateDays, overtimeDays, totalOvertimeHours,
          absentDeduction, lateDeduction, severeLateDeduction, loanDeduction, loanDetails, insuranceDeduction, taxDeduction,
          otherDeductions, totalDeductions, netSalary, dailySalary, dailyNetSalary, effectiveDailySalary, hourlySalary, overtimeRate,
          currency: employeeCurrency, status: 'calculated', calculatedBy: user?.name || 'النظام', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          calculationNotes: { formula: 'الأساسي + البدلات = الإجمالي - الخصومات والسلف = الصافي', workingDaysUsed: workingDaysInMonth, actualWorkingDays: workingDays, attendanceRate: workingDays > 0 ? ((workingDays / workingDaysInMonth) * 100).toFixed(1) + '%' : '0%' }
        }
        monthPayrolls.push(payrollData)

        for (const loanDetail of loanDetails) {
          const loanIndex = loans.findIndex(l => l.id === loanDetail.loanId)
          if (loanIndex !== -1) {
            loans[loanIndex].paidAmount = (loans[loanIndex].paidAmount || 0) + loanDetail.amount
            loans[loanIndex].updatedAt = new Date().toISOString()
            if (loanDetail.remainingAfter <= 0) { loans[loanIndex].status = 'completed'; loans[loanIndex].completedAt = new Date().toISOString() }
            try { await database.saveLoan(loans[loanIndex]) } catch (error) { }
          }
        }
      }

      if (monthPayrolls.length > 0) {
        savePayrolls([...payrolls, ...monthPayrolls])
        for (const loan of loans) { try { await database.saveLoan(loan) } catch (e) { } }
        toast.dismiss(loadingToast); toast.success(ar(`تم استنتاج رواتب ${monthPayrolls.length} كادر بنجاح`, `Payroll for ${monthPayrolls.length} employees calculated successfully`))
        const totalLoanDeductions = monthPayrolls.reduce((sum, p) => sum + (p.loanDeduction || 0), 0)
        if (totalLoanDeductions > 0) toast.success(ar(`تمت تسوية ${formatCurrency(totalLoanDeductions, 'EGP')} من السلف المركزية`, `Settled ${formatCurrency(totalLoanDeductions, 'EGP')} from central loans`))
        logActivity('payroll_calculate', ar(`الرواتب لشهر ${selectedMonth} مبنية ومحفوظة`, `Payroll for ${selectedMonth} calculated and saved`))
      } else {
        toast.dismiss(loadingToast); toast.success(ar('كافة الرواتب مستنتجة ومطابقة مسبقاً.', 'All payrolls already calculated and matched.'))
      }
    } catch (e) { toast.dismiss(loadingToast); toast.error(ar('أفشل النظام استنتاج الرواتب', 'System failed to calculate payroll')) } finally { setIsCalculating(false) }
  }

  const handleEditPayroll = (payroll) => { setSelectedPayroll(payroll); setIsModalOpen(true) }
  const handleSavePayroll = async (payrollData) => {
    try {
      savePayrolls(payrolls.map(p => p.id === selectedPayroll.id ? { ...p, ...payrollData, updatedAt: new Date().toISOString() } : p))
      toast.success(ar('تم المصادقة على تعديل الراتب', 'Payroll edit approved'))
      logActivity('payroll_update', ar(`تعديل راتب تخصيصي للكادر: ${payrollData.employeeName}`, `Payroll edit for: ${payrollData.employeeName}`))
      setIsModalOpen(false)
    } catch (e) { toast.error(ar('الرفض الأمني: تعذر التعديل', 'Security rejection: Edit failed')) }
  }

  const handleApprovePayroll = (payroll) => {
    if (!hasPermission('approve_payroll')) return toast.error(ar('ليس لديك الصلاحية الأمنية للمصادقة المباشرة', 'You do not have security clearance for direct approval'))
    savePayrolls(payrolls.map(p => p.id === payroll.id ? { ...p, status: 'approved', approvedAt: new Date().toISOString() } : p))
    toast.success(ar('الاعتماد السري والمباشر للراتب', 'Payroll approved directly'))
    logActivity('payroll_approve', ar(`مرر الراتب نهائياً: ${payroll.employeeName}`, `Payroll finalized: ${payroll.employeeName}`))
  }

  const handleShowDetails = (payroll) => { setSelectedPayrollDetails(payroll); setShowDetailsModal(true) }

  const handleApproveAllPayrolls = () => {
    if (!hasPermission('approve_payroll')) return toast.error(ar('ليس لديك الصلاحية الأمنية للمصادقة المباشرة', 'You do not have security clearance for direct approval'))
    const monthPayrolls = payrolls.filter(p => p.month === selectedMonth && p.status === 'calculated')
    if (monthPayrolls.length === 0) return toast(ar('لا توجد رواتب غير معتمدة حالياً', 'No unapproved payrolls currently'))
    if (confirm(ar(`تحذير أمني: هل تريد المصادقة النهائية على ${monthPayrolls.length} حركة راتبية؟`, `Security warning: Do you want to approve ${monthPayrolls.length} payroll transactions?`))) {
      savePayrolls(payrolls.map(p => monthPayrolls.some(mp => mp.id === p.id) ? { ...p, status: 'approved', approvedAt: new Date().toISOString() } : p))
      toast.success(ar(`اعتماد إجمالي لـ ${monthPayrolls.length} حركة`, `Bulk approve ${monthPayrolls.length} transactions`))
      logActivity('payroll_approve_all', ar(`تخطي المرحلة لكافة رواتب ${selectedMonth}`, `Approved all payrolls for ${selectedMonth}`))
    }
  }

  const exportPayrolls = () => { toast.success(ar('جاهز للاستخراج المستقبلي بناءً على النظام', 'Ready for future export')) }

  const convertAmount = (amount, fromCurrency, toCurrency = selectedCurrency) => { if (!amount) return 0; return convertCurrency(amount, fromCurrency || 'EGP', toCurrency) }
  const formatAmount = (amount, currency = selectedCurrency) => formatCurrency(amount, currency)

  if (loading) return (
    <ProtectedRoute><Layout>
      <div className="flex items-center justify-center h-64">
        <div className="spinner" style={{ borderTopColor: '#4f46e5' }}></div>
      </div>
    </Layout></ProtectedRoute>
  )

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">

          {/* ── Page Header ── */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="page-title">{ar('رواتب الموظفين', 'Payroll')}</h1>
              <p className="page-description">{ar('حساب واعتماد الرواتب الشهرية', 'Calculate and approve monthly payroll')}</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {hasPermission('calculate_payroll') && (
                <motion.button onClick={calculateMonthlyPayroll} disabled={isCalculating}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="btn btn-primary btn-md">
                  {isCalculating
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> {ar('جارٍ الحساب...', 'Calculating...')}</>
                    : <><i className="fas fa-calculator text-sm"></i> {ar('احتساب الرواتب', 'Calculate Payroll')}</>
                  }
                </motion.button>
              )}
              {hasPermission('approve_payroll') && (
                <motion.button onClick={handleApproveAllPayrolls}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="btn btn-success btn-md">
                  <i className="fas fa-check-double text-sm"></i> {ar('اعتماد الكل', 'Approve All')}
                </motion.button>
              )}
              <motion.button onClick={() => setIsCurrencyManagerOpen(true)}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="btn btn-secondary btn-md">
                <i className="fas fa-exchange-alt text-sm"></i> {ar('العملات', 'Currencies')}
              </motion.button>
            </div>
          </motion.div>

          {/* ── Stats ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: ar('إجمالي الموظفين', 'Total Employees'), value: stats.totalEmployees, icon: 'fa-users', color: 'bg-brand-50 text-brand-600' },
              { label: ar('تم الاحتساب', 'Calculated'), value: stats.calculatedPayrolls, icon: 'fa-microchip', color: 'bg-violet-50 text-violet-600' },
              { label: ar('معتمدة', 'Approved'), value: stats.approvedPayrolls, icon: 'fa-check-double', color: 'bg-emerald-50 text-emerald-600' },
              { label: ar('إجمالي الرواتب', 'Gross Payroll'), value: formatAmount(stats.totalGrossSalary), icon: 'fa-money-bill-wave', color: 'bg-sky-50 text-sky-600' },
              { label: ar('صافي الرواتب', 'Net Payroll'), value: formatAmount(stats.totalNetSalary), icon: 'fa-sack-dollar', color: 'bg-amber-50 text-amber-600' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-surface-200 p-5"
                style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
                <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                  <i className={`fas ${s.icon} text-sm`}></i>
                </div>
                <p className="text-lg font-black text-surface-900 leading-tight">{s.value}</p>
                <p className="text-xs font-bold text-surface-500 mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* ── Filters ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-surface-200 p-5"
            style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="form-label text-xs">{ar('الشهر', 'Month')}</label>
                <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                  className="input text-sm" />
              </div>
              <div className="relative">
                <label className="form-label text-xs">{ar('بحث', 'Search')}</label>
                <i className="fas fa-magnifying-glass absolute right-3.5 bottom-3 text-surface-400 text-sm pointer-events-none"></i>
                <input type="text" placeholder={ar('اسم الموظف...', 'Employee name...')} value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)} className="input pr-10 text-sm" />
              </div>
              <div>
                <label className="form-label text-xs">{ar('الحالة', 'Status')}</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select text-sm">
                  <option value="">{ar('الكل', 'All')}</option>
                  <option value="calculated">{ar('محتسب', 'Calculated')}</option>
                  <option value="approved">{ar('معتمد', 'Approved')}</option>
                </select>
              </div>
              <div>
                <label className="form-label text-xs">{ar('العملة', 'Currency')}</label>
                <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} className="select text-sm">
                  {getSupportedCurrencies().map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                </select>
              </div>
            </div>
          </motion.div>

          {/* ── Table ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }} className="table-container">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                     style={{ background: '#f5f3ff' }}>
                  <i className="fas fa-money-check-dollar text-violet-600 text-sm"></i>
                </div>
                <span className="text-sm font-black text-surface-700">{ar('سجلات الرواتب', 'Payroll Records')}</span>
              </div>
              <div className="flex items-center gap-2">
                {(searchQuery || statusFilter) && (
                  <button onClick={() => { setSearchQuery(''); setStatusFilter('') }}
                    className="text-xs font-bold text-danger hover:opacity-80 transition-opacity">
                    <i className="fas fa-times ml-1"></i>{ar('مسح الفلاتر', 'Clear Filters')}
                  </button>
                )}
                <span className="badge badge-neutral">{filteredPayrolls.length} {ar('سجل', 'Records')}</span>
              </div>
            </div>

            {filteredPayrolls.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{ar('الموظف', 'Employee')}</th>
                      <th>{ar('الراتب الأساسي', 'Base Salary')}</th>
                      <th>{ar('البدلات', 'Allowances')}</th>
                      <th>{ar('الإجمالي', 'Gross')}</th>
                      <th>{ar('الخصومات', 'Deductions')}</th>
                      <th>{ar('الصافي', 'Net')}</th>
                      <th>{ar('الحالة', 'Status')}</th>
                      <th className="text-center">{ar('الإجراءات', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayrolls.map((payroll, i) => (
                      <motion.tr key={payroll.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }} className="group">
                        <td>
                          <div>
                            <p className="font-black text-surface-900 text-sm">{payroll.employeeName}</p>
                            <p className="text-xs text-surface-400 font-medium mt-0.5">{payroll.department}</p>
                          </div>
                        </td>
                        <td><span className="font-mono font-bold text-sm text-surface-700">{formatAmount(convertAmount(payroll.basicSalary, payroll.currency))}</span></td>
                        <td><span className="font-mono font-bold text-sm text-success">{formatAmount(convertAmount(payroll.totalAllowances, payroll.currency))}</span></td>
                        <td><span className="font-mono font-black text-sm text-brand-600">{formatAmount(convertAmount(payroll.grossSalary, payroll.currency))}</span></td>
                        <td>
                          <div className="flex flex-col gap-1">
                            <span className="font-mono font-bold text-sm text-danger">{formatAmount(convertAmount(payroll.totalDeductions, payroll.currency))}</span>
                            {payroll.loanDeduction > 0 && (
                              <span className="badge badge-warning text-[10px] px-1.5">{ar('سلف:', 'Loans:')} {formatAmount(convertAmount(payroll.loanDeduction, payroll.currency))}</span>
                            )}
                          </div>
                        </td>
                        <td><span className="font-mono font-black text-base text-success">{formatAmount(convertAmount(payroll.netSalary, payroll.currency))}</span></td>
                        <td>
                          <div className="flex flex-col gap-1.5">
                            <span className={`badge ${payroll.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                              <i className={`fas ${payroll.status === 'approved' ? 'fa-shield-check' : 'fa-hourglass-half'} text-[10px]`}></i>
                              {payroll.status === 'approved' ? ar('معتمد', 'Approved') : ar('محتسب', 'Calculated')}
                            </span>
                            <span className={`badge text-[10px] ${parseFloat(payroll.calculationNotes?.attendanceRate || '0') >= 90 ? 'badge-success' : 'badge-danger'}`}>
                              {payroll.calculationNotes?.attendanceRate || '0%'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleShowDetails(payroll)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                              style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd' }}
                              onMouseEnter={e => { e.currentTarget.style.background='#0284c7'; e.currentTarget.style.color='white' }}
                              onMouseLeave={e => { e.currentTarget.style.background='#f0f9ff'; e.currentTarget.style.color='#0284c7' }}
                              title={ar('التفاصيل', 'Details')}>
                              <i className="fas fa-eye text-xs"></i>
                            </button>
                            {hasPermission('edit_payroll') && (
                              <button onClick={() => handleEditPayroll(payroll)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                                style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}
                                onMouseEnter={e => { e.currentTarget.style.background='#4f46e5'; e.currentTarget.style.color='white' }}
                                onMouseLeave={e => { e.currentTarget.style.background='#eef2ff'; e.currentTarget.style.color='#4f46e5' }}
                                title={ar('تعديل', 'Edit')}>
                                <i className="fas fa-pen text-xs"></i>
                              </button>
                            )}
                            {(payroll.status === 'calculated' && hasPermission('approve_payroll')) && (
                              <button onClick={() => handleApprovePayroll(payroll)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                                style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}
                                onMouseEnter={e => { e.currentTarget.style.background='#059669'; e.currentTarget.style.color='white' }}
                                onMouseLeave={e => { e.currentTarget.style.background='#ecfdf5'; e.currentTarget.style.color='#059669' }}
                                title={ar('اعتماد', 'Approve')}>
                                <i className="fas fa-check text-xs"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><i className="fas fa-money-check-dollar"></i></div>
                <h3 className="empty-title">{ar('لا توجد رواتب محتسبة', 'No Payrolls Calculated')}</h3>
                <p className="empty-desc mb-6">
                  {searchQuery || statusFilter ? ar('لا نتائج مطابقة للفلاتر', 'No matching results for filters') : ar('احسب رواتب هذا الشهر للبدء', 'Calculate this month to get started')}
                </p>
                {hasPermission('calculate_payroll') && !searchQuery && !statusFilter && (
                  <button onClick={calculateMonthlyPayroll} className="btn btn-primary btn-md">
                    <i className="fas fa-calculator"></i> {ar('احتساب الرواتب', 'Calculate Payroll')}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>

        <PayrollModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
          payroll={selectedPayroll} onSave={handleSavePayroll} />
        <CurrencyManager isOpen={isCurrencyManagerOpen}
          onClose={() => { setIsCurrencyManagerOpen(false); loadExchangeRates() }} />

        {/* Details Modal */}
        <AnimatePresence>
          {showDetailsModal && selectedPayrollDetails && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="modal-panel max-w-3xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header"
                     style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                  <div>
                    <h3 className="text-xl font-black text-white">{ar('تفاصيل الراتب —', 'Payroll Details —')} {selectedPayrollDetails.employeeName}</h3>
                    <p className="text-indigo-200 text-sm font-medium mt-0.5">{ar('شهر', 'Month')} {selectedPayrollDetails.month}</p>
                  </div>
                  <button onClick={() => setShowDetailsModal(false)}
                    className="w-9 h-9 rounded-xl bg-white/15 text-white flex items-center justify-center hover:bg-white/25 transition-colors">
                    <i className="fas fa-times text-sm"></i>
                  </button>
                </div>
                {/* Body */}
                <div className="modal-body space-y-6">
                  {/* Formula */}
                  <div className="bg-surface-50 rounded-2xl p-5 border border-surface-200">
                    <h4 className="text-sm font-black text-surface-700 mb-4 flex items-center gap-2">
                      <i className="fas fa-calculator text-brand-500"></i> {ar('معادلة الحساب', 'Calculation Formula')}
                    </h4>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
                      {[
                        { label: ar('الراتب الأساسي', 'Base Salary'), val: selectedPayrollDetails.basicSalary, color: 'text-surface-700' },
                        { op: '+' },
                        { label: ar('البدلات', 'Allowances'), val: selectedPayrollDetails.totalAllowances, color: 'text-success' },
                        { op: '=' },
                        { label: ar('الإجمالي', 'Gross'), val: selectedPayrollDetails.grossSalary, color: 'text-brand-600' },
                        { op: '−' },
                        { label: ar('الخصومات', 'Deductions'), val: selectedPayrollDetails.totalDeductions, color: 'text-danger' },
                        { op: '=' },
                        { label: ar('الصافي', 'Net'), val: selectedPayrollDetails.netSalary, color: 'text-success', big: true },
                      ].map((item, i) =>
                        item.op ? (
                          <span key={i} className="text-surface-400 font-black text-lg">{item.op}</span>
                        ) : (
                          <div key={i} className="bg-white rounded-xl border border-surface-200 p-3 flex-1 min-w-0">
                            <p className="text-xs font-bold text-surface-500 mb-1">{item.label}</p>
                            <p className={`${item.big ? 'text-xl' : 'text-base'} font-black ${item.color}`}>
                              {formatAmount(convertAmount(item.val, selectedPayrollDetails.currency))}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  {/* Mini stats */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: ar('أيام العمل', 'Working Days'), val: `${selectedPayrollDetails.workingDays}/${selectedPayrollDetails.workingDaysInMonth}`, icon: 'fa-calendar', color: 'bg-sky-50 text-sky-600' },
                      { label: ar('معدل الحضور', 'Attendance Rate'), val: selectedPayrollDetails.calculationNotes?.attendanceRate || '0%', icon: 'fa-percent', color: parseFloat(selectedPayrollDetails.calculationNotes?.attendanceRate || '0') >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-danger-light text-danger' },
                      { label: ar('أيام الغياب', 'Absent Days'), val: selectedPayrollDetails.absentDays || 0, icon: 'fa-calendar-xmark', color: 'bg-danger-light text-danger' },
                    ].map((s, i) => (
                      <div key={i} className="bg-white rounded-xl border border-surface-200 p-4 text-center">
                        <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mx-auto mb-2`}>
                          <i className={`fas ${s.icon} text-sm`}></i>
                        </div>
                        <p className="text-lg font-black text-surface-900">{s.val}</p>
                        <p className="text-xs font-bold text-surface-500 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Layout>
    </ProtectedRoute>
  )
}
