import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import { motion, AnimatePresence } from 'framer-motion'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js'
import toast from 'react-hot-toast'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler)

export default function Profile() {
  const { user, updateUser } = useAuth()
  const { language } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({ name: user?.name || '', email: user?.email || '', phone: '', department: '', position: '', joinDate: '', avatar: '' })
  const [stats, setStats] = useState({})
  const [activities, setActivities] = useState([])

  useEffect(() => { generateUserStats(); generateRecentActivities() }, [])

  const generateUserStats = () => {
    const attendanceData = Array.from({ length: 30 }, () => Math.random() > 0.15 ? 1 : 0)
    const attendanceRate = (attendanceData.filter(d => d === 1).length / 30) * 100
    const monthlyAttendance = {
      labels: [ar('يناير', 'Jan'), ar('فبراير', 'Feb'), ar('مارس', 'Mar'), ar('أبريل', 'Apr'), ar('مايو', 'May'), ar('يونيو', 'Jun')],
      datasets: [{ label: ar('نسبة الحضور %', 'Attendance %'), data: [88, 92, 85, 90, 94, 87], borderColor: 'rgb(34, 197, 94)', backgroundColor: 'rgba(34, 197, 94, 0.1)', tension: 0.4, fill: true }]
    }
    setStats({ attendanceRate: Math.round(attendanceRate), totalWorkDays: 30, presentDays: attendanceData.filter(d => d === 1).length, lateCount: 3, overtimeHours: 25, performanceScore: 85, monthlyAttendance })
  }

  const generateRecentActivities = () => {
    setActivities([
      { type: 'attendance', title: ar('تسجيل حضور', 'Check In'), description: ar('تم تسجيل الحضور في الوقت المحدد', 'Arrived on time'), time: '08:00', date: ar('اليوم', 'Today'), icon: 'fas fa-clock', color: 'text-green-600' },
      { type: 'task', title: ar('إنجاز مهمة', 'Task Completed'), description: ar('تم إنجاز مشروع تطوير النظام', 'System development project completed'), time: '02:30', date: ar('أمس', 'Yesterday'), icon: 'fas fa-check-circle', color: 'text-blue-600' },
      { type: 'meeting', title: ar('اجتماع فريق', 'Team Meeting'), description: ar('حضور اجتماع مراجعة المشروع', 'Project review meeting'), time: '10:00', date: ar('أمس', 'Yesterday'), icon: 'fas fa-users', color: 'text-purple-600' },
      { type: 'overtime', title: ar('وقت إضافي', 'Overtime'), description: ar('عمل لمدة ساعتين إضافيتين', 'Worked 2 extra hours'), time: '06:00', date: ar('منذ يومين', '2 days ago'), icon: 'fas fa-hourglass-half', color: 'text-orange-600' }
    ])
  }

  const handleSaveProfile = () => { updateUser(profileData); setIsEditing(false); toast.success(ar('تم تحديث الملف الشخصي بنجاح', 'Profile updated')) }

  const tabs = [
    { key: 'overview', title: ar('نظرة عامة', 'Overview'), icon: 'fas fa-chart-pie' },
    { key: 'activities', title: ar('الأنشطة', 'Activities'), icon: 'fas fa-history' },
    { key: 'settings', title: ar('الإعدادات', 'Settings'), icon: 'fas fa-cog' }
  ]

  return (
    <ProtectedRoute>
      <Layout>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-violet-600 to-brand-800 p-6 sm:p-8 text-white shadow-md">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4 sm:gap-6">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="relative">
                  <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30 text-white shadow-sm flex-shrink-0">
                    <i className="fas fa-user text-3xl"></i>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    <i className="fas fa-check text-white text-[10px]"></i>
                  </div>
                </motion.div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-white">{user?.name || ar('اسم المستخدم', 'User Name')}</h1>
                  <p className="text-xs text-brand-100 font-bold mt-1 uppercase tracking-wider">{profileData.position || '—'} • {profileData.department || '—'}</p>
                  <p className="text-[10px] text-brand-200 mt-0.5 font-mono">ID: {user?.id || '—'}</p>
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setIsEditing(!isEditing)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all font-bold text-xs border border-white/25 flex items-center justify-center gap-2 self-start sm:self-auto shadow-sm">
                <i className="fas fa-edit text-[10px]"></i> {ar('تعديل الملف الشخصي', 'Edit Profile')}
              </motion.button>
            </div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-24 translate-x-24 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full translate-y-16 -translate-x-16 pointer-events-none"></div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: ar('نسبة الحضور', 'Attendance Rate'), value: `${stats.attendanceRate}%`, icon: 'fas fa-calendar-check', color: 'bg-emerald-50 text-emerald-600' },
              { title: ar('أيام العمل', 'Work Days'), value: `${stats.presentDays}/${stats.totalWorkDays}`, icon: 'fas fa-calendar-day', color: 'bg-brand-50 text-brand-600' },
              { title: ar('الوقت الإضافي', 'Overtime'), value: `${stats.overtimeHours}h`, icon: 'fas fa-clock', color: 'bg-violet-50 text-violet-600' },
              { title: ar('نقاط الأداء', 'Performance'), value: `${stats.performanceScore}/100`, icon: 'fas fa-star', color: 'bg-amber-50 text-amber-600' }
            ].map((stat, index) => (
              <div key={index} className="bg-white border border-surface-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color.split(' ')[0]} ${stat.color.split(' ')[1]}`}>
                  <i className={`fas ${stat.icon} text-lg`}></i>
                </div>
                <div><p className="text-xl font-black text-surface-900 leading-none">{stat.value}</p><p className="text-xs font-bold text-surface-500 mt-1">{stat.title}</p></div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden shadow-sm">
            <div className="border-b border-surface-200 bg-surface-50 p-4">
              <div className="flex flex-wrap gap-2">
                {tabs.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 rounded-lg font-black text-xs transition-all duration-200 flex items-center gap-2 ${activeTab === tab.key ? 'bg-brand-600 text-white shadow-md shadow-brand-600/10' : 'text-surface-500 hover:text-surface-950'}`}>
                    <i className={`${tab.icon} text-[10px]`}></i> {tab.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-sm font-black text-surface-900 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-3 bg-brand-600 rounded-full"></span> {ar('الحضور الشهري', 'Monthly Attendance')}
                      </h3>
                      <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
                        {stats.monthlyAttendance && <Line data={stats.monthlyAttendance} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }} />}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-surface-900 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-3 bg-brand-600 rounded-full"></span> {ar('ملخص الأداء', 'Performance Summary')}
                      </h3>
                      <div className="space-y-3">
                        {[
                          { label: ar('أيام الحضور', 'Present Days'), value: `${stats.presentDays} ${ar('يوم', 'days')}`, color: 'text-emerald-600' },
                          { label: ar('مرات التأخير', 'Late Count'), value: `${stats.lateCount} ${ar('مرات', 'times')}`, color: 'text-rose-600' },
                          { label: ar('الساعات الإضافية', 'Overtime Hours'), value: `${stats.overtimeHours} ${ar('ساعة', 'hours')}`, color: 'text-brand-600' },
                          { label: ar('تقييم الأداء العام', 'Overall Score'), value: `${stats.performanceScore}/100`, color: 'text-violet-600' }
                        ].map((item, i) => (
                          <div key={i} className="flex justify-between items-center p-3.5 bg-surface-50 border border-surface-200 rounded-xl">
                            <span className="text-xs font-bold text-surface-500">{item.label}</span>
                            <span className={`text-sm font-black ${item.color}`}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'activities' && (
                  <motion.div key="activities" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    <h3 className="text-sm font-black text-surface-900 mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-3 bg-brand-600 rounded-full"></span> {ar('سجل الأنشطة الأخيرة', 'Recent Activity Log')}
                    </h3>
                    <div className="divide-y divide-surface-200 border border-surface-200 rounded-xl bg-white overflow-hidden">
                      {activities.map((activity, index) => (
                        <motion.div key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}
                          className="flex items-center gap-4 p-4 hover:bg-surface-50 transition-colors">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${activity.color.includes('green') ? 'bg-emerald-50' : activity.color.includes('blue') ? 'bg-brand-50' : activity.color.includes('purple') ? 'bg-violet-50' : 'bg-amber-50'} ${activity.color}`}>
                            <i className={`${activity.icon} text-sm`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-black text-surface-900">{activity.title}</h4>
                            <p className="text-[11px] text-surface-400 font-bold truncate mt-0.5">{activity.description}</p>
                          </div>
                          <div className="text-left flex-shrink-0">
                            <div className="text-xs font-black text-surface-700 font-mono">{activity.time}</div>
                            <div className="text-[9px] text-surface-400 font-bold mt-0.5">{activity.date}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'settings' && (
                  <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                    <h3 className="text-sm font-black text-surface-900 flex items-center gap-2">
                      <span className="w-1.5 h-3 bg-brand-600 rounded-full"></span> {ar('تعديل بيانات الحساب', 'Edit Account Settings')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: ar('الاسم الكامل', 'Full Name'), value: profileData.name, field: 'name' },
                        { label: ar('البريد الإلكتروني', 'Email'), value: profileData.email, field: 'email', type: 'email' },
                        { label: ar('رقم الهاتف', 'Phone'), value: profileData.phone, field: 'phone', type: 'tel' },
                        { label: ar('القسم', 'Department'), value: profileData.department, field: 'department' }
                      ].map((item) => (
                        <div key={item.field} className="space-y-1.5">
                          <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{item.label}</label>
                          <input type={item.type || 'text'} value={item.value}
                            onChange={e => setProfileData({ ...profileData, [item.field]: e.target.value })}
                            disabled={!isEditing} className="input text-xs font-bold" />
                        </div>
                      ))}
                    </div>
                    {isEditing && (
                      <div className="flex gap-2.5 pt-2">
                        <button onClick={handleSaveProfile} className="btn btn-primary btn-md"><i className="fas fa-save"></i> {ar('حفظ التغييرات', 'Save Changes')}</button>
                        <button onClick={() => setIsEditing(false)} className="btn btn-secondary btn-md"><i className="fas fa-times"></i> {ar('إلغاء', 'Cancel')}</button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </Layout>
    </ProtectedRoute>
  )
}
