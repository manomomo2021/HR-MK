import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

const LeaveHistoryModal = ({ isOpen, onClose, employee, leaves }) => {
    if (!isOpen || !employee) return null

    // Filter leaves for this employee
    const employeeLeaves = leaves
        .filter(l => String(l.employee_id) === String(employee.id))
        .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))

    const approvedLeaves = employeeLeaves.filter(l => l.status === 'approved')
    const totalDays = approvedLeaves.reduce((acc, curr) => acc + (parseInt(curr.days) || 0), 0)

    const getTypeInfo = (type) => ({
        'annual': { text: 'سنوية', icon: 'fa-umbrella-beach', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
        'casual': { text: 'عارضة', icon: 'fa-bolt', color: 'text-amber-400', bg: 'bg-amber-500/10' },
        'sick': { text: 'مرضية', icon: 'fa-hand-holding-medical', color: 'text-rose-400', bg: 'bg-rose-500/10' },
        'emergency': { text: 'طارئة', icon: 'fa-exclamation-triangle', color: 'text-orange-400', bg: 'bg-orange-500/10' }
    }[type] || { text: type, icon: 'fa-file', color: 'text-slate-400', bg: 'bg-slate-500/10' })

    const getStatusStyle = (status) => ({
        'pending': 'text-amber-400',
        'approved': 'text-teal-400',
        'rejected': 'text-rose-400'
    }[status] || 'text-slate-400')

    const getStatusText = (status) => ({ 'pending': 'معلق', 'approved': 'مقبول', 'rejected': 'مرفوض' }[status] || status)

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-slate-900 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden w-full max-w-2xl"
                >
                    {/* Header */}
                    <div className="relative p-6 border-b border-white/5 flex items-center gap-5 overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] pointer-events-none"></div>

                        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center shadow-inner relative z-10">
                            <i className="fas fa-user-clock text-3xl text-teal-400"></i>
                        </div>
                        <div className="relative z-10 flex-1">
                            <h2 className="text-2xl font-black text-white">{employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim()}</h2>
                            <p className="text-slate-400 font-medium">{employee.position || 'موظف'} • {employee.department || 'القسم العام'}</p>
                        </div>
                        <div className="relative z-10 text-center px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-xs font-bold text-slate-500 uppercase">إجمالي الغياب</p>
                            <p className="text-xl font-black text-teal-400">{totalDays} يوم</p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all relative z-10">
                            <i className="fas fa-times text-lg"></i>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {employeeLeaves.length > 0 ? (
                            <div className="relative border-r-2 border-slate-800 pr-6 space-y-6">
                                {employeeLeaves.map((leave, i) => {
                                    const info = getTypeInfo(leave.leave_type)
                                    return (
                                        <motion.div key={leave.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                            className="relative group">
                                            {/* Timeline Dot */}
                                            <div className={`absolute -right-[31px] top-4 w-4 h-4 rounded-full border-4 border-slate-900 ${leave.status === 'approved' ? 'bg-teal-500' : leave.status === 'rejected' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>

                                            {/* Card */}
                                            <div className={`bg-slate-800/50 border border-white/5 rounded-2xl p-5 hover:bg-slate-800 transition-colors`}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${info.bg} ${info.color}`}>
                                                            <i className={`fas ${info.icon}`}></i>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-white font-bold text-lg leading-none mb-1">إجازة {info.text}</h4>
                                                            <p className={`text-xs font-black ${getStatusStyle(leave.status)}`}>{getStatusText(leave.status)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-white font-black text-xl leading-none">{leave.days} <span className="text-sm text-slate-500 font-medium">يوم</span></p>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-950/50 rounded-xl p-3 flex justify-between items-center border border-white/5">
                                                    <div>
                                                        <p className="text-slate-500 text-[10px] font-bold uppercase mb-0.5">من</p>
                                                        <p className="text-slate-300 font-mono text-sm">{leave.start_date}</p>
                                                    </div>
                                                    <i className="fas fa-arrow-left text-slate-600 text-xs"></i>
                                                    <div className="text-left">
                                                        <p className="text-slate-500 text-[10px] font-bold uppercase mb-0.5">إلى</p>
                                                        <p className="text-slate-300 font-mono text-sm">{leave.end_date}</p>
                                                    </div>
                                                </div>

                                                {leave.reason && (
                                                    <div className="mt-3">
                                                        <p className="text-slate-500 text-xs font-medium">السبب: <span className="text-slate-300">{leave.reason}</span></p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="py-12 text-center flex flex-col items-center justify-center">
                                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 mb-4 shadow-inner">
                                    <i className="fas fa-calendar-check text-3xl"></i>
                                </div>
                                <h3 className="text-white font-bold text-lg mb-1">مفيش أي إجازات!</h3>
                                <p className="text-slate-400 text-sm">الموظف ده مخدش ولا إجازة مسجلة في النظام.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}

export default LeaveHistoryModal
