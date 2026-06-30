import { useState, useMemo } from 'react'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import { motion, AnimatePresence } from 'framer-motion'
import { useData } from '../contexts/DataContext'
import { useLanguage } from '../contexts/LanguageContext'

const EGYPTIAN_HOLIDAYS = [
  { month: 1, day: 1, nameAr: 'رأس السنة الميلادية', nameEn: 'New Year\'s Day', type: 'holiday', icon: '🎆' },
  { month: 1, day: 7, nameAr: 'عيد الميلاد المجيد', nameEn: 'Coptic Christmas', type: 'holiday', icon: '⛪' },
  { month: 1, day: 25, nameAr: 'عيد ثورة يناير', nameEn: 'Jan 25 Revolution', type: 'national', icon: '🇪🇬' },
  { month: 4, day: 25, nameAr: 'عيد تحرير سيناء', nameEn: 'Sinai Liberation', type: 'national', icon: '🏔️' },
  { month: 5, day: 1, nameAr: 'عيد العمال', nameEn: 'Labour Day', type: 'holiday', icon: '⚙️' },
  { month: 6, day: 30, nameAr: 'ذكرى ثورة 30 يونيو', nameEn: 'June 30 Revolution', type: 'national', icon: '🇪🇬' },
  { month: 7, day: 23, nameAr: 'عيد ثورة 23 يوليو', nameEn: 'July 23 Revolution', type: 'national', icon: '🇪🇬' },
  { month: 10, day: 6, nameAr: 'عيد القوات المسلحة', nameEn: 'Armed Forces Day', type: 'national', icon: '🎖️' },
]

const TYPE_STYLE = {
  birthday: { bg: 'bg-pink-500/15 border-pink-500/30', dot: 'bg-pink-400', text: 'text-pink-300', labelAr: 'عيد ميلاد', labelEn: 'Birthday' },
  leave: { bg: 'bg-amber-500/15 border-amber-500/30', dot: 'bg-amber-400', text: 'text-amber-300', labelAr: 'إجازة', labelEn: 'Leave' },
  holiday: { bg: 'bg-emerald-500/15 border-emerald-500/30', dot: 'bg-emerald-400', text: 'text-emerald-300', labelAr: 'عطلة رسمية', labelEn: 'Public Holiday' },
  national: { bg: 'bg-cyan-500/15 border-cyan-500/30', dot: 'bg-cyan-400', text: 'text-cyan-300', labelAr: 'مناسبة وطنية', labelEn: 'National Event' },
  meeting: { bg: 'bg-violet-500/15 border-violet-500/30', dot: 'bg-violet-400', text: 'text-violet-300', labelAr: 'اجتماع', labelEn: 'Meeting' },
}

const DAYS_SHORT_AR = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
const DAYS_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = n => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`

const Pill = ({ event, small, language }) => {
  const s = TYPE_STYLE[event.type] || TYPE_STYLE.meeting
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold truncate ${s.bg} ${s.text} ${small ? '' : 'max-w-full'}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`}></span>
      <span className="truncate">{event.title}</span>
    </div>
  )
}

const EventCard = ({ event, onClick }) => {
  const s = TYPE_STYLE[event.type] || TYPE_STYLE.meeting
  return (
    <motion.div whileHover={{ x: 4 }} onClick={() => onClick(event)}
      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${s.bg}`}>
      <div className="text-xl shrink-0">{event.icon || '📅'}</div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm truncate ${s.text}`}>{event.title}</p>
        <p className="text-slate-500 text-xs mt-0.5">{event.subtitle || ''}</p>
      </div>
    </motion.div>
  )
}

