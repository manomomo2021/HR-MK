import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import { motion, AnimatePresence } from 'framer-motion'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, ArcElement, BarElement, Filler
} from 'chart.js'
import { useData } from '../contexts/DataContext'
import { useLanguage } from '../contexts/LanguageContext'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, ArcElement, BarElement, Filler)

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu']

const KpiCard = ({ label, value, sub, icon, grad, delay }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-white/10 transition-colors">
    <div className={`absolute inset-0 bg-gradient-to-br ${grad} opacity-0 group-hover:opacity-5 transition-opacity`} />
    <div className="relative z-10">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center mb-3 shadow-lg`}>
        <i className={`fas ${icon} text-white text-sm`}></i>
      </div>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-black text-white mt-1">{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  </motion.div>
)

const SectionTitle = ({ icon, title, color = 'from-cyan-500 to-blue-500' }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow`}>
      <i className={`fas ${icon} text-white text-xs`}></i>
    </div>
    <h2 className="text-white font-black text-lg">{title}</h2>
  </div>
)

const ChartCard = ({ title, icon, children, span = '' }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className={`bg-slate-900/60 border border-white/5 rounded-2xl p-6 ${span}`}>
    {title && <SectionTitle icon={icon} title={title} />}
    {children}
  </motion.div>
)

