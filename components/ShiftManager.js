import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function ShiftManager({ language, ar }) {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editShift, setEditShift] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    startTime: '08:00',
    endTime: '17:00',
    graceMinutes: 15,
    breakMinutes: 60,
    workingDays: 5,
    isDefault: false,
  })

  const fetchShifts = async () => {
    try {
      const res = await fetch('/api/shifts')
      const result = await res.json()
      if (result.success) setShifts(result.data || [])
    } catch (err) {
      toast.error(ar('فشل تحميل الفترات', 'Failed to load shifts'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchShifts() }, [])

  const openCreate = () => {
    setEditShift(null)
    setFormData({
      name: '',
      name_ar: '',
      startTime: '08:00',
      endTime: '17:00',
      graceMinutes: 15,
      breakMinutes: 60,
      workingDays: 5,
      isDefault: false,
    })
    setShowModal(true)
  }

  const openEdit = (shift) => {
    setEditShift(shift)
    setFormData({
      name: shift.name || '',
      name_ar: shift.name_ar || '',
      startTime: shift.startTime || '08:00',
      endTime: shift.endTime || '17:00',
      graceMinutes: shift.graceMinutes || 15,
      breakMinutes: shift.breakMinutes || 60,
      workingDays: shift.workingDays || 5,
      isDefault: shift.isDefault || false,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.startTime || !formData.endTime) {
      toast.error(ar('يرجى تعبئة الاسم ووقت البدء والانتهاء', 'Name, start, and end time are required'))
      return
    }

    try {
      const url = editShift
        ? `/api/shifts?id=${editShift.id}`
        : '/api/shifts'
      const method = editShift ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const result = await res.json()

      if (result.success) {
        toast.success(editShift
          ? ar('تم تحديث الفترة', 'Shift updated')
          : ar('تم إنشاء الفترة', 'Shift created'))
        setShowModal(false)
        fetchShifts()
      } else {
        toast.error(result.error || 'Failed')
      }
    } catch (err) {
      toast.error(ar('خطأ في الحفظ', 'Save error'))
    }
  }

  const handleDelete = async (shift) => {
    if (!confirm(ar(`هل تريد حذف "${shift.name}"؟`, `Delete "${shift.name}"?`))) return

    try {
      const res = await fetch(`/api/shifts?id=${shift.id}`, { method: 'DELETE' })
      const result = await res.json()

      if (result.success) {
        toast.success(ar('تم الحذف', 'Deleted'))
        fetchShifts()
      } else {
        toast.error(result.error || 'Delete failed')
      }
    } catch (err) {
      toast.error(ar('خطأ في الحذف', 'Delete error'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm font-bold text-slate-500">
          {ar('عدد الفترات', 'Shifts')}: <span className="text-slate-800">{shifts.length}</span>
        </p>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={openCreate}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2">
          <i className="fas fa-plus text-xs"></i>
          {ar('إضافة فترة', 'Add Shift')}
        </motion.button>
      </div>

      {shifts.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-clock text-2xl text-slate-400"></i>
          </div>
          <p className="text-sm font-bold text-slate-500">
            {ar('لا توجد فترات بعد. أضف الفترة الأولى.', 'No shifts yet. Add your first shift.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shifts.map((shift) => (
            <motion.div key={shift.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 hover:shadow-md
                ${shift.isDefault ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200' : 'bg-white border-slate-200'}`}>

              {shift.isDefault && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[9px] font-black">
                  {ar('افتراضي', 'Default')}
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${shift.isDefault ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                  <i className="fas fa-clock"></i>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm">{shift.name}</h4>
                  {shift.name_ar && <p className="text-[11px] text-slate-400 font-medium">{shift.name_ar}</p>}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500">{ar('البداية', 'Start')}</span>
                  <span className="font-black font-mono text-slate-800">{shift.startTime}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500">{ar('النهاية', 'End')}</span>
                  <span className="font-black font-mono text-slate-800">{shift.endTime}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500">{ar('مهلة', 'Grace')}</span>
                  <span className="font-bold text-slate-700">{shift.graceMinutes} {ar('دقيقة', 'min')}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500">{ar('استراحة', 'Break')}</span>
                  <span className="font-bold text-slate-700">{shift.breakMinutes} {ar('دقيقة', 'min')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => openEdit(shift)}
                  className="flex-1 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5">
                  <i className="fas fa-pen text-[10px]"></i> {ar('تعديل', 'Edit')}
                </button>
                {!shift.isDefault && (
                  <button onClick={() => handleDelete(shift)}
                    className="py-2 px-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-[11px] font-bold hover:bg-rose-100 transition-all">
                    <i className="fas fa-trash-can text-[10px]"></i>
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Shift Form Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <i className="fas fa-clock text-indigo-600"></i>
                  </div>
                  <h3 className="font-black text-slate-900">
                    {editShift
                      ? ar('تعديل فترة', 'Edit Shift')
                      : ar('إضافة فترة جديدة', 'New Shift')}
                  </h3>
                </div>
                <button onClick={() => setShowModal(false)}
                  className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center border border-slate-200">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">{ar('الاسم (إنجليزي)*', 'Name (EN)*')}</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    className="input text-sm" placeholder="Morning" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">{ar('الاسم (عربي)', 'Name (AR)')}</label>
                  <input type="text" value={formData.name_ar} onChange={e => setFormData({...formData, name_ar: e.target.value})}
                    className="input text-sm" placeholder="صباحي" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">{ar('وقت البدء*', 'Start Time*')}</label>
                  <input type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})}
                    className="input text-sm font-mono text-center" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">{ar('وقت الانتهاء*', 'End Time*')}</label>
                  <input type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})}
                    className="input text-sm font-mono text-center" required />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">{ar('مهلة (د)', 'Grace (min)')}</label>
                  <input type="number" min="0" max="120" value={formData.graceMinutes}
                    onChange={e => setFormData({...formData, graceMinutes: parseInt(e.target.value) || 0})}
                    className="input text-sm text-center font-mono" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">{ar('استراحة (د)', 'Break (min)')}</label>
                  <input type="number" min="0" max="180" value={formData.breakMinutes}
                    onChange={e => setFormData({...formData, breakMinutes: parseInt(e.target.value) || 0})}
                    className="input text-sm text-center font-mono" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">{ar('أيام العمل', 'Work Days')}</label>
                  <input type="number" min="1" max="7" value={formData.workingDays}
                    onChange={e => setFormData({...formData, workingDays: parseInt(e.target.value) || 5})}
                    className="input text-sm text-center font-mono" />
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={formData.isDefault}
                  onChange={e => setFormData({...formData, isDefault: e.target.checked})}
                  className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 shadow-inner"></div>
                <span className="mr-3 text-xs font-bold text-slate-600">
                  {ar('فترة افتراضية', 'Default shift')}
                </span>
              </label>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-all">
                  {ar('إلغاء', 'Cancel')}
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm hover:shadow-lg transition-all shadow-md">
                  {editShift ? ar('تحديث', 'Update') : ar('إنشاء', 'Create')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