export default function Calendar() {
  const { employees = [], leaves = [] } = useData()
  const { language } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e
  const today = new Date()
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selected, setSelected] = useState(null)
  const [detailEvent, setDetailEvent] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [customEvents, setCustomEvents] = useState([
    { id: 1, date: ymd(today.getFullYear(), today.getMonth() + 1, today.getDate()), title: ar('اجتماع الإدارة الشهري', 'Monthly Management Meeting'), type: 'meeting', icon: '📋', subtitle: ar('قاعة الاجتماعات - الطابق الثالث', 'Conference Room - 3rd Floor') },
  ])
  const [newEvent, setNewEvent] = useState({ title: '', date: '', type: 'meeting', icon: '📋', subtitle: '' })

  const DAYS_SHORT = language === 'ar' ? DAYS_SHORT_AR : DAYS_SHORT_EN
  const MONTHS = language === 'ar' ? MONTHS_AR : MONTHS_EN

  const eventsMap = useMemo(() => {
    const map = {}
    const add = (dateStr, ev) => { if (!map[dateStr]) map[dateStr] = []; map[dateStr].push(ev) }
    const currentYear = current.year

    employees.forEach(emp => {
      const name = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
      const bd = emp.birthDate || emp.birth_date
      if (bd) {
        try { const d = new Date(bd); if (!isNaN(d)) add(ymd(currentYear, d.getMonth() + 1, d.getDate()), { id: `bd-${emp.id}`, type: 'birthday', icon: '🎂', title: ar(`عيد ميلاد ${name}`, `${name}'s Birthday`), subtitle: ar(`يتم ${currentYear - d.getFullYear()} سنة`, `Turning ${currentYear - d.getFullYear()}`) }) } catch { }
      }
    })

    leaves.forEach(lv => {
      try {
        const start = new Date(lv.start_date || lv.startDate)
        const end = new Date(lv.end_date || lv.endDate || lv.start_date || lv.startDate)
        if (isNaN(start)) return
        const emp = employees.find(e => e.id === lv.employee_id)
        const name = emp ? (emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()) : ar('موظف', 'Employee')
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (d.getFullYear() === currentYear) add(ymd(d.getFullYear(), d.getMonth() + 1, d.getDate()), { id: `lv-${lv.id}-${d.toISOString()}`, type: 'leave', icon: '✈️', title: ar(`إجازة ${name}`, `${name} on Leave`), subtitle: lv.type || ar('إجازة سنوية', 'Annual Leave') })
        }
      } catch { }
    })

    EGYPTIAN_HOLIDAYS.forEach(h => {
      add(ymd(currentYear, h.month, h.day), { id: `holiday-${h.month}-${h.day}`, type: h.type, icon: h.icon, title: language === 'ar' ? h.nameAr : h.nameEn, subtitle: ar('عطلة رسمية', 'Public Holiday') })
    })

    customEvents.forEach(ev => add(ev.date, ev))
    return map
  }, [employees, leaves, current.year, customEvents, language])

  const { year, month } = current
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = ymd(today.getFullYear(), today.getMonth() + 1, today.getDate())

  const gridCells = []
  for (let i = 0; i < firstDay; i++) gridCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) gridCells.push(d)

  const prevMonth = () => setCurrent(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 })
  const nextMonth = () => setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 })
  const goToday = () => { setCurrent({ year: today.getFullYear(), month: today.getMonth() }); setSelected(todayStr) }

  const selectedEvents = selected ? (eventsMap[selected] || []) : []
  const upcoming = useMemo(() => {
    const result = []
    for (let i = 0; i <= 30; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i)
      const key = ymd(d.getFullYear(), d.getMonth() + 1, d.getDate())
      if (eventsMap[key]) eventsMap[key].forEach(ev => result.push({ ...ev, date: key }))
    }
    return result.slice(0, 8)
  }, [eventsMap])

  const monthEvents = Object.entries(eventsMap).filter(([k]) => k.startsWith(`${year}-${pad(month + 1)}`)).flatMap(([, evs]) => evs)
  const iconOptions = ['📋', '🎉', '🏆', '📢', '🍽️', '🎓', '🏥', '✈️', '🔧', '💡', '🤝', '📊']

  const getTypeLabel = (type) => {
    const s = TYPE_STYLE[type] || TYPE_STYLE.meeting
    return language === 'ar' ? s.labelAr : s.labelEn
  }

  return (
    <ProtectedRoute>
      <Layout>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <i className="fas fa-calendar-alt text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">{ar('إدارة الفراغات الزمنية', 'Calendar')}</h1>
                <p className="text-slate-400 text-sm mt-0.5">{ar('كل المناسبات والإجازات تلقائياً في مكان واحد', 'All events and holidays in one place')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={goToday} className="bg-slate-800/80 border border-white/10 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer hover:border-white/20">
                <i className="fas fa-crosshairs text-xs"></i> {ar('اليوم', 'Today')}
              </button>
              <button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-all cursor-pointer">
                <i className="fas fa-plus"></i> {ar('إضافة مناسبة', 'Add Event')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: ar('مناسبات هذا الشهر', 'This Month'), value: monthEvents.length, icon: 'fa-calendar-star', grad: 'from-indigo-500 to-violet-500' },
              { label: ar('أعياد ميلاد', 'Birthdays'), value: monthEvents.filter(e => e.type === 'birthday').length, icon: 'fa-cake-candles', grad: 'from-pink-500 to-rose-500' },
              { label: ar('إجازات', 'Leaves'), value: monthEvents.filter(e => e.type === 'leave').length, icon: 'fa-plane-departure', grad: 'from-cyan-500 to-teal-500' },
              { label: ar('عطل رسمية', 'Holidays'), value: monthEvents.filter(e => e.type === 'holiday' || e.type === 'national').length, icon: 'fa-flag', grad: 'from-emerald-500 to-teal-500' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 relative overflow-hidden">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.grad} flex items-center justify-center mb-2`}><i className={`fas ${s.icon} text-white text-xs`}></i></div>
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/5">
                  <i className="fas fa-chevron-right text-xs"></i>
                </button>
                <div className="text-center">
                  <h2 className="text-xl font-black text-white">{MONTHS[month]}</h2>
                  <p className="text-slate-500 text-sm">{year}</p>
                </div>
                <button onClick={nextMonth} className="w-9 h-9 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/5">
                  <i className="fas fa-chevron-left text-xs"></i>
                </button>
              </div>
              <div className="grid grid-cols-7 border-b border-white/5">
                {DAYS_SHORT.map(d => (<div key={d} className="py-3 text-center text-xs font-black text-slate-500 uppercase tracking-wider">{d}</div>))}
              </div>
              <div className="grid grid-cols-7">
                {gridCells.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} className="min-h-[80px] border-b border-r border-white/[0.03]" />
                  const dateStr = ymd(year, month + 1, day)
                  const dayEvs = eventsMap[dateStr] || []
                  const isToday = dateStr === todayStr
                  const isSel = dateStr === selected
                  const isWeekend = [0, 6].includes(new Date(year, month, day).getDay())
                  return (
                    <div key={day} onClick={() => setSelected(isSel ? null : dateStr)}
                      className={`min-h-[80px] p-1.5 border-b border-r border-white/[0.03] cursor-pointer transition-colors group relative ${isSel ? 'bg-indigo-500/10' : 'hover:bg-white/[0.02]'} ${isWeekend ? 'bg-slate-950/30' : ''}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black mb-1 transition-all ${isToday ? 'bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]' : isSel ? 'bg-indigo-500/30 text-indigo-300' : isWeekend ? 'text-slate-600' : 'text-slate-300 group-hover:text-white'}`}>{day}</div>
                      <div className="space-y-0.5">
                        {dayEvs.slice(0, 2).map((ev, i) => <Pill key={i} event={ev} small language={language} />)}
                        {dayEvs.length > 2 && <div className="text-[10px] text-slate-500 font-bold px-1">+{dayEvs.length - 2} {ar('أكثر', 'more')}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5">
                <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2"><i className="fas fa-circle-info text-slate-500 text-xs"></i> {ar('أنواع المناسبات', 'Event Types')}</h3>
                <div className="space-y-2">
                  {Object.entries(TYPE_STYLE).map(([type, s]) => (
                    <div key={type} className="flex items-center gap-2.5 text-xs">
                      <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`}></span>
                      <span className="text-slate-400">{language === 'ar' ? s.labelAr : s.labelEn}</span>
                    </div>
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {selected && (
                  <motion.div key={selected} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="bg-slate-900/60 border border-white/5 rounded-2xl p-5">
                    <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
                      <i className="fas fa-calendar-day text-indigo-400 text-xs"></i>
                      {new Date(selected + 'T00:00:00').toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    {selectedEvents.length ? (
                      <div className="space-y-2">{selectedEvents.map((ev, i) => <EventCard key={i} event={ev} onClick={setDetailEvent} />)}</div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center mx-auto mb-3"><i className="fas fa-calendar-xmark text-slate-600"></i></div>
                        <p className="text-slate-500 text-sm">{ar('مفيش مناسبات اليوم ده', 'No events this day')}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5">
                <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2"><i className="fas fa-clock text-violet-400 text-xs"></i> {ar('المناسبات القادمة (30 يوم)', 'Upcoming (30 days)')}</h3>
                {upcoming.length ? (
                  <div className="space-y-2">
                    {upcoming.map((ev, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        onClick={() => { setSelected(ev.date); setCurrent({ year: parseInt(ev.date.split('-')[0]), month: parseInt(ev.date.split('-')[1]) - 1 }) }}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all hover:border-white/10 ${(TYPE_STYLE[ev.type] || TYPE_STYLE.meeting).bg}`}>
                        <div className="text-lg shrink-0">{ev.icon || '📅'}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-xs truncate ${(TYPE_STYLE[ev.type] || TYPE_STYLE.meeting).text}`}>{ev.title}</p>
                          <p className="text-slate-600 text-[10px]">{new Date(ev.date + 'T00:00:00').toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : <p className="text-slate-600 text-sm text-center py-4">{ar('مفيش مناسبات قادمة', 'No upcoming events')}</p>}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showAddModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
                <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
                  className="relative bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl shadow-indigo-500/10 w-full max-w-md overflow-hidden">
                  <div className="p-5 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-white font-black text-lg flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center"><i className="fas fa-calendar-plus text-white text-sm"></i></div>
                      {ar('إضافة مناسبة جديدة', 'Add New Event')}
                    </h3>
                    <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer"><i className="fas fa-times text-xs"></i></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{ar('عنوان المناسبة *', 'Event Title *')}</label>
                      <input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-2.5 rounded-xl focus:border-indigo-500 outline-none transition-colors" placeholder={ar('مثال: اجتماع الإدارة', 'e.g. Management Meeting')} /></div>
                    <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{ar('التاريخ *', 'Date *')}</label>
                      <input type="date" value={newEvent.date} onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))} className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-2.5 rounded-xl focus:border-indigo-500 outline-none transition-colors" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{ar('النوع', 'Type')}</label>
                        <select value={newEvent.type} onChange={e => setNewEvent(p => ({ ...p, type: e.target.value }))} className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-2.5 rounded-xl focus:border-indigo-500 outline-none transition-colors appearance-none">
                          {Object.entries(TYPE_STYLE).map(([k, v]) => <option key={k} value={k}>{language === 'ar' ? v.labelAr : v.labelEn}</option>)}
                        </select></div>
                      <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{ar('الأيقونة', 'Icon')}</label>
                        <div className="flex flex-wrap gap-1.5">
                          {iconOptions.slice(0, 6).map(ic => (
                            <button key={ic} onClick={() => setNewEvent(p => ({ ...p, icon: ic }))} className={`text-lg p-1 rounded-lg transition-all cursor-pointer ${newEvent.icon === ic ? 'bg-indigo-500/30 ring-1 ring-indigo-500' : 'hover:bg-white/5'}`}>{ic}</button>
                          ))}</div></div>
                    </div>
                    <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{ar('وصف (اختياري)', 'Description (optional)')}</label>
                      <input value={newEvent.subtitle} onChange={e => setNewEvent(p => ({ ...p, subtitle: e.target.value }))} className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-2.5 rounded-xl focus:border-indigo-500 outline-none transition-colors" placeholder={ar('مكان أو ملاحظة إضافية', 'Location or additional notes')} /></div>
                  </div>
                  <div className="flex gap-3 p-5 border-t border-white/10">
                    <button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl border border-white/10 transition-all cursor-pointer">{ar('إلغاء', 'Cancel')}</button>
                    <button onClick={() => { if (!newEvent.title || !newEvent.date) return; setCustomEvents(prev => [...prev, { ...newEvent, id: Date.now() }]); setNewEvent({ title: '', date: '', type: 'meeting', icon: '📋', subtitle: '' }); setShowAddModal(false) }}
                      className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white font-bold py-2.5 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2">
                      <i className="fas fa-plus"></i> {ar('إضافة', 'Add')}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {detailEvent && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setDetailEvent(null)} />
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                  className={`relative border rounded-2xl shadow-2xl w-full max-w-sm p-6 bg-slate-900/95 ${(TYPE_STYLE[detailEvent.type] || TYPE_STYLE.meeting).bg}`}>
                  <div className="text-center mb-4">
                    <div className="text-5xl mb-3">{detailEvent.icon || '📅'}</div>
                    <h3 className={`text-xl font-black ${(TYPE_STYLE[detailEvent.type] || TYPE_STYLE.meeting).text}`}>{detailEvent.title}</h3>
                    {detailEvent.subtitle && <p className="text-slate-400 text-sm mt-1">{detailEvent.subtitle}</p>}
                    <p className="text-slate-600 text-xs mt-2">{getTypeLabel(detailEvent.type)}</p>
                  </div>
                  <button onClick={() => setDetailEvent(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl border border-white/10 transition-all cursor-pointer">{ar('إغلاق', 'Close')}</button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </Layout>
    </ProtectedRoute>
  )
}
