import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

const Blobs = ({ isRtl }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div animate={{ scale: [1, 1.25, 1], x: [0, 40, 0], y: [0, -30, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      className={`absolute -top-40 ${isRtl ? '-right-40' : '-left-40'} w-[600px] h-[600px] rounded-full`}
      style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 70%)' }} />
    <motion.div animate={{ scale: [1, 1.2, 1], x: [0, -30, 0], y: [0, 40, 0] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      className={`absolute -bottom-40 ${isRtl ? '-left-40' : '-right-40'} w-[700px] h-[700px] rounded-full`}
      style={{ background: 'radial-gradient(circle, rgba(139,111,255,0.08) 0%, transparent 70%)' }} />
    <motion.div animate={{ scale: [1, 1.1, 1], x: [0, 50, 0], y: [0, 20, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
      className="absolute top-1/2 left-1/3 w-[400px] h-[400px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(0,122,255,0.06) 0%, transparent 70%)' }} />
    <div className="absolute inset-0 opacity-30"
      style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
  </div>
)

const FeatureTag = ({ icon, label, delay }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold bg-white/80 backdrop-blur-sm border border-white/30 text-indigo-200 shadow-sm">
    <i className={`fas ${icon} text-brand-300 text-xs`}></i>
    {label}
  </motion.div>
)

export default function LoginPage() {
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [focusedField, setFocused] = useState(null)
  const { user, login } = useAuth()
  const { language, toggleLanguage, isRtl } = useLanguage()
  const router = useRouter()

  useEffect(() => { if (user) router.push('/dashboard') }, [user, router])
  if (user) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(p => ({ ...p, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try { await login(formData.username, formData.password) }
    catch (err) { console.error('Login error:', err) }
    finally { setIsLoading(false) }
  }

  return (
    <div className="min-h-screen flex bg-[#f7f8fa] font-cairo" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Branding Panel */}
      <motion.div initial={{ opacity: 0, x: isRtl ? -50 : 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden p-12 ${isRtl ? '' : 'order-last'}`}
        style={{ background: 'linear-gradient(145deg, #1e0f52 0%, #6d4aff 40%, #5930e5 70%, #331a82 100%)' }}>
        <Blobs isRtl={isRtl} />

        <div className="relative z-10">
          <div className={`flex items-center gap-4 mb-2 ${isRtl ? '' : 'flex-row-reverse'}`}>
            <div className="w-14 h-14 rounded-2xl bg-white/12 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl shadow-brand-500/10">
              <i className="fas fa-gem text-white text-xl"></i>
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">HR MK</h2>
              <p className="text-indigo-300 text-[10px] font-bold tracking-[0.25em] uppercase">Enterprise</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/20 text-indigo-200 text-[10px] font-bold mb-6 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50"></span>
              {isRtl ? 'النظام يعمل بكفاءة كاملة' : 'System fully operational'}
            </div>

            {isRtl ? (
              <h1 className="text-5xl font-black text-white leading-tight tracking-tight mb-6">
                إدارة الموارد<br />
                <span className="text-transparent" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.3)' }}>البشرية</span><br />
                <span className="text-indigo-200">بذكاء فائق</span>
              </h1>
            ) : (
              <h1 className="text-5xl font-black text-white leading-tight tracking-tight mb-6">
                Smart<br />
                <span className="text-transparent" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.3)' }}>Human Resources</span><br />
                <span className="text-indigo-200">Management</span>
              </h1>
            )}

            <p className="text-indigo-300/80 font-medium leading-relaxed text-lg max-w-sm">
              {isRtl
                ? 'منصة متكاملة لإدارة الموظفين، الرواتب، الحضور والإجازات في بيئة عمل رقمية احترافية.'
                : 'Integrated employee, payroll, attendance and leave management platform in a professional digital environment.'}
            </p>
          </motion.div>

          <div className="flex flex-wrap gap-2 mt-10">
            {isRtl ? (
              <>
                <FeatureTag icon="fa-users" label="إدارة الموظفين" delay={0.5} />
                <FeatureTag icon="fa-calendar-check" label="الحضور الذكي" delay={0.6} />
                <FeatureTag icon="fa-money-check-dollar" label="رواتب تلقائية" delay={0.7} />
                <FeatureTag icon="fa-chart-line" label="تحليلات متقدمة" delay={0.8} />
                <FeatureTag icon="fa-fingerprint" label="بصمة بيومترية" delay={0.9} />
              </>
            ) : (
              <>
                <FeatureTag icon="fa-users" label="Employee Mgmt" delay={0.5} />
                <FeatureTag icon="fa-calendar-check" label="Smart Attendance" delay={0.6} />
                <FeatureTag icon="fa-money-check-dollar" label="Auto Payroll" delay={0.7} />
                <FeatureTag icon="fa-chart-line" label="Analytics" delay={0.8} />
                <FeatureTag icon="fa-fingerprint" label="Biometric" delay={0.9} />
              </>
            )}
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }} className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { value: '99.9%', label: isRtl ? 'وقت التشغيل' : 'Uptime' },
            { value: '100%', label: isRtl ? 'أمان البيانات' : 'Data Security' },
            { value: '24/7', label: isRtl ? 'دعم مستمر' : '24/7 Support' },
          ].map((s, i) => (
            <div key={i} className="text-center p-4 rounded-2xl bg-white/6 border border-white/10 backdrop-blur-sm">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-indigo-300/70 text-[10px] font-bold mt-1">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Login Form Panel */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="relative z-10 w-full max-w-[420px]">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #6d4aff, #5930e5)' }}>
              <i className="fas fa-gem text-white"></i>
            </div>
            <div>
              <h2 className="text-xl font-black text-surface-900">HR MK</h2>
              <p className="text-surface-400 text-[10px] font-bold uppercase tracking-[0.2em]">Enterprise</p>
            </div>
          </div>

          <div className="mb-10">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-[10px] font-black mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
              {isRtl ? 'النظام متاح للدخول' : 'System ready for login'}
            </motion.div>
            <h1 className="text-3xl font-black text-surface-900 tracking-tight mb-2">
              {isRtl ? 'مرحباً بك' : 'Welcome back'} <span className="inline-block animate-bounce-subtle">👋</span>
            </h1>
            <p className="text-surface-500 font-medium text-sm">
              {isRtl ? 'أدخل بياناتك للوصول إلى لوحة التحكم' : 'Enter your credentials to access the dashboard'}
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-surface-200 p-8 shadow-xl" style={{ boxShadow: '0 24px 64px rgba(20,22,29,0.08), 0 8px 20px rgba(20,22,29,0.04)' }}>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-black text-surface-700">{isRtl ? 'اسم المستخدم' : 'Username'}</label>
                <div className="relative">
                  <input type="text" name="username" value={formData.username} onChange={handleChange}
                    onFocus={() => setFocused('username')} onBlur={() => setFocused(null)} autoComplete="username"
                    placeholder={isRtl ? 'أدخل اسم المستخدم' : 'Enter username'} required
                    className={`w-full bg-surface-50 border text-surface-900 rounded-2xl px-5 py-3.5 ${isRtl ? 'pr-12' : 'pl-12'} text-sm font-bold placeholder-surface-400 outline-none transition-all duration-200 ${focusedField === 'username' ? 'border-brand-400 ring-4 ring-brand-500/10 bg-white' : 'border-surface-200 hover:border-surface-300'}`} />
                  <div className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 transition-colors duration-200 ${focusedField === 'username' ? 'text-brand-500' : 'text-surface-400'}`}>
                    <i className="fas fa-user text-sm"></i>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-black text-surface-700">{isRtl ? 'كلمة المرور' : 'Password'}</label>
                  <button type="button" className="text-[11px] font-bold text-brand-600 hover:text-brand-700 transition-colors">
                    {isRtl ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                  </button>
                </div>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                    onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} autoComplete="current-password"
                    placeholder={isRtl ? 'أدخل كلمة المرور' : 'Enter password'} required
                    className={`w-full bg-surface-50 border text-surface-900 rounded-2xl px-5 py-3.5 ${isRtl ? 'pr-12 pl-12' : 'pl-12 pr-12'} text-sm font-bold placeholder-surface-400 outline-none transition-all duration-200 ${focusedField === 'password' ? 'border-brand-400 ring-4 ring-brand-500/10 bg-white' : 'border-surface-200 hover:border-surface-300'}`} />
                  <div className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 transition-colors duration-200 ${focusedField === 'password' ? 'text-brand-500' : 'text-surface-400'}`}>
                    <i className="fas fa-lock text-sm"></i>
                  </div>
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors`}>
                    <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="remember" className="w-4 h-4 rounded accent-brand-500 border-surface-300" />
                <label htmlFor="remember" className="text-sm font-bold text-surface-600 cursor-pointer select-none">
                  {isRtl ? 'تذكرني في هذا الجهاز' : 'Remember this device'}
                </label>
              </div>

              <motion.button type="submit" disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.015 }} whileTap={{ scale: isLoading ? 1 : 0.985 }}
                className="w-full relative overflow-hidden rounded-2xl py-4 text-sm font-black text-white transition-all duration-300 flex items-center justify-center gap-3"
                style={{ background: isLoading ? 'linear-gradient(135deg, #a38cff, #8b6fff)' : 'linear-gradient(135deg, #6d4aff, #5930e5)', boxShadow: isLoading ? '0 8px 24px rgba(109,74,255,0.15)' : '0 8px 24px rgba(109,74,255,0.30)' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{isRtl ? 'جارٍ التحقق...' : 'Verifying...'}</span>
                    </motion.div>
                  ) : (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
                      <span>{isRtl ? 'الدخول إلى النظام' : 'Sign in'}</span>
                      <i className={`fas ${isRtl ? 'fa-arrow-left' : 'fa-arrow-right'} text-indigo-200 text-sm`}></i>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </form>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-surface-100"></div>
              <span className="text-[10px] font-bold text-surface-400">{isRtl ? 'نظام مؤمن بالكامل' : 'Fully secured system'}</span>
              <div className="flex-1 h-px bg-surface-100"></div>
            </div>

            <div className="flex items-center justify-center gap-8">
              {[
                { icon: 'fa-shield-halved', label: isRtl ? 'SSL آمن' : 'SSL Secure' },
                { icon: 'fa-lock', label: isRtl ? 'تشفير 256' : '256-bit' },
                { icon: 'fa-user-shield', label: isRtl ? 'GDPR' : 'GDPR' },
              ].map((b, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="w-9 h-9 rounded-xl bg-surface-50 border border-surface-200 flex items-center justify-center text-surface-400">
                    <i className={`fas ${b.icon} text-sm`}></i>
                  </div>
                  <span className="text-[8px] font-bold text-surface-400 whitespace-nowrap">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-[11px] font-bold text-surface-400 mt-8">
            © {new Date().getFullYear()} HR MK Enterprise — {isRtl ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
