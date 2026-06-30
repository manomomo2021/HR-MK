import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useLanguage } from '../contexts/LanguageContext'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, ArcElement, BarElement, Filler
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, ArcElement, BarElement, Filler)

// Premium chart defaults
ChartJS.defaults.color = '#7d849d'
ChartJS.defaults.borderColor = '#eef0f4'
ChartJS.defaults.font.family = "'Cairo', sans-serif"
ChartJS.defaults.font.weight = '600'
ChartJS.defaults.plugins.tooltip.backgroundColor = '#14161d'
ChartJS.defaults.plugins.tooltip.titleColor = '#ffffff'
ChartJS.defaults.plugins.tooltip.bodyColor = '#a5abbd'
ChartJS.defaults.plugins.tooltip.padding = 14
ChartJS.defaults.plugins.tooltip.cornerRadius = 12
ChartJS.defaults.plugins.tooltip.displayColors = false

// ── Animation variants ──
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } }
}
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
}
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
}

// ── Animated Counter ──
const AnimatedCounter = ({ value, decimals = 0, prefix = '', suffix = '' }) => {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0
          const end = parseFloat(value) || 0
          const duration = 1500
          const startTime = Date.now()
          const tick = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            start = end * eased
            setDisplay(start)
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value])

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  )
}

// ── KPI Card ──
const KpiCard = ({ label, value, icon, trend, trendLabel, color, chart }) => (
  <motion.div
    variants={item}
    className="stat-card group"
  >
    {/* Gradient bar */}
    <div className={`absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r ${color.bar} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

    {/* Glow effect on hover */}
    <div className={`absolute -inset-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl blur-xl ${color.glow}`} />

    <div className="relative z-10">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-2xl ${color.bg} flex items-center justify-center shadow-sm`}>
          <i className={`fas ${icon} ${color.icon} text-lg`}></i>
        </div>
        {chart && (
          <div className="w-16 h-10 opacity-50">
            <svg viewBox="0 0 60 30" className="w-full h-full">
              <path d={chart} fill="none" stroke="currentColor" strokeWidth="2" className={color.chart} />
            </svg>
          </div>
        )}
      </div>

      <p className="text-3xl font-black text-surface-900 tracking-tight leading-none mb-1">
        <AnimatedCounter value={value} />
      </p>
      <p className="text-sm font-bold text-surface-400 mb-4">{label}</p>

      {trend !== undefined && (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black
          ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : trend < 0 ? 'bg-rose-50 text-rose-600' : 'bg-surface-100 text-surface-500'}`}>
          <i className={`fas ${trend > 0 ? 'fa-arrow-trend-up' : trend < 0 ? 'fa-arrow-trend-down' : 'fa-minus'} text-[8px]`}></i>
          {trendLabel || (trend > 0 ? `+${trend}%` : `${trend}%`)}
        </div>
      )}
    </div>

    {/* Background glyph */}
    <div className={`absolute -bottom-4 -right-4 text-[80px] ${color.glyph} pointer-events-none select-none opacity-60`}>
      <i className={`fas ${icon}`}></i>
    </div>
  </motion.div>
)

// ── Glass Widget ──
const Widget = ({ title, subtitle, icon, actions, children, className = '', headerColor = '' }) => (
  <motion.div
    variants={item}
    className={`card p-6 ${className}`}
  >
    <div className={`flex items-center justify-between mb-5 ${headerColor}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${icon.bg || 'bg-brand-50'} ${icon.color || 'text-brand-600'}`}>
            <i className={`fas ${icon.name} text-sm`}></i>
          </div>
        )}
        <div>
          <h3 className="text-sm font-black text-surface-900 leading-tight">{title}</h3>
          {subtitle && <p className="text-[11px] font-bold text-surface-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
    {children}
  </motion.div>
)

// ── Activity Item ──
const Activity = ({ icon, text, time, color }) => (
  <div className="flex items-start gap-3.5 group cursor-pointer p-2 -mx-2 rounded-xl hover:bg-surface-50 transition-all">
    <div className={`w-9 h-9 rounded-xl ${color.bg} ${color.text} flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm`}>
      <i className={`fas ${icon} text-sm`}></i>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-surface-700 leading-snug group-hover:text-surface-900 transition-colors">{text}</p>
      <p className="text-[11px] text-surface-400 font-bold mt-1">{time}</p>
    </div>
    <i className="fas fa-chevron-left text-surface-200 text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity"></i>
  </div>
)

// ── Quick Action ──
const QuickActionBtn = ({ href, icon, label, gradient }) => (
  <Link href={href}>
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${gradient}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}
           style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)' }}>
        <i className={`fas ${icon} text-sm`} style={{ color: 'inherit' }}></i>
      </div>
      <span className="font-bold text-sm" style={{ color: 'inherit' }}>{label}</span>
      <i className="fas fa-arrow-left mr-auto text-xs opacity-40" style={{ color: 'inherit' }}></i>
    </motion.div>
  </Link>
)

// ── Mini Progress ──
const colorMap = {
  brand: { text: 'text-brand-600', from: 'from-brand-500', to: 'to-brand-400' },
  emerald: { text: 'text-emerald-600', from: 'from-emerald-500', to: 'to-emerald-400' },
  amber: { text: 'text-amber-600', from: 'from-amber-500', to: 'to-amber-400' },
  rose: { text: 'text-rose-600', from: 'from-rose-500', to: 'to-rose-400' },
  sky: { text: 'text-sky-600', from: 'from-sky-500', to: 'to-sky-400' },
  violet: { text: 'text-violet-600', from: 'from-violet-500', to: 'to-violet-400' },
  emeraldAlt: { text: 'text-emerald-600', from: 'from-emerald-500', to: 'to-emerald-400' },
}

const MiniProgress = ({ label, value, color = 'brand', showPercent = true }) => {
  const cc = colorMap[color] || colorMap.brand
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-surface-500">{label}</span>
        {showPercent && <span className={`text-xs font-black ${cc.text}`}>{value}%</span>}
      </div>
      <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className={`h-full rounded-full bg-gradient-to-r ${cc.from} ${cc.to}`}
        />
      </div>
    </div>
  )
}

// ── Main Component ──
export default function Dashboard() {
  const { user } = useAuth()
  const { employees, loading } = useData()
  const { t, language, isRtl, formatDate, formatTime, locale } = useLanguage()
  const [activeChart, setChart] = useState('attendance')
  const [chartData, setChartData] = useState(null)
  const [doughnutData, setDoughnut] = useState(null)
  const [barData, setBar] = useState(null)
  const [currentTime, setTime] = useState(new Date())
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0, onLeave: 0, totalSalary: 0 })
  const [greeting, setGreeting] = useState('')

  // Clock
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Greeting
  useEffect(() => {
    const h = new Date().getHours()
    const isAr = language === 'ar'
    if (h < 12) setGreeting(isAr ? 'صباح الخير' : 'Good Morning')
    else if (h < 17) setGreeting(isAr ? 'مساء الخير' : 'Good Afternoon')
    else setGreeting(isAr ? 'مساء النور' : 'Good Evening')
  }, [language])

  // Stats
  useEffect(() => {
    if (!loading) {
      const total = employees?.length || 0
      const present = Math.floor(total * 0.84)
      const late = Math.floor(total * 0.09)
      const onLeave = Math.floor(total * 0.07)
      const totalSalary = (employees || []).reduce((s, e) => s + (parseFloat(e.salary) || 0), 0)
      setStats({ total, present, late, onLeave, totalSalary })
    }
  }, [loading, employees])

  // Chart data
  useEffect(() => {
    const days = []
    const vals = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      days.push(d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' }))
      vals.push(Math.floor(Math.random() * 10) + 80)
    }

    setChartData({
      labels: days,
      datasets: [{
        label: language === 'ar' ? 'نسبة الحضور %' : 'Attendance Rate %',
        data: vals,
        borderColor: '#6d4aff',
        backgroundColor: (ctx) => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 240)
          g.addColorStop(0, 'rgba(109,74,255,0.20)')
          g.addColorStop(0.5, 'rgba(109,74,255,0.08)')
          g.addColorStop(1, 'rgba(109,74,255,0.00)')
          return g
        },
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#6d4aff',
        pointBorderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointHoverBorderWidth: 3,
        borderWidth: 3,
      }]
    })

    const doughnutLabels = language === 'ar'
      ? ['حاضر', 'متأخر', 'غائب', 'إجازة']
      : ['Present', 'Late', 'Absent', 'On Leave']
    setDoughnut({
      labels: doughnutLabels,
      datasets: [{
        data: [stats.present, stats.late, Math.max(stats.total - stats.present - stats.onLeave, 0), stats.onLeave],
        backgroundColor: ['#6d4aff', '#f7a51e', '#e11937', '#007aff'],
        borderColor: ['#ffffff','#ffffff','#ffffff','#ffffff'],
        borderWidth: 3,
        hoverOffset: 10,
      }]
    })

    setBar({
      labels: language === 'ar' ? ['HR', 'تقنية', 'مالية', 'عمليات', 'تسويق', 'قانوني'] : ['HR', 'IT', 'Finance', 'Ops', 'Marketing', 'Legal'],
      datasets: [{
        label: language === 'ar' ? 'الموظفون' : 'Employees',
        data: [8, 15, 11, 19, 7, 5],
        backgroundColor: (ctx) => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200)
          g.addColorStop(0, 'rgba(109,74,255,0.85)')
          g.addColorStop(1, 'rgba(139,111,255,0.35)')
          return g
        },
        borderRadius: 8,
        borderSkipped: false,
      }]
    })
  }, [stats])

  // Chart options
  const lineOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (c) => `${c.parsed.y}%`,
        }
      }
    },
    scales: {
      y: {
        min: 60,
        max: 100,
        grid: { color: '#eef0f4', drawBorder: false },
        border: { dash: [4, 4], display: false },
        ticks: { font: { size: 10, weight: '600' }, color: '#a5abbd', stepSize: 10 }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10, weight: '600' }, color: '#a5abbd' }
      },
    },
    interaction: { mode: 'index', intersect: false },
  }

  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#5f647b',
          padding: 16,
          font: { weight: '600', size: 11 },
          usePointStyle: true,
          pointStyle: 'circle',
        }
      },
      tooltip: {
        callbacks: {
          label: (c) => `${c.label}: ${c.parsed} ${language === 'ar' ? 'موظف' : 'emp'}`,
        }
      }
    },
    cutout: '75%',
  }

  const barOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (c) => `${c.parsed.y} ${language === 'ar' ? 'موظف' : 'emp'}`,
        }
      }
    },
    scales: {
      y: {
        grid: { color: '#eef0f4', drawBorder: false },
        border: { display: false },
        ticks: { font: { size: 10, weight: '600' }, color: '#a5abbd', stepSize: 5 }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10, weight: '600' }, color: '#a5abbd' }
      },
    },
  }

  // Sparkline paths
  const sparklines = [
    'M0,25 Q5,5 10,20 T20,10 T30,18 T40,8 T50,15 T60,5',
    'M0,20 Q5,15 10,22 T20,8 T30,12 T40,5 T50,18 T60,10',
    'M0,15 Q5,25 10,10 T20,20 T30,5 T40,18 T50,8 T60,12',
    'M0,22 Q5,8 10,18 T20,12 T30,20 T40,5 T50,15 T60,8',
  ]

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-surface-400 font-bold text-sm">{language === 'ar' ? 'جارٍ تحميل البيانات...' : 'Loading data...'}</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Layout>
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

          {/* ═══════════════════════════════════════════════════════
              HERO HEADER
          ═══════════════════════════════════════════════════════ */}
          <motion.div
            variants={fadeUp}
            className="relative overflow-hidden rounded-3xl p-8 text-white"
            style={{
              background: 'linear-gradient(135deg, #1e0f52 0%, #6d4aff 40%, #5930e5 70%, #331a82 100%)',
              boxShadow: '0 20px 60px rgba(109,74,255,0.25)',
            }}
          >
            {/* Animated background orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                animate={{ scale: [1, 1.3, 1], x: [0, 40, 0], y: [0, -30, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%)' }}
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1], x: [0, -30, 0], y: [0, 30, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, rgba(139,111,255,0.4) 0%, transparent 60%)' }}
              />
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.15, 0.08] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
                className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(255,90,46,0.2) 0%, transparent 60%)' }}
              />
              {/* Grid pattern */}
              <div className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />
            </div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                {/* Left: Greeting */}
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20
                               text-indigo-200 text-[10px] font-black mb-4 backdrop-blur-sm"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50"></span>
                    {language === 'ar' ? 'النظام يعمل بكفاءة كاملة' : 'System fully operational'}
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="text-3xl sm:text-4xl font-black tracking-tight mb-1.5"
                  >
                    {greeting}, {user?.name?.split(' ')[0]} <span className="inline-block animate-bounce-subtle">👋</span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="text-indigo-200/80 font-medium text-sm"
                  >
                    {formatDate(currentTime)}
                  </motion.p>
                </div>

                {/* Right: Time + Weather widgets */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-3"
                >
                  {/* Time */}
                  <div className="px-5 py-3.5 rounded-2xl bg-white/8 border border-white/15 backdrop-blur-md text-center min-w-[120px]">
                    <p className="text-2xl font-black tabular-nums tracking-tight">
                      {formatTime(currentTime)}
                    </p>
                    <p className="text-indigo-200/70 text-[10px] font-bold mt-1">{language === 'ar' ? 'الوقت الحالي' : 'Current Time'}</p>
                  </div>
                  {/* Weather */}
                  <div className="px-5 py-3.5 rounded-2xl bg-white/8 border border-white/15 backdrop-blur-md text-center min-w-[120px]">
                    <p className="text-2xl font-black">🌤️ 28°</p>
                    <p className="text-indigo-200/70 text-[10px] font-bold mt-1">{language === 'ar' ? 'مشمس جزئياً' : 'Partly Sunny'}</p>
                  </div>
                  {/* Date quick */}
                  <div className="hidden sm:block px-5 py-3.5 rounded-2xl bg-white/8 border border-white/15 backdrop-blur-md text-center min-w-[120px]">
                    <p className="text-2xl font-black tabular-nums">
                      {currentTime.getDate()}
                    </p>
                    <p className="text-indigo-200/70 text-[10px] font-bold mt-1">
                      {currentTime.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' })}
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Quick stats bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8"
              >
                {[
                  { label: language === 'ar' ? 'إجمالي الرواتب' : 'Total Payroll', value: `${(stats.totalSalary / 1000).toFixed(1)}K`, icon: 'fa-money-bills' },
                  { label: language === 'ar' ? 'معدل الحضور' : 'Attendance Rate', value: '94%', icon: 'fa-chart-line' },
                  { label: language === 'ar' ? 'الأقسام النشطة' : 'Active Depts', value: '6', icon: 'fa-building' },
                  { label: language === 'ar' ? 'سنوات الخدمة' : 'Service Years', value: `${Math.floor(Math.random() * 5) + 3}+`, icon: 'fa-calendar' },
                ].map((s, i) => (
                  <div key={i} className="px-4 py-3 rounded-xl bg-white/8 border border-white/10 backdrop-blur-sm
                                            hover:bg-white/12 transition-all cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <i className={`fas ${s.icon} text-indigo-300/70 text-sm`}></i>
                      <span className="text-indigo-200/80 text-[10px] font-bold">{s.label}</span>
                    </div>
                    <p className="text-xl font-black mt-1">{s.value}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>

          {/* ═══════════════════════════════════════════════════════
              KPI CARDS ROW
          ═══════════════════════════════════════════════════════ */}
          <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <KpiCard
              label={language === 'ar' ? 'إجمالي الموظفين' : 'Total Employees'}
              value={stats.total}
              icon="fa-users"
              trend={12}
              chart={sparklines[0]}
              color={{
                bar: 'from-brand-500 to-accent-500',
                bg: 'bg-brand-50', icon: 'text-brand-600',
                glyph: 'text-brand-100/80',
                chart: 'stroke-brand-400',
                glow: 'bg-brand-500/5',
              }}
            />
            <KpiCard
              label={language === 'ar' ? 'حاضرون اليوم' : 'Present Today'}
              value={stats.present}
              icon="fa-circle-check"
              trend={5}
              chart={sparklines[1]}
              color={{
                bar: 'from-emerald-400 to-teal-500',
                bg: 'bg-emerald-50', icon: 'text-emerald-600',
                glyph: 'text-emerald-100/80',
                chart: 'stroke-emerald-400',
                glow: 'bg-emerald-500/5',
              }}
            />
            <KpiCard
              label={language === 'ar' ? 'متأخرون اليوم' : 'Late Today'}
              value={stats.late}
              icon="fa-clock"
              trend={-3}
              chart={sparklines[2]}
              color={{
                bar: 'from-amber-400 to-orange-500',
                bg: 'bg-amber-50', icon: 'text-amber-600',
                glyph: 'text-amber-100/80',
                chart: 'stroke-amber-400',
                glow: 'bg-amber-500/5',
              }}
            />
            <KpiCard
              label={language === 'ar' ? 'في إجازة' : 'On Leave'}
              value={stats.onLeave}
              icon="fa-umbrella-beach"
              trendLabel={language === 'ar' ? 'ثابت' : 'Stable'}
              trend={0}
              chart={sparklines[3]}
              color={{
                bar: 'from-sky-400 to-blue-500',
                bg: 'bg-sky-50', icon: 'text-sky-600',
                glyph: 'text-sky-100/80',
                chart: 'stroke-sky-400',
                glow: 'bg-sky-500/5',
              }}
            />
          </motion.div>

          {/* ═══════════════════════════════════════════════════════
              CHARTS ROW
          ═══════════════════════════════════════════════════════ */}
          <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Main Line Chart */}
            <div className="xl:col-span-2 card p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500/10 to-brand-600/10 flex items-center justify-center">
                    <i className="fas fa-chart-line text-brand-600 text-sm"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-surface-900">{language === 'ar' ? 'نسبة الحضور اليومية' : 'Daily Attendance Rate'}</h3>
                    <p className="text-[11px] text-surface-400 font-bold mt-0.5">{language === 'ar' ? 'آخر 7 أيام' : 'Last 7 days'}</p>
                  </div>
                </div>
                <div className="flex gap-1 p-1 bg-surface-50 rounded-xl border border-surface-200">
                  {[
                    { id: 'attendance', label: language === 'ar' ? 'الحضور' : 'Attendance' },
                    { id: 'departments', label: language === 'ar' ? 'الأقسام' : 'Departments' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setChart(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all duration-200
                        ${activeChart === tab.id
                          ? 'bg-white text-brand-700 shadow-sm border border-surface-200'
                          : 'text-surface-500 hover:text-surface-700'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[260px]">
                {activeChart === 'attendance' && chartData && <Line data={chartData} options={lineOpts} />}
                {activeChart === 'departments' && barData && <Bar data={barData} options={barOpts} />}
              </div>
            </div>

            {/* Doughnut Chart */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
                    <i className="fas fa-chart-pie text-amber-600 text-sm"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-surface-900">{language === 'ar' ? 'الحالة اليومية' : 'Daily Status'}</h3>
                    <p className="text-[11px] text-surface-400 font-bold mt-0.5">{language === 'ar' ? 'توزيع الموظفين' : 'Employee Distribution'}</p>
                  </div>
                </div>
              </div>
              <div className="h-[220px]">
                {doughnutData && <Doughnut data={doughnutData} options={doughnutOpts} />}
              </div>
              {/* Legend numbers */}
              <div className="mt-5 space-y-2.5 pt-4 border-t border-surface-100">
                {[
                  { label: language === 'ar' ? 'حاضر' : 'Present', val: stats.present, color: '#6d4aff' },
                  { label: language === 'ar' ? 'متأخر' : 'Late', val: stats.late, color: '#f7a51e' },
                  { label: language === 'ar' ? 'إجازة' : 'On Leave', val: stats.onLeave, color: '#007aff' },
                ].map((l, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color }}></span>
                      <span className="text-xs font-bold text-surface-500">{l.label}</span>
                    </div>
                    <span className="text-xs font-black text-surface-800">{l.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ═══════════════════════════════════════════════════════
              BOTTOM ROW: Activities + Quick Actions + AI Insights
          ═══════════════════════════════════════════════════════ */}
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Recent Activity */}
            <Widget
              title={language === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}
              subtitle={language === 'ar' ? 'آخر العمليات في النظام' : 'Latest system operations'}
              icon={{ name: 'fa-clock-rotate', bg: 'bg-amber-50', color: 'text-amber-600' }}
              className="lg:col-span-2"
              actions={
                <button className="text-[10px] font-black text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1">
                  {language === 'ar' ? 'عرض الكل' : 'View All'}
                  <i className="fas fa-arrow-left text-[8px]"></i>
                </button>
              }
            >
              <div className="space-y-1">
                {[
                  { icon: 'fa-user-plus', color: { bg: 'bg-brand-50', text: 'text-brand-600' }, text: language === 'ar' ? 'تم إضافة موظف جديد: محمد علي في قسم التقنية' : 'New employee added: Ali Ahmed in IT', time: language === 'ar' ? 'منذ 5 دقائق' : '5 min ago' },
                  { icon: 'fa-calendar-check', color: { bg: 'bg-emerald-50', text: 'text-emerald-600' }, text: language === 'ar' ? 'تمت الموافقة على طلب إجازة: أحمد سعد (3 أيام)' : 'Leave approved: Ahmed Saad (3 days)', time: language === 'ar' ? 'منذ 23 دقيقة' : '23 min ago' },
                  { icon: 'fa-money-check-dollar', color: { bg: 'bg-amber-50', text: 'text-amber-600' }, text: language === 'ar' ? 'تم صرف رواتب شهر يوليو لـ 48 موظف' : 'July payroll processed for 48 employees', time: language === 'ar' ? 'منذ ساعتين' : '2 hours ago' },
                  { icon: 'fa-fingerprint', color: { bg: 'bg-sky-50', text: 'text-sky-600' }, text: language === 'ar' ? 'مزامنة ناجحة مع جهاز البصمة — الشركة الرئيسية' : 'Biometric sync successful — Main HQ', time: language === 'ar' ? 'منذ 3 ساعات' : '3 hours ago' },
                  { icon: 'fa-clock', color: { bg: 'bg-rose-50', text: 'text-rose-600' }, text: language === 'ar' ? 'تسجيل تأخر: سارة محمود — قسم المالية' : 'Late arrival: Sara Mahmoud — Finance', time: language === 'ar' ? 'أمس' : 'Yesterday' },
                ].map((a, i) => <Activity key={i} {...a} />)}
              </div>
            </Widget>

            {/* Quick Actions */}
            <Widget
              title={language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
              subtitle={language === 'ar' ? 'الوصول السريع للمهام' : 'Fast access to tasks'}
              icon={{ name: 'fa-bolt', bg: 'bg-brand-50', color: 'text-brand-600' }}
            >
              <div className="space-y-2.5">
                <QuickActionBtn href="/employees"
                  icon="fa-user-plus" label={language === 'ar' ? 'إضافة موظف جديد' : 'New Employee'}
                  gradient="bg-gradient-to-r from-brand-50 to-brand-50/50 text-brand-700 border-brand-200/60 hover:from-brand-100 hover:border-brand-300" />
                <QuickActionBtn href="/leave-registration"
                  icon="fa-file-signature" label={language === 'ar' ? 'طلب إجازة' : 'Leave Request'}
                  gradient="bg-gradient-to-r from-violet-50 to-violet-50/50 text-violet-700 border-violet-200/60 hover:from-violet-100 hover:border-violet-300" />
                <QuickActionBtn href="/payroll"
                  icon="fa-money-check-dollar" label={language === 'ar' ? 'اعتماد الرواتب' : 'Payroll Approval'}
                  gradient="bg-gradient-to-r from-emerald-50 to-emerald-50/50 text-emerald-700 border-emerald-200/60 hover:from-emerald-100 hover:border-emerald-300" />
                <QuickActionBtn href="/biometric-devices"
                  icon="fa-microchip" label={language === 'ar' ? 'مزامنة الأجهزة' : 'Sync Devices'}
                  gradient="bg-gradient-to-r from-amber-50 to-amber-50/50 text-amber-700 border-amber-200/60 hover:from-amber-100 hover:border-amber-300" />
                <QuickActionBtn href="/reports"
                  icon="fa-file-chart-column" label={language === 'ar' ? 'التقارير' : 'Reports'}
                  gradient="bg-gradient-to-r from-sky-50 to-sky-50/50 text-sky-700 border-sky-200/60 hover:from-sky-100 hover:border-sky-300" />
              </div>

              {/* Monthly attendance rate */}
              <div className="mt-5 p-4 rounded-xl bg-gradient-to-br from-surface-50 to-surface-50/50 border border-surface-200">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-surface-600">{language === 'ar' ? 'معدل الحضور الشهري' : 'Monthly Attendance Rate'}</span>
                  <span className="text-xs font-black text-brand-600">88%</span>
                </div>
                <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '88%' }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
                  />
                </div>
                <div className="flex items-center justify-between mt-2.5 text-[10px] text-surface-400 font-bold">
                  <span>{language === 'ar' ? 'هدف' : 'Target'}: 95%</span>
                  <span>{language === 'ar' ? 'متبقي' : 'Remaining'}: 7%</span>
                </div>
              </div>
            </Widget>
          </motion.div>

          {/* ═══════════════════════════════════════════════════════
              ROW: AI Insights + System Health
          ═══════════════════════════════════════════════════════ */}
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* AI Insights */}
            <div className="lg:col-span-2 relative overflow-hidden rounded-2xl p-7 text-white"
              style={{
                background: 'linear-gradient(135deg, #1e0f52 0%, #6d4aff 50%, #5930e5 100%)',
                boxShadow: '0 12px 40px rgba(109,74,255,0.20)',
              }}>
              {/* Decorative elements */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 30, repeat: Infinity, linear: true }}
                  className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-white/5"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 25, repeat: Infinity, linear: true }}
                  className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full border border-white/5"
                />
                <div className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-5">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg"
                  >
                    <i className="fas fa-sparkles text-white text-lg"></i>
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">{language === 'ar' ? 'رؤى الذكاء الاصطناعي' : 'AI Insights'}</h3>
                    <p className="text-xs text-white/60 font-medium">{language === 'ar' ? 'تحليلات ذكية لتحسين الأداء' : 'Smart analytics for performance'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      icon: 'fa-arrow-trend-up',
                      color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/15',
                      text: language === 'ar' ? 'معدل الانضباط هذا الأسبوع أعلى بنسبة 12% مقارنة بالأسبوع الماضي.' : 'Discipline rate this week is 12% higher than last week.',
                    },
                    {
                      icon: 'fa-circle-exclamation',
                      color: 'text-amber-300 bg-amber-500/10 border-amber-500/15',
                      text: language === 'ar' ? 'يوجد 3 موظفين في المبيعات تقترب أرصدة إجازاتهم من النفاد.' : '3 employees in Sales are running low on leave balance.',
                    },
                    {
                      icon: 'fa-lightbulb',
                      color: 'text-sky-300 bg-sky-500/10 border-sky-500/15',
                      text: language === 'ar' ? 'اقتراح: تنظيم ورشة عمل للتطوير المهني نهاية الشهر القادم.' : 'Suggestion: Host a professional development workshop next month.',
                    },
                    {
                      icon: 'fa-users',
                      color: 'text-rose-300 bg-rose-500/10 border-rose-500/15',
                      text: language === 'ar' ? 'قسم التقنية سجل أعلى نسبة حضور هذا الشهر بنسبة 98%.' : 'IT Department recorded the highest attendance rate this month at 98%.',
                    },
                  ].map((insight, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                      className={`flex items-start gap-3 p-3.5 rounded-xl backdrop-blur-sm border ${insight.color}`}
                    >
                      <i className={`fas ${insight.icon} mt-0.5 text-sm`}></i>
                      <p className="text-xs font-bold leading-relaxed text-white/90">{insight.text}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* System Health */}
            <Widget
              title={language === 'ar' ? 'حالة النظام' : 'System Health'}
              subtitle={language === 'ar' ? 'أداء الخوادم والتخزين' : 'Server & storage performance'}
              icon={{ name: 'fa-server', bg: 'bg-surface-100', color: 'text-surface-500' }}
            >
              <div className="space-y-5">
              <MiniProgress label={language === 'ar' ? 'المعالج (CPU)' : 'CPU'} value={24} color="emeraldAlt" />
              <MiniProgress label={language === 'ar' ? 'الذاكرة (RAM)' : 'Memory (RAM)'} value={68} color="brand" />
              <MiniProgress label={language === 'ar' ? 'التخزين' : 'Storage'} value={82} color="amber" />
              <MiniProgress label={language === 'ar' ? 'قاعدة البيانات' : 'Database'} value={12} color="emeraldAlt" />
              </div>

              <div className="mt-5 pt-4 border-t border-surface-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-surface-400">{language === 'ar' ? 'آخر تحديث: قبل دقيقة' : 'Last updated: 1 min ago'}</span>
                <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-400/50"></span>
                  {language === 'ar' ? 'متصل' : 'Connected'}
                </span>
              </div>
            </Widget>

          </motion.div>

          {/* ═══════════════════════════════════════════════════════
              ROW: Pending Approvals + Upcoming Events
          ═══════════════════════════════════════════════════════ */}
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Pending Approvals */}
            <Widget
              title={language === 'ar' ? 'الطلبات المعلقة' : 'Pending Approvals'}
              subtitle={language === 'ar' ? 'بانتظار الموافقة' : 'Awaiting approval'}
              icon={{ name: 'fa-clock', bg: 'bg-amber-50', color: 'text-amber-600' }}
              actions={
                <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black border border-rose-200/50">
                  {language === 'ar' ? '5 طلبات' : '5 Requests'}
                </span>
              }
            >
              <div className="space-y-2.5">
                {[
                  { title: language === 'ar' ? 'طلب إجازة سنوية - أحمد محمد' : 'Annual Leave - Ahmed Mohamed', dept: language === 'ar' ? 'تقنية المعلومات' : 'IT', date: '12 - 15 Jul', icon: 'fa-umbrella-beach', color: 'sky' },
                  { title: language === 'ar' ? 'طلب سلفة مالية - سارة أحمد' : 'Loan Request - Sara Ahmed', dept: language === 'ar' ? 'المالية' : 'Finance', date: language === 'ar' ? '2,500 ريال' : 'SAR 2,500', icon: 'fa-hand-holding-dollar', color: 'emerald' },
                  { title: language === 'ar' ? 'طلب إجازة مرضية - خالد عبدالله' : 'Sick Leave - Khaled Abdullah', dept: language === 'ar' ? 'المبيعات' : 'Sales', date: language === 'ar' ? 'يومين' : '2 days', icon: 'fa-briefcase-medical', color: 'rose' },
                  { title: language === 'ar' ? 'اعتماد مسير الرواتب' : 'Payroll Approval', dept: language === 'ar' ? 'المالية' : 'Finance', date: language === 'ar' ? 'شهر يونيو 2026' : 'Jun 2026', icon: 'fa-file-invoice-dollar', color: 'brand' },
                ].map((req, i) => (
                  <div key={i}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-surface-100
                               hover:border-surface-200 hover:bg-surface-50 transition-all group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm"
                        style={{
                          backgroundColor: req.color === 'brand' ? '#f0efff' : req.color === 'sky' ? '#f0f9ff' : req.color === 'emerald' ? '#ecfdf5' : req.color === 'rose' ? '#fff1f2' : req.color === 'amber' ? '#fffbeb' : '#f5f3ff',
                          color: req.color === 'brand' ? '#6d4aff' : req.color === 'sky' ? '#0284c7' : req.color === 'emerald' ? '#059669' : req.color === 'rose' ? '#e11d48' : req.color === 'amber' ? '#d97706' : '#7c3aed',
                        }}>
                        <i className={`fas ${req.icon} text-sm`}></i>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-surface-800">{req.title}</p>
                        <p className="text-[11px] text-surface-400 font-bold mt-0.5">{req.dept} · {req.date}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-8 h-8 rounded-lg bg-surface-50 border border-surface-200 text-surface-400
                                   hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all flex items-center justify-center"
                      >
                        <i className="fas fa-check text-xs"></i>
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-8 h-8 rounded-lg bg-surface-50 border border-surface-200 text-surface-400
                                   hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all flex items-center justify-center"
                      >
                        <i className="fas fa-times text-xs"></i>
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            </Widget>

            {/* Calendar & Events */}
            <Widget
              title={language === 'ar' ? 'التقويم والأحداث' : 'Calendar & Events'}
              subtitle={language === 'ar' ? 'أهم المواعيد القادمة' : 'Upcoming dates'}
              icon={{ name: 'fa-calendar-days', bg: 'bg-sky-50', color: 'text-sky-600' }}
              actions={
                <button className="text-[10px] font-black text-brand-600 hover:text-brand-700 transition-colors">
                  {language === 'ar' ? 'التقويم الكامل' : 'Full Calendar'}
                </button>
              }
            >
              {/* Today highlighted */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-brand-50 to-brand-50/50 border border-brand-200/60 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                      <span className="text-[10px] font-black text-brand-600">{language === 'ar' ? 'اليوم' : 'Today'}</span>
                    </div>
                    <p className="text-sm font-bold text-surface-900">{language === 'ar' ? 'اجتماع الإدارة ربع السنوي' : 'Quarterly Management Meeting'}</p>
                    <p className="text-[11px] text-surface-500 font-medium mt-1">{language === 'ar' ? 'قاعة الاجتماعات الرئيسية' : 'Main Conference Room'}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-black text-brand-700">10:00</p>
                    <p className="text-[10px] font-bold text-brand-400">{language === 'ar' ? 'صباحاً' : 'AM'}</p>
                  </div>
                </div>
              </div>

              {/* Upcoming events */}
              <div className="space-y-3.5">
                {[
                  { day: '12', month: language === 'ar' ? 'يوليو' : 'Jul', title: language === 'ar' ? 'عيد ميلاد سارة عبدالله 🎂' : 'Sara Abdullah Birthday 🎂', meta: language === 'ar' ? 'قسم التسويق' : 'Marketing Dept' },
                  { day: '15', month: language === 'ar' ? 'يوليو' : 'Jul', title: language === 'ar' ? 'ورشة عمل: القيادة الفعالة' : 'Workshop: Effective Leadership', meta: language === 'ar' ? 'الدور الرابع - قاعة التدريب' : '4th Floor - Training Room' },
                  { day: '20', month: language === 'ar' ? 'يوليو' : 'Jul', title: language === 'ar' ? 'مراجعة الأداء الشهرية' : 'Monthly Performance Review', meta: language === 'ar' ? 'جميع الأقسام' : 'All Departments' },
                  { day: '25', month: language === 'ar' ? 'يوليو' : 'Jul', title: language === 'ar' ? 'إجازة رسمية - ذكرى التأسيس' : 'Public Holiday - Foundation Day', meta: language === 'ar' ? 'دوام كامل' : 'Full Day' },
                ].map((evt, i) => (
                  <div key={i} className="flex items-start gap-3.5 group cursor-pointer p-2 -mx-2 rounded-xl hover:bg-surface-50 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-surface-50 border border-surface-200 flex flex-col items-center justify-center flex-shrink-0 group-hover:border-brand-200 group-hover:bg-brand-50/50 transition-all">
                      <span className="text-[9px] font-bold text-surface-400 leading-none mb-0.5">{evt.month}</span>
                      <span className="text-sm font-black text-surface-700 leading-none group-hover:text-brand-600 transition-colors">{evt.day}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-surface-800 leading-snug">{evt.title}</p>
                      <p className="text-[11px] text-surface-400 font-bold mt-0.5">{evt.meta}</p>
                    </div>
                    <i className="fas fa-chevron-left text-surface-200 text-xs mt-3 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                  </div>
                ))}
              </div>
            </Widget>

          </motion.div>

          {/* ═══════════════════════════════════════════════════════
              ROW: Attendance Heatmap + Company News + Employee Distribution
          ═══════════════════════════════════════════════════════ */}
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Attendance Heatmap */}
            <Widget
              title={language === 'ar' ? 'خريطة كثافة الحضور' : 'Attendance Heatmap'}
              subtitle={language === 'ar' ? 'التواجد خلال ساعات العمل (30 يوماً)' : 'Presence during work hours (30 days)'}
              icon={{ name: 'fa-fire', bg: 'bg-rose-50', color: 'text-rose-600' }}
              className="lg:col-span-2"
              actions={
                <button className="text-[10px] font-black text-brand-600 hover:text-brand-700 transition-colors">
                  {language === 'ar' ? 'تحليل متقدم' : 'Advanced Analysis'}
                </button>
              }
            >
              <div className="flex gap-2.5 mb-3">
                <div className="w-14 text-[10px] font-bold text-surface-400 flex flex-col justify-between py-1 leading-tight">
                  <span>{language === 'ar' ? '8 ص' : '8 AM'}</span>
                  <span>{language === 'ar' ? '12 م' : '12 PM'}</span>
                  <span>{language === 'ar' ? '4 م' : '4 PM'}</span>
                  <span>{language === 'ar' ? '8 م' : '8 PM'}</span>
                </div>
                <div className="flex-1 grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px] overflow-x-auto hide-scrollbar">
                  {Array.from({ length: 30 }).map((_, col) => (
                    <div key={col} className="flex flex-col gap-[3px]">
                      {Array.from({ length: 8 }).map((_, row) => {
                        const val = Math.sin(col / 3) * Math.cos(row / 2)
                        const intensity = Math.abs(val) + (Math.random() * 0.35)
                        let bg = 'bg-surface-100'
                        if (intensity > 1.2) bg = 'bg-brand-500'
                        else if (intensity > 0.9) bg = 'bg-brand-400'
                        else if (intensity > 0.7) bg = 'bg-brand-300'
                        else if (intensity > 0.45) bg = 'bg-brand-200'
                        else if (intensity > 0.25) bg = 'bg-brand-100'
                        return (
                          <motion.div
                            key={row}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: (col * 8 + row) * 0.003 }}
                            className={`w-full aspect-square min-w-[8px] min-h-[8px] rounded-[3px] ${bg} hover:ring-1 hover:ring-surface-400 transition-all cursor-pointer`}
                            title={language === 'ar' ? `يوم ${col + 1}` : `Day ${col + 1}`}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
              {/* Legend */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-surface-400">
                  <span>{language === 'ar' ? 'أقل كثافة' : 'Low density'}</span>
                  <div className="flex gap-0.5">
                    <div className="w-3 h-3 rounded-[3px] bg-surface-100"></div>
                    <div className="w-3 h-3 rounded-[3px] bg-brand-100"></div>
                    <div className="w-3 h-3 rounded-[3px] bg-brand-200"></div>
                    <div className="w-3 h-3 rounded-[3px] bg-brand-300"></div>
                    <div className="w-3 h-3 rounded-[3px] bg-brand-400"></div>
                    <div className="w-3 h-3 rounded-[3px] bg-brand-500"></div>
                  </div>
                  <span>{language === 'ar' ? 'أعلى كثافة' : 'High density'}</span>
                </div>
                <span className="text-[10px] font-bold text-surface-400">{language === 'ar' ? 'الأيام' : 'Days'}: {new Date().getDate() - 30} - {new Date().getDate()} {new Date().toLocaleDateString(locale, { month: 'long' })}</span>
              </div>
            </Widget>

            {/* Company News */}
            <Widget
              title={language === 'ar' ? 'أخبار الشركة' : 'Company News'}
              subtitle={language === 'ar' ? 'القرارات والتعاميم' : 'Decisions & circulars'}
              icon={{ name: 'fa-bullhorn', bg: 'bg-brand-50', color: 'text-brand-600' }}
            >
              <div className="space-y-4">
                {[
                  {
                    tag: language === 'ar' ? 'تعميم إداري' : 'Directive',
                    tagColor: 'bg-brand-50 text-brand-600',
                    title: language === 'ar' ? 'تحديث سياسة العمل المرن' : 'Flexible Work Policy Update',
                    desc: language === 'ar' ? 'تم اعتماد سياسة جديدة تتيح للموظفين العمل عن بعد لمدة يومين في الشهر.' : 'New policy allows employees to work remotely up to 2 days per month.',
                    time: language === 'ar' ? 'أمس' : 'Yesterday',
                  },
                  {
                    tag: language === 'ar' ? 'إنجاز' : 'Achievement',
                    tagColor: 'bg-emerald-50 text-emerald-600',
                    title: language === 'ar' ? 'إطلاق الإصدار الجديد من التطبيق' : 'New App Version Launched',
                    desc: language === 'ar' ? 'نبارك لفريق التقنية نجاح الإطلاق الذي حقق تقييمات عالية في يومه الأول.' : 'Congratulations to the IT team on the successful launch with high ratings.',
                    time: language === 'ar' ? 'منذ 3 أيام' : '3 days ago',
                  },
                  {
                    tag: language === 'ar' ? 'فعالية' : 'Event',
                    tagColor: 'bg-amber-50 text-amber-600',
                    title: language === 'ar' ? 'حفل تكريم الموظفين المتميزين' : 'Top Performers Ceremony',
                    desc: language === 'ar' ? 'سيتم تنظيم حفل تكريم لنهاية العام في الفندق الكبير بحضور الإدارة العليا.' : 'End-of-year recognition ceremony at the Grand Hotel with senior management.',
                    time: language === 'ar' ? 'الأسبوع الماضي' : 'Last week',
                  },
                  {
                    tag: language === 'ar' ? 'إعلان' : 'Announcement',
                    tagColor: 'bg-sky-50 text-sky-600',
                    title: language === 'ar' ? 'فرص تدريبية جديدة' : 'New Training Opportunities',
                    desc: language === 'ar' ? 'تم فتح باب التسجيل في برنامج القيادة الإدارية للموظفين المجتازين.' : 'Registration open for the leadership program for qualified employees.',
                    time: language === 'ar' ? 'منذ أسبوعين' : '2 weeks ago',
                  },
                ].map((news, i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${news.tagColor} border`}>
                        {news.tag}
                      </span>
                      <span className="text-[9px] font-bold text-surface-400">{news.time}</span>
                    </div>
                    <h4 className="text-sm font-bold text-surface-800 group-hover:text-brand-600 transition-colors leading-snug">{news.title}</h4>
                    <p className="text-[11px] text-surface-500 mt-1 line-clamp-2 leading-relaxed font-medium">{news.desc}</p>
                    {i < 3 && <div className="w-full h-px bg-surface-100 mt-3.5"></div>}
                  </div>
                ))}
              </div>

              <button className="w-full mt-5 py-2.5 rounded-xl border border-surface-200 text-xs font-bold text-surface-500
                                 hover:bg-surface-50 hover:text-surface-800 hover:border-surface-300 transition-all">
                {language === 'ar' ? 'استعراض الأرشيف الكامل' : 'View Full Archive'}
              </button>
            </Widget>

          </motion.div>

          {/* ═══════════════════════════════════════════════════════
              BOTTOM: Employee Distribution + Top Performers + Productivity
          ═══════════════════════════════════════════════════════ */}
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Employee Distribution by Department */}
            <Widget
              title={language === 'ar' ? 'توزيع الموظفين' : 'Employee Distribution'}
              subtitle={language === 'ar' ? 'حسب الأقسام' : 'By department'}
              icon={{ name: 'fa-diagram-project', bg: 'bg-indigo-50', color: 'text-indigo-600' }}
              className="lg:col-span-2"
            >
              <div className="space-y-3.5">
                {[
                  { dept: language === 'ar' ? 'تقنية المعلومات' : 'IT', count: 15, pct: 28, color: 'brand' },
                  { dept: language === 'ar' ? 'المالية' : 'Finance', count: 11, pct: 20, color: 'emerald' },
                  { dept: language === 'ar' ? 'العمليات' : 'Operations', count: 19, pct: 35, color: 'amber' },
                  { dept: language === 'ar' ? 'التسويق' : 'Marketing', count: 7, pct: 13, color: 'rose' },
                  { dept: language === 'ar' ? 'الموارد البشرية' : 'HR', count: 8, pct: 15, color: 'sky' },
                  { dept: language === 'ar' ? 'القانوني' : 'Legal', count: 5, pct: 9, color: 'violet' },
                ].map((d, i) => {
                  const cc = colorMap[d.color] || colorMap.brand
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-24 flex-shrink-0">
                        <p className="text-xs font-bold text-surface-600 truncate">{d.dept}</p>
                      </div>
                      <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${d.pct}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                          className={`h-full rounded-full bg-gradient-to-r ${cc.from} ${cc.to}`}
                        />
                      </div>
                      <div className="w-16 text-left flex-shrink-0">
                        <span className="text-xs font-black text-surface-700">{d.count}</span>
                        <span className="text-[9px] text-surface-400 mr-1">{language === 'ar' ? 'موظف' : 'emp'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Widget>

            {/* Top Performers */}
            <Widget
              title={language === 'ar' ? 'الأداء المتميز' : 'Top Performers'}
              subtitle={language === 'ar' ? 'أفضل الموظفين هذا الشهر' : 'Best employees this month'}
              icon={{ name: 'fa-trophy', bg: 'bg-amber-50', color: 'text-amber-600' }}
            >
              <div className="space-y-3">
                {[
                  { rank: 1, name: language === 'ar' ? 'أحمد محمد' : 'Ahmed Mohamed', dept: language === 'ar' ? 'تقنية' : 'IT', score: 98, badge: '🏆' },
                  { rank: 2, name: language === 'ar' ? 'سارة خالد' : 'Sara Khaled', dept: language === 'ar' ? 'تسويق' : 'Marketing', score: 95, badge: '🥈' },
                  { rank: 3, name: language === 'ar' ? 'محمد عمر' : 'Mohamed Omar', dept: language === 'ar' ? 'مالية' : 'Finance', score: 93, badge: '🥉' },
                  { rank: 4, name: language === 'ar' ? 'نورة أحمد' : 'Nora Ahmed', dept: 'HR', score: 91 },
                  { rank: 5, name: language === 'ar' ? 'فهد علي' : 'Fahd Ali', dept: language === 'ar' ? 'عمليات' : 'Operations', score: 89 },
                ].map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-50 transition-all cursor-pointer group">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm
                      ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-100 text-slate-500' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-surface-100 text-surface-500'}`}>
                      {p.badge || p.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-surface-800 truncate group-hover:text-brand-600 transition-colors">{p.name}</p>
                      <p className="text-[10px] text-surface-400 font-bold">{p.dept}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-surface-700">{p.score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Widget>

            {/* Productivity Score */}
            <Widget
              title={language === 'ar' ? 'مؤشر الإنتاجية' : 'Productivity Score'}
              subtitle={language === 'ar' ? 'معدل الأداء العام' : 'Overall performance rate'}
              icon={{ name: 'fa-gauge-high', bg: 'bg-emerald-50', color: 'text-emerald-600' }}
            >
              {/* Large circular progress */}
              <div className="flex flex-col items-center py-4">
                <div className="relative w-32 h-32 mb-4">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                    <circle cx="64" cy="64" r="56" fill="none" stroke="#eef0f4" strokeWidth="10" />
                    <motion.circle
                      cx="64" cy="64" r="56" fill="none"
                      stroke="#6d4aff" strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 56}
                      initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - 0.78) }}
                      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <motion.span
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                        className="text-3xl font-black text-surface-900"
                      >
                        78
                      </motion.span>
                      <span className="text-sm font-black text-surface-400">%</span>
                    </div>
                  </div>
                </div>

                <div className="w-full space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-surface-500">{language === 'ar' ? 'الجودة' : 'Quality'}</span>
                    <span className="text-surface-800">85%</span>
                  </div>
                  <div className="progress"><div className="progress-bar w-[85%]" /></div>

                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-surface-500">{language === 'ar' ? 'السرعة' : 'Speed'}</span>
                    <span className="text-surface-800">72%</span>
                  </div>
                  <div className="progress"><div className="progress-bar w-[72%]" /></div>

                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-surface-500">{language === 'ar' ? 'الالتزام' : 'Commitment'}</span>
                    <span className="text-surface-800">91%</span>
                  </div>
                  <div className="progress"><div className="progress-bar progress-bar-success w-[91%]" /></div>
                </div>
              </div>
            </Widget>

          </motion.div>

          {/* ═══════════════════════════════════════════════════════
              BOTTOM: Notes + Shortcuts + HR Insights
          ═══════════════════════════════════════════════════════ */}
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Quick Notes */}
            <Widget
              title={language === 'ar' ? 'ملاحظات سريعة' : 'Quick Notes'}
              subtitle={language === 'ar' ? 'دوّن ملاحظاتك اليومية' : 'Write your daily notes'}
              icon={{ name: 'fa-note-sticky', bg: 'bg-amber-50', color: 'text-amber-600' }}
            >
              <textarea
                placeholder={language === 'ar' ? 'اكتب ملاحظاتك هنا...' : 'Write your notes here...'}
                className="w-full h-28 bg-surface-50 border border-surface-200 rounded-2xl p-4 text-sm font-medium
                           text-surface-700 placeholder-surface-400 resize-none
                           focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10
                           transition-all duration-200"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] font-bold text-surface-400">{language === 'ar' ? 'آخر حفظ: منذ 5 دقائق' : 'Last saved: 5 min ago'}</span>
                <button className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-[10px] font-bold hover:bg-brand-600 transition-all shadow-sm">
                  <i className="fas fa-floppy-disk ml-1"></i>
                  {language === 'ar' ? 'حفظ' : 'Save'}
                </button>
              </div>
            </Widget>

            {/* Keyboard Shortcuts */}
            <Widget
              title={language === 'ar' ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}
              subtitle={language === 'ar' ? 'لتسريع العمل' : 'Speed up your work'}
              icon={{ name: 'fa-keyboard', bg: 'bg-surface-100', color: 'text-surface-500' }}
            >
              <div className="space-y-2.5">
                {[
                  { keys: ['Ctrl', 'K'], action: language === 'ar' ? 'فتح البحث السريع' : 'Open quick search' },
                  { keys: ['Ctrl', 'N'], action: language === 'ar' ? 'إضافة موظف جديد' : 'Add new employee' },
                  { keys: ['Ctrl', 'L'], action: language === 'ar' ? 'طلب إجازة' : 'Leave request' },
                  { keys: ['Ctrl', 'P'], action: language === 'ar' ? 'تقرير سريع' : 'Quick report' },
                  { keys: ['Esc'], action: language === 'ar' ? 'إغلاق النوافذ' : 'Close windows' },
                ].map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-50 transition-all">
                    <span className="text-xs font-bold text-surface-600">{shortcut.action}</span>
                    <div className="flex gap-1" dir="ltr">
                      {shortcut.keys.map((k, j) => (
                        <span key={j} className="px-2 py-0.5 rounded-md bg-surface-100 border border-surface-200 text-[10px] font-black text-surface-500 shadow-sm">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Widget>

            {/* Storage Usage */}
            <Widget
              title={language === 'ar' ? 'مساحة التخزين' : 'Storage Usage'}
              subtitle={language === 'ar' ? 'حالة استخدام الموارد' : 'Resource usage status'}
              icon={{ name: 'fa-database', bg: 'bg-sky-50', color: 'text-sky-600' }}
            >
              <div className="flex flex-col items-center py-2">
                {/* Storage donut */}
                <div className="relative w-28 h-28 mb-5">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                    <circle cx="64" cy="64" r="52" fill="none" stroke="#eef0f4" strokeWidth="12" />
                    <motion.circle
                      cx="64" cy="64" r="52" fill="none"
                      stroke="#6d4aff" strokeWidth="12" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 52}
                      initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - 0.68) }}
                      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-2xl font-black text-surface-900">68</span>
                      <span className="text-xs font-black text-surface-400">%</span>
                    </div>
                  </div>
                </div>

                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                      <span className="text-surface-500">{language === 'ar' ? 'قاعدة البيانات' : 'Database'}</span>
                    </div>
                    <span className="text-surface-800">2.4 GB</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-surface-500">{language === 'ar' ? 'الملفات' : 'Files'}</span>
                    </div>
                    <span className="text-surface-800">1.1 GB</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span className="text-surface-500">{language === 'ar' ? 'سجلات النشاط' : 'Activity Logs'}</span>
                    </div>
                    <span className="text-surface-800">0.8 GB</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-surface-100">
                    <span className="text-surface-400">{language === 'ar' ? 'المساحة المتبقية' : 'Free space'}</span>
                    <span className="text-emerald-600 font-black">2.1 GB</span>
                  </div>
                </div>
              </div>
            </Widget>

          </motion.div>

          {/* ═══════════════════════════════════════════════════════
              FINAL ROW: Team Birthdays
          ═══════════════════════════════════════════════════════ */}
          <motion.div variants={item} className="card p-6 bg-gradient-to-r from-rose-50/50 via-brand-50/30 to-sky-50/30 border-rose-200/30">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-400 to-rose-500 flex items-center justify-center shadow-sm">
                  <i className="fas fa-cake-candles text-white text-sm"></i>
                </div>
                <div>
                  <h3 className="text-sm font-black text-surface-900">{language === 'ar' ? 'أعياد ميلاد الفريق 🎉' : 'Team Birthdays 🎉'}</h3>
                  <p className="text-[11px] text-surface-400 font-bold mt-0.5">{language === 'ar' ? 'احتفالات هذا الشهر' : 'This month celebrations'}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { name: language === 'ar' ? 'سارة عبدالله' : 'Sara Abdullah', date: language === 'ar' ? '12 يوليو' : '12 Jul', dept: language === 'ar' ? 'التسويق' : 'Marketing', emoji: '🎂' },
                { name: language === 'ar' ? 'خالد أحمد' : 'Khaled Ahmed', date: language === 'ar' ? '18 يوليو' : '18 Jul', dept: language === 'ar' ? 'تقنية المعلومات' : 'IT', emoji: '🎈' },
                { name: language === 'ar' ? 'نورة سعد' : 'Noura Saad', date: language === 'ar' ? '22 يوليو' : '22 Jul', dept: language === 'ar' ? 'الموارد البشرية' : 'HR', emoji: '🎉' },
                { name: language === 'ar' ? 'عمر حسن' : 'Omar Hassan', date: language === 'ar' ? '28 يوليو' : '28 Jul', dept: language === 'ar' ? 'المالية' : 'Finance', emoji: '🎁' },
              ].map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/80 backdrop-blur-sm border border-surface-200
                             hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer shadow-sm"
                >
                  <div className="text-2xl">{b.emoji}</div>
                  <div>
                    <p className="text-sm font-bold text-surface-800">{b.name}</p>
                    <p className="text-[10px] text-surface-400 font-bold">{b.date} · {b.dept}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </motion.div>
      </Layout>
    </ProtectedRoute>
  )
}