export default function Analytics() {
  const { employees = [], attendance = [], payroll = [] } = useData()
  const { language, isRtl } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e
  const [tab, setTab] = useState('overview')
  const [timeRange, setTimeRange] = useState('30d')

  const MONTHS = language === 'ar' ? MONTHS_AR : MONTHS_EN
  const DAYS = language === 'ar' ? DAYS_AR : DAYS_EN

  const stats = useMemo(() => {
    const total = employees.length
    const active = employees.filter(e => e.status !== 'inactive').length
    const totalSalary = employees.reduce((s, e) => s + (parseFloat(e.basicSalary || e.salary) || 0), 0)
    const avgSalary = total ? (totalSalary / total) : 0
    const depts = {}
    employees.forEach(e => { const d = e.department || ar('غير محدد', 'Unspecified'); depts[d] = (depts[d] || 0) + 1 })
    const contracts = { permanent: 0, temporary: 0 }
    employees.forEach(e => { const c = e.contractType || e.contract_type || 'permanent'; contracts[c] = (contracts[c] || 0) + 1 })
    const genders = { male: 0, female: 0 }
    employees.forEach(e => { if (e.gender === 'male') genders.male++; else if (e.gender === 'female') genders.female++ })
    return { total, active, totalSalary, avgSalary, depts, contracts, genders }
  }, [employees])

  const trendsChart = useMemo(() => ({
    labels: MONTHS.slice(0, 6),
    datasets: [
      { label: ar('الحضور %', 'Attendance %'), data: [85, 87, 82, 89, 91, 88], borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)', tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 7 },
      { label: ar('الإنتاجية %', 'Productivity %'), data: [78, 82, 79, 85, 88, 86], borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 7 },
      { label: ar('الرضا الوظيفي', 'Job Satisfaction'), data: [72, 75, 73, 78, 82, 80], borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 7 },
    ]
  }), [timeRange])

  const deptChart = useMemo(() => {
    const labels = Object.keys(stats.depts)
    const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899']
    return { labels, datasets: [{ data: Object.values(stats.depts), backgroundColor: PALETTE.slice(0, labels.length).map(c => c + 'cc'), borderColor: PALETTE.slice(0, labels.length), borderWidth: 2, hoverOffset: 8 }] }
  }, [stats.depts])

  const contractChart = useMemo(() => ({
    labels: [ar('دائم', 'Permanent'), ar('مؤقت', 'Temporary')],
    datasets: [{ data: [stats.contracts.permanent, stats.contracts.temporary], backgroundColor: ['rgba(99,102,241,0.7)', 'rgba(245,158,11,0.7)'], borderColor: ['#6366f1', '#f59e0b'], borderWidth: 2, hoverOffset: 8 }]
  }), [stats.contracts])

  const genderChart = useMemo(() => ({
    labels: [ar('ذكور', 'Male'), ar('إناث', 'Female')],
    datasets: [{ data: [stats.genders.male, stats.genders.female], backgroundColor: ['rgba(6,182,212,0.7)', 'rgba(236,72,153,0.7)'], borderColor: ['#06b6d4', '#ec4899'], borderWidth: 2, hoverOffset: 8 }]
  }), [stats.genders])

  const salaryDistChart = useMemo(() => {
    const bands = [
      { label: ar('أقل من 3K', 'Under 3K'), min: 0, max: 3000 },
      { label: '3K - 5K', min: 3000, max: 5000 },
      { label: '5K - 8K', min: 5000, max: 8000 },
      { label: '8K - 12K', min: 8000, max: 12000 },
      { label: ar('أكثر من 12K', 'Over 12K'), min: 12000, max: Infinity },
    ]
    const counts = bands.map(b => employees.filter(e => { const s = parseFloat(e.basicSalary || e.salary) || 0; return s >= b.min && s < b.max }).length)
    return { labels: bands.map(b => b.label), datasets: [{ label: ar('عدد الموظفين', 'Employees'), data: counts, backgroundColor: ['rgba(99,102,241,0.7)', 'rgba(6,182,212,0.7)', 'rgba(34,197,94,0.7)', 'rgba(245,158,11,0.7)', 'rgba(239,68,68,0.7)'], borderColor: ['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'], borderWidth: 2, borderRadius: 8 }] }
  }, [employees])

  const heatmap = useMemo(() => {
    const hours = ['8', '9', '10', '11', '12', '13', '14', '15', '16']
    return { days: DAYS, hours, data: DAYS.map(() => hours.map(() => Math.floor(Math.random() * 100))) }
  }, [timeRange])

  const predictionsChart = useMemo(() => ({
    labels: MONTHS.slice(6),
    datasets: [
      { label: ar('تفاؤلي', 'Optimistic'), data: [92, 94, 91, 93, 95, 97], borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)', borderDash: [6, 4], tension: 0.4, fill: true, pointRadius: 4 },
      { label: ar('واقعي', 'Realistic'), data: [89, 90, 88, 89, 91, 92], borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', borderDash: [6, 4], tension: 0.4, fill: true, pointRadius: 4 },
      { label: ar('متحفظ', 'Conservative'), data: [85, 86, 84, 85, 87, 88], borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', borderDash: [6, 4], tension: 0.4, fill: true, pointRadius: 4 },
    ]
  }), [timeRange])

  const GENDER_LABEL = { male: ar('ذكر', 'Male'), female: ar('أنثى', 'Female') }
  const CONTRACT_LABEL = { permanent: ar('دائم', 'Permanent'), temporary: ar('مؤقت', 'Temporary') }
  const MARITAL_LABEL = { single: ar('أعزب', 'Single'), married: ar('متجوز', 'Married'), divorced: ar('مطلق', 'Divorced'), widowed: ar('أرمل', 'Widowed') }

  const TABS = [
    { key: 'overview', label: ar('نظرة عامة', 'Overview'), icon: 'fa-chart-pie' },
    { key: 'attendance', label: ar('الحضور', 'Attendance'), icon: 'fa-calendar-check' },
    { key: 'salary', label: ar('الرواتب', 'Salary'), icon: 'fa-coins' },
    { key: 'predictions', label: ar('التوقعات', 'Predictions'), icon: 'fa-brain' },
  ]

  const TIME_RANGES = [
    { key: '7d', label: ar('7 أيام', '7 Days') },
    { key: '30d', label: ar('شهر', 'Month') },
    { key: '90d', label: ar('3 أشهر', '3 Months') },
    { key: '1y', label: ar('سنة', 'Year') },
  ]

  return (
    <ProtectedRoute>
      <Layout>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <i className="fas fa-chart-mixed text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">{ar('التقارير والتحليلات', 'Reports & Analytics')}</h1>
                <p className="text-slate-400 text-sm mt-0.5">{ar('رؤى شاملة وتحليلات ذكية لاتخاذ قرارات أفضل', 'Comprehensive insights for better decisions')}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-900/60 border border-white/5 rounded-xl p-1">
                {TIME_RANGES.map(r => (
                  <button key={r.key} onClick={() => setTimeRange(r.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${timeRange === r.key ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard delay={0} label={ar('إجمالي الموظفين', 'Total Employees')} value={stats.total} icon="fa-users" grad="from-cyan-500 to-blue-500" sub={ar(`${stats.active} نشط`, `${stats.active} active`)} />
            <KpiCard delay={0.07} label={ar('متوسط الراتب', 'Avg Salary')} value={`${stats.avgSalary.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: 0 })}`} icon="fa-coins" grad="from-emerald-500 to-teal-500" sub={ar('شهرياً', 'Monthly')} />
            <KpiCard delay={0.14} label={ar('إجمالي الرواتب', 'Total Payroll')} value={`${(stats.totalSalary / 1000).toFixed(0)}K`} icon="fa-wallet" grad="from-violet-500 to-purple-500" sub={ar('شهرياً', 'Monthly')} />
            <KpiCard delay={0.21} label={ar('عدد الأقسام', 'Departments')} value={Object.keys(stats.depts).length} icon="fa-sitemap" grad="from-rose-500 to-pink-500" sub={ar('قسم نشط', 'Active')} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer border ${tab === t.key ? 'bg-violet-600/20 border-violet-500/40 text-violet-300' : 'bg-slate-900/40 border-white/5 text-slate-400 hover:text-white hover:border-white/10'}`}>
                <i className={`fas ${t.icon} text-xs`}></i> {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title={ar('اتجاهات الستة أشهر الماضية', '6-Month Trends')} icon="fa-chart-line" span="lg:col-span-2">
                  <div className="flex items-center gap-4 mb-4 text-xs">
                    {[{ c: '#22c55e', l: ar('الحضور %', 'Attendance %') }, { c: '#6366f1', l: ar('الإنتاجية %', 'Productivity %') }, { c: '#f59e0b', l: ar('الرضا', 'Satisfaction') }].map(x => (
                      <span key={x.l} className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-3 rounded-sm" style={{ background: x.c }}></span>{x.l}</span>
                    ))}
                  </div>
                  <div className="h-64"><Line data={trendsChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 12 } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } }, min: 60, max: 100 } } }} /></div>
                </ChartCard>
                <ChartCard title={ar('توزيع الأقسام', 'Dept Distribution')} icon="fa-sitemap" span="">
                  <div className="h-64 flex items-center justify-center">
                    {employees.length ? <Doughnut data={deptChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12, padding: 10 } } }, cutout: '65%' }} /> : <p className="text-slate-600 text-sm">{ar('لا توجد بيانات', 'No data')}</p>}
                  </div>
                </ChartCard>
                <ChartCard title={ar('خريطة حرارة الحضور', 'Attendance Heatmap')} icon="fa-fire" span="lg:col-span-2">
                  <div className="overflow-x-auto">
                    <div className="min-w-max">
                      <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `80px repeat(${heatmap.hours.length}, 1fr)` }}>
                        <div></div>
                        {heatmap.hours.map(h => <div key={h} className="text-center text-[10px] text-slate-500 font-bold">{h}:00</div>)}
                      </div>
                      {heatmap.days.map((day, di) => (
                        <div key={day} className="grid gap-1 mb-1" style={{ gridTemplateColumns: `80px repeat(${heatmap.hours.length}, 1fr)` }}>
                          <div className="text-[11px] text-slate-400 font-bold flex items-center">{day}</div>
                          {heatmap.data[di].map((v, hi) => (
                            <div key={hi} title={`${v}%`}
                              className="h-7 rounded text-[10px] flex items-center justify-center font-bold text-white/80 transition-transform hover:scale-110 cursor-default"
                              style={{ background: v > 80 ? 'rgba(34,197,94,0.7)' : v > 60 ? 'rgba(245,158,11,0.6)' : v > 40 ? 'rgba(249,115,22,0.6)' : 'rgba(239,68,68,0.6)' }}>{v}</div>
                          ))}
                        </div>
                      ))}
                      <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-500">
                        {[['#22c55e', '80%+'], ['#f59e0b', '60-80%'], ['#f97316', '40-60%'], ['#ef4444', ar('أقل من 40%', 'Below 40%')]].map(([c, l]) => (
                          <span key={l} className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: c }}></span>{l}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </ChartCard>
                <div className="space-y-5">
                  <ChartCard title={ar('توزيع الجنس', 'Gender')} icon="fa-venus-mars">
                    <div className="h-36 flex items-center justify-center"><Doughnut data={genderChart} options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: true, position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 } } } }} /></div>
                  </ChartCard>
                  <ChartCard title={ar('نوع العقد', 'Contract Type')} icon="fa-file-contract">
                    <div className="h-36 flex items-center justify-center"><Doughnut data={contractChart} options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: true, position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 } } } }} /></div>
                  </ChartCard>
                </div>
              </motion.div>
            )}
            {tab === 'attendance' && (
              <motion.div key="attendance" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title={ar('معدل الحضور الشهري', 'Monthly Attendance')} icon="fa-calendar-check" span="lg:col-span-2">
                  <div className="h-72"><Bar data={{ labels: MONTHS.slice(0, 6), datasets: [
                    { label: ar('حاضر', 'Present'), data: [87, 89, 85, 91, 93, 90], backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 8, borderSkipped: false },
                    { label: ar('غائب', 'Absent'), data: [13, 11, 15, 9, 7, 10], backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 8, borderSkipped: false },
                  ]}} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { color: '#94a3b8', font: { size: 11 } } }, tooltip: { backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 12 } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } } } }} /></div>
                </ChartCard>
                <ChartCard title={ar('التأخيرات (دقيقة متوسطة)', 'Avg Late (min)')} icon="fa-clock">
                  <div className="h-64"><Line data={{ labels: MONTHS.slice(0, 6), datasets: [{ label: ar('متوسط التأخير', 'Avg Late'), data: [12, 8, 15, 6, 4, 9], borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', tension: 0.4, fill: true, pointRadius: 4 }]}} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 12 } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } } } }} /></div>
                </ChartCard>
                <ChartCard title={ar('أيام الإجازة الشهرية', 'Monthly Leave Days')} icon="fa-plane-departure">
                  <div className="h-64"><Bar data={{ labels: MONTHS.slice(0, 6), datasets: [{ label: ar('أيام إجازة', 'Leave Days'), data: [45, 38, 52, 29, 33, 40], backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 8, borderSkipped: false }]}} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 12 } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } } } }} /></div>
                </ChartCard>
              </motion.div>
            )}
            {tab === 'salary' && (
              <motion.div key="salary" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title={ar('توزيع الرواتب', 'Salary Distribution')} icon="fa-coins" span="lg:col-span-2">
                  <div className="h-72"><Bar data={salaryDistChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 12 } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } } } }} /></div>
                </ChartCard>
                <ChartCard title={ar('إجمالي الرواتب الشهرية', 'Monthly Total')} icon="fa-money-bill-wave">
                  <div className="h-64"><Line data={{ labels: MONTHS.slice(0, 6), datasets: [{ label: ar('إجمالي الرواتب', 'Total Payroll'), data: [80000, 82000, 81000, 85000, 88000, 87000].map(v => (v * (stats.total || 1) / 100)), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)', tension: 0.4, fill: true, pointRadius: 4 }]}} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 12 } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } } } }} /></div>
                </ChartCard>
                <ChartCard title={ar('متوسط الراتب بالقسم', 'Avg Salary by Dept')} icon="fa-table">
                  <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                    {Object.entries(stats.depts).map(([dept, count]) => {
                      const depEmps = employees.filter(e => (e.department || ar('غير محدد', 'Unspecified')) === dept)
                      const avg = depEmps.length ? depEmps.reduce((s, e) => s + (parseFloat(e.basicSalary || e.salary) || 0), 0) / depEmps.length : 0
                      const pct = stats.avgSalary ? Math.min((avg / (stats.avgSalary * 2)) * 100, 100) : 0
                      return (
                        <div key={dept}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-300 font-bold truncate max-w-[60%]">{dept}</span>
                            <span className="text-slate-400 text-xs">{avg.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: 0 })} · {count} {ar('موظف', 'emp')}</span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full">
                            <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                    {!Object.keys(stats.depts).length && <p className="text-slate-600 text-sm text-center py-8">{ar('لا توجد بيانات', 'No data')}</p>}
                  </div>
                </ChartCard>
              </motion.div>
            )}
            {tab === 'predictions' && (
              <motion.div key="predictions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { icon: 'fa-arrow-trend-up', grad: 'from-emerald-500 to-teal-500', label: ar('تحسن الحضور', 'Attendance Up'), value: '+12%', desc: ar('مقارنة بالشهر الماضي', 'Vs last month') },
                    { icon: 'fa-triangle-exclamation', grad: 'from-amber-500 to-orange-500', label: ar('تأخيرات الاثنين', 'Monday Lates'), value: '+8%', desc: ar('زيادة ملحوظة', 'Notable increase') },
                    { icon: 'fa-bolt', grad: 'from-cyan-500 to-blue-500', label: ar('ذروة الإنتاجية', 'Productivity Peak'), value: '95%', desc: ar('10-11 صباحاً', '10-11 AM') },
                    { icon: 'fa-arrow-trend-down', grad: 'from-rose-500 to-pink-500', label: ar('وقت إضافي أقل', 'Less OT'), value: '-15%', desc: ar('تحسن في الكفاءة', 'Efficiency gains') },
                  ].map((ins, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                      className="bg-slate-900/60 border border-white/5 rounded-2xl p-5">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ins.grad} flex items-center justify-center mb-3`}>
                        <i className={`fas ${ins.icon} text-white text-sm`}></i>
                      </div>
                      <p className="text-slate-400 text-xs mb-0.5">{ins.label}</p>
                      <p className="text-2xl font-black text-white">{ins.value}</p>
                      <p className="text-slate-600 text-xs mt-1">{ins.desc}</p>
                    </motion.div>
                  ))}
                </div>
                <ChartCard title={ar('التوقعات للنصف الثاني من العام', 'H2 Predictions')} icon="fa-brain">
                  <div className="h-80"><Line data={predictionsChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 12 } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } }, min: 80, max: 100 } } }} /></div>
                </ChartCard>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Layout>
    </ProtectedRoute>
  )
}
