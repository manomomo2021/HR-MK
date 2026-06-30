import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import {
  getExchangeRates,
  saveExchangeRates,
  getSupportedCurrencies,
  getLastUpdateTime,
  updateExchangeRatesFromAPI,
  formatCurrency,
  DEFAULT_EXCHANGE_RATES,
  getSyncConfig,
  saveSyncConfig,
  getRateHistory,
  clearRateHistory,
  saveExchangeRatesWithHistory,
  startAutoSync,
  stopAutoSync,
  SYNC_PROVIDERS
} from '../utils/currency'
import toast from 'react-hot-toast'

// ─── Derive premium rates from stored single rate ───
const deriveRates = (base) => ({
  buy: base * 0.985,
  sell: base * 1.015,
  centralBank: base,
  market: base * 1.002,
  change: (Math.random() * 1.2 - 0.3).toFixed(2),
  difference: (base * 1.015 - base * 0.985).toFixed(4)
})

const CURRENCY_ACCENT = {
  USD: { from: '#1a6b3c', to: '#0d9448' },
  EUR: { from: '#1a4b8c', to: '#2a6fc9' },
  SAR: { from: '#1a5c2a', to: '#2a8a3a' },
  AED: { from: '#1a5c2a', to: '#2a8a3a' },
  KWD: { from: '#1a4a3a', to: '#2a7a5a' },
  QAR: { from: '#4a2a6a', to: '#7a4aaa' },
  BHD: { from: '#6a2a2a', to: '#9a3a3a' },
  OMR: { from: '#2a4a5a', to: '#3a7a9a' },
  GBP: { from: '#1a2a6a', to: '#2a4a9a' },
  JPY: { from: '#6a4a1a', to: '#9a7a2a' },
  CNY: { from: '#4a1a1a', to: '#7a2a2a' },
  CHF: { from: '#1a4a3a', to: '#2a7a5a' }
}

// ─── Currency card component ───
const CurrencyCard = ({ currency, rate, onRateChange, isBase, isFavorite, onToggleFavorite, index, ar }) => {
  ar = ar || ((a, e) => a)
  const derived = deriveRates(rate || 0.0001)
  const accent = CURRENCY_ACCENT[currency.code] || { from: '#4a4a6a', to: '#6a6a9a' }
  const changeVal = parseFloat(derived.change)
  const isUp = changeVal >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-2xl border border-white/30 bg-white/70 backdrop-blur-md shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(109,74,255,0.10)] hover:border-purple-200/60 transition-all duration-300"
    >
      <div className="h-1 w-full absolute top-0 left-0 right-0 opacity-80" style={{ background: `linear-gradient(90deg, ${accent.from}, ${accent.to})` }} />

      <div className="p-4 pt-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="text-2xl">{currency.flag}</span>
              {isFavorite && <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white shadow-sm" />}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 leading-tight">{currency.name}</h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">{currency.code}</span>
                <span className="text-[11px] text-slate-300">·</span>
                <span className="text-[11px] font-bold" style={{ color: accent.to }}>{currency.symbol}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(currency.code) }}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${isFavorite ? 'text-amber-400 bg-amber-50' : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50/50'}`}>
              <i className={`${isFavorite ? 'fas' : 'far'} fa-star text-[10px]`}></i>
            </button>
            <div className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <i className={`fas fa-${isUp ? 'arrow-up' : 'arrow-down'} text-[8px] mr-0.5`}></i>
              {Math.abs(changeVal)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3">
          <div className="bg-slate-50/80 rounded-lg px-2.5 py-1.5 border border-slate-100/50">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{ar('شراء', 'Buy')}</p>
            <p className="text-xs font-bold font-mono text-slate-700 mt-0.5">{currency.code === 'EGP' ? '—' : formatCurrency(derived.buy, currency.code, false)}</p>
          </div>
          <div className="bg-slate-50/80 rounded-lg px-2.5 py-1.5 border border-slate-100/50">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{ar('بيع', 'Sell')}</p>
            <p className="text-xs font-bold font-mono text-slate-700 mt-0.5">{currency.code === 'EGP' ? '—' : formatCurrency(derived.sell, currency.code, false)}</p>
          </div>
          <div className="bg-indigo-50/60 rounded-lg px-2.5 py-1.5 border border-indigo-100/40">
            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">{ar('البنك المركزي', 'Central Bank')}</p>
            <p className="text-xs font-bold font-mono text-indigo-700 mt-0.5">{currency.code === 'EGP' ? '—' : formatCurrency(derived.centralBank, currency.code, false)}</p>
          </div>
          <div className="bg-amber-50/60 rounded-lg px-2.5 py-1.5 border border-amber-100/40">
            <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">{ar('السوق', 'Market')}</p>
            <p className="text-xs font-bold font-mono text-amber-700 mt-0.5">{currency.code === 'EGP' ? '—' : formatCurrency(derived.market, currency.code, false)}</p>
          </div>
        </div>

        {!isBase && (
          <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-100">
            <div className="flex-1 relative">
              <input type="number" step="0.0001" value={rate || 0} onChange={(e) => onRateChange(currency.code, e.target.value)}
                placeholder="0.0000"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-700 focus:border-purple-400 focus:ring-1 focus:ring-purple-200 outline-none transition-all" />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">1 EGP</span>
            </div>
          </div>
        )}

        {currency.code !== 'EGP' && (
          <div className="flex items-center justify-between mt-2 mb-2 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{ar('الفرق', 'Spread')}</span>
              <span className={`text-[10px] font-bold font-mono ${parseFloat(derived.difference) > 0.001 ? 'text-amber-600' : 'text-emerald-600'}`}>
                ±{formatCurrency(derived.difference, currency.code, false)}
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(changeVal)}%
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100/50">
          <span className="text-[10px] text-slate-400 font-medium">
            <i className="far fa-clock text-[8px] mr-1"></i> {ar('حالياً', 'Just now')}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currency.code === 'EGP' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {currency.code === 'EGP' ? ar('الأساسية', 'Base') : ar('نشط', 'Active')}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Component ───
const CurrencyManager = ({ isOpen, onClose }) => {
  const { language } = useLanguage()
  const ar = useCallback((a, e) => language === 'ar' ? a : e, [language])
  const isRtl = language === 'ar'

  const [rates, setRates] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [currencies] = useState(getSupportedCurrencies())
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [favorites, setFavorites] = useState([])
  const [userName] = useState('Finance Admin')

  // Sync state
  const [syncConfig, setSyncConfig] = useState(getSyncConfig())
  const [showSyncSettings, setShowSyncSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyData, setHistoryData] = useState([])
  const [syncStatusMessage, setSyncStatusMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadRates()
      setSyncConfig(getSyncConfig())
    }
    return () => stopAutoSync()
  }, [isOpen])

  useEffect(() => {
    // Start/stop auto-sync when config changes
    if (syncConfig.autoSync) {
      startAutoSync(syncConfig)
    } else {
      stopAutoSync()
    }
  }, [syncConfig.autoSync, syncConfig.syncInterval, syncConfig.provider, syncConfig.apiKey])

  const loadRates = () => {
    setRates(getExchangeRates())
    setLastUpdate(getLastUpdateTime())
  }

  const handleRateChange = (currency, value) => {
    const numericValue = parseFloat(value) || 0
    setRates(prev => ({ ...prev, [currency]: numericValue }))
  }

  const saveRates = async () => {
    setIsLoading(true)
    try {
      const success = saveExchangeRatesWithHistory(rates, 'manual_override')
      if (success) {
        toast.success(ar('تم حفظ أسعار الصرف بنجاح', 'Exchange rates saved successfully'))
        setLastUpdate(new Date())
      } else {
        toast.error(ar('فشل في حفظ أسعار الصرف', 'Failed to save exchange rates'))
      }
    } catch (error) {
      toast.error(ar('حدث خطأ أثناء حفظ أسعار الصرف', 'An error occurred while saving'))
    } finally { setIsLoading(false) }
  }

  const updateRatesFromAPI = async () => {
    setIsLoading(true)
    const loadingToast = toast.loading(ar('جاري تحديث أسعار الصرف...', 'Updating exchange rates...'))
    try {
      const result = await updateExchangeRatesFromAPI(syncConfig)
      toast.dismiss(loadingToast)
      if (result.success) {
        loadRates()
        setSyncConfig(getSyncConfig())
        toast.success(result.message)
      } else {
        toast.error(result.message)
        setSyncStatusMessage(result.message)
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(ar('فشل في تحديث أسعار الصرف', 'Failed to update exchange rates'))
    } finally { setIsLoading(false) }
  }

  const resetToDefaults = () => {
    setRates({ ...DEFAULT_EXCHANGE_RATES })
    toast.success(ar('تم إعادة تعيين أسعار الصرف للقيم الافتراضية', 'Exchange rates reset to defaults'))
  }

  const toggleFavorite = (code) => {
    setFavorites(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
  }

  const openHistory = () => {
    setHistoryData(getRateHistory(null, 50))
    setShowHistory(true)
  }

  const updateSyncConfig = (updates) => {
    const newConfig = { ...syncConfig, ...updates }
    setSyncConfig(newConfig)
    saveSyncConfig(newConfig)
  }

  // ─── Filtering ───
  const filteredCurrencies = useMemo(() => {
    let list = currencies
    switch (activeFilter) {
      case 'favorites': list = list.filter(c => favorites.includes(c.code)); break
      case 'official': list = list.filter(c => c.code === 'EGP' || rates[c.code] === DEFAULT_EXCHANGE_RATES[c.code]); break
      case 'manual': list = list.filter(c => c.code !== 'EGP' && rates[c.code] !== DEFAULT_EXCHANGE_RATES[c.code] && rates[c.code] > 0); break
      case 'updated_today': list = list.filter(c => c.code === 'EGP' || (lastUpdate && (new Date() - lastUpdate) < 86400000)); break
      default: break
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.flag.includes(q))
    }
    return list
  }, [currencies, activeFilter, searchQuery, favorites, rates])

  const otherCurrencies = filteredCurrencies.filter(c => c.code !== 'EGP')

  const filters = [
    { id: 'all', label: ar('الكل', 'All') },
    { id: 'favorites', label: ar('المفضلة', 'Favorites') },
    { id: 'official', label: ar('رسمي', 'Official') },
    { id: 'manual', label: ar('يدوي', 'Manual') },
    { id: 'updated_today', label: ar('مُحدَّث اليوم', 'Updated Today') },
  ]

  const now = new Date()
  const dateTimeStr = now.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6" style={{ perspective: '1200px' }} dir={isRtl ? 'rtl' : 'ltr'}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-indigo-950/60 to-slate-900/70 backdrop-blur-md" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 30, rotateX: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 30, rotateX: 6 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
            className="relative w-full max-w-[1280px] max-h-[92vh] bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.40),0_0_0_1px_rgba(255,255,255,0.08)_inset] overflow-hidden flex flex-col"
          >
            {/* ═══ HEADER ═══ */}
            <div className="relative flex-shrink-0 px-8 pt-7 pb-5 border-b border-slate-100/80" style={{ background: 'linear-gradient(135deg, #f8faff 0%, #f0f4ff 50%, #faf5ff 100%)' }}>
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-200/20 rounded-full blur-[60px] pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-200/15 rounded-full blur-[60px] pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200/40">
                      <i className="fas fa-exchange-alt text-white text-lg"></i>
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">{ar('إدارة أسعار الصرف', 'Exchange Rate Management')}</h2>
                      <p className="text-sm text-slate-500 font-medium mt-0.5">
                        {ar('إدارة وصيانة أسعار الصرف مقابل الجنيه المصري (EGP)', 'Manage and maintain exchange rates against the Egyptian Pound (EGP)')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-slate-200/80 shadow-sm">
                      <i className="fas fa-sync-alt text-[10px]" style={{ color: syncConfig.lastSyncStatus === 'error' ? '#ef4444' : '#94a3b8' }}></i>
                      <span className="text-[11px] font-bold text-slate-500">
                        {lastUpdate ? lastUpdate.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-slate-200/80 shadow-sm">
                      <i className="fas fa-user text-[10px] text-slate-400"></i>
                      <span className="text-[11px] font-bold text-slate-500">{userName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-slate-200/80 shadow-sm">
                      <i className="fas fa-clock text-[10px] text-slate-400"></i>
                      <span className="text-[11px] font-bold text-slate-500">{dateTimeStr}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50/80 border border-amber-200/60 shadow-sm">
                      <i className="fas fa-building-columns text-[10px] text-amber-500"></i>
                      <span className="text-[11px] font-bold text-amber-600">CBE</span>
                    </div>
                    {syncConfig.autoSync && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200/60 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[11px] font-bold text-emerald-600">{ar('تلقائي', 'Auto')}</span>
                      </div>
                    )}
                    {syncConfig.lastSyncStatus === 'error' && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50/80 border border-rose-200/60 shadow-sm" title={syncConfig.lastSyncError || ''}>
                        <i className="fas fa-triangle-exclamation text-[10px] text-rose-500"></i>
                        <span className="text-[11px] font-bold text-rose-600">{ar('خطأ', 'Error')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button onClick={updateRatesFromAPI} disabled={isLoading}
                      className={`w-9 h-9 rounded-xl border shadow-sm flex items-center justify-center transition-all duration-200 disabled:opacity-50 ${syncConfig.lastSyncStatus === 'error' ? 'bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100' : 'bg-white border-slate-200 text-slate-500 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50'}`}
                      title={ar('تحديث', 'Refresh rates')}>
                      <i className={`fas fa-sync-alt text-xs ${isLoading ? 'fa-spin' : ''}`}></i>
                    </button>
                    <button onClick={() => setShowSyncSettings(true)}
                      className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all duration-200"
                      title={ar('الإعدادات', 'Settings')}>
                      <i className="fas fa-cog text-xs"></i>
                    </button>
                    <button onClick={onClose}
                      className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all duration-200"
                      title={ar('إغلاق', 'Close')}>
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ SCROLLABLE BODY ═══ */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 custom-scrollbar" style={{ scrollbarGutter: 'stable' }}>
              {/* ═══ BASE CURRENCY CARD (EGP) ═══ */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                className="relative overflow-hidden rounded-2xl border-2 border-amber-300/60 bg-gradient-to-br from-amber-50 via-orange-50/30 to-amber-100/30 shadow-[0_4px_30px_rgba(251,191,36,0.12)]">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-200/20 rounded-full blur-[40px]" />
                <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-yellow-200/15 rounded-full blur-[30px]" />
                <div className="relative z-10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/80 border-2 border-amber-300/50 flex items-center justify-center shadow-sm backdrop-blur-sm">
                      <span className="text-3xl">🇪🇬</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-lg font-black text-slate-800">{ar('الجنيه المصري', 'Egyptian Pound')}</h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-200/60 text-[11px] font-bold text-amber-700 uppercase tracking-wider">{ar('العملة الأساسية', 'Base Currency')}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm font-bold font-mono text-slate-500">EGP</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-sm font-bold text-amber-600">ج.م</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-sm text-slate-400 font-medium">1 EGP = 1.0000</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6 bg-white/60 backdrop-blur-sm rounded-xl border border-amber-200/40 px-5 py-3 shadow-sm">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{ar('سعر الصرف', 'Exchange Rate')}</p>
                      <p className="text-2xl font-black text-slate-800 font-mono mt-0.5">1.0000</p>
                    </div>
                    <div className="w-px h-10 bg-amber-200/50" />
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{ar('الحالة', 'Status')}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 justify-center">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
                        <span className="text-sm font-bold text-emerald-600">{ar('نشط', 'Active')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ═══ INFORMATION BANNER ═══ */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border border-indigo-100/60 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 border border-indigo-200/60 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <i className="fas fa-circle-info text-indigo-600 text-sm"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <p className="text-sm font-bold text-indigo-700">
                      {ar('جميع الأسعار محسوبة مقابل الجنيه المصري (EGP)', 'All rates are calculated relative to the Egyptian Pound (EGP)')}
                    </p>
                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      <span className="flex items-center gap-1 text-amber-600 font-bold">
                        <i className="fas fa-triangle-exclamation text-[10px]"></i>
                        {ar('قد تكون قديمة', 'May be outdated')}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <i className="far fa-clock text-[10px]"></i>
                        {ar('آخر مزامنة:', 'Last sync:')} {lastUpdate ? lastUpdate.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US') : ar('أبداً', 'Never')}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {ar('المصدر: البنك المركزي المصري · أسعار منتصف السوق ·', 'Source: Central Bank of Egypt (CBE) · Mid-market rates')} {syncConfig.provider ? SYNC_PROVIDERS[syncConfig.provider]?.name || syncConfig.provider : ''}
                  </p>
                </div>
              </motion.div>

              {/* ═══ SEARCH + FILTERS + QUICK ACTIONS ═══ */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
                className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="relative w-full lg:w-72">
                  <i className={`fas fa-search absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none`}></i>
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={ar('ابحث بعملة، بلد، أو كود ISO...', 'Search by currency, country, or ISO code...')}
                    className={`w-full bg-white border border-slate-200 rounded-xl ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 text-sm text-slate-700 placeholder:text-slate-400 font-medium focus:border-purple-300 focus:ring-2 focus:ring-purple-100 outline-none transition-all`} />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')}
                      className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-500 transition-colors`}>
                      <i className="fas fa-times text-[8px]"></i>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-slate-100/60 rounded-xl p-1 border border-slate-200/50 flex-wrap">
                  {filters.map(f => (
                    <button key={f.id} onClick={() => setActiveFilter(f.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${activeFilter === f.id ? 'bg-white text-purple-700 shadow-sm border border-purple-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-600 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-all duration-200 flex items-center gap-1.5">
                    <i className="fas fa-plus text-[10px]"></i> {ar('إضافة', 'Add')}
                  </button>
                  <button onClick={resetToDefaults} disabled={isLoading}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-600 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50">
                    <i className="fas fa-undo text-[10px]"></i> {ar('إعادة', 'Reset')}
                  </button>
                  <button onClick={updateRatesFromAPI} disabled={isLoading}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50">
                    <i className={`fas fa-sync-alt text-[10px] ${isLoading ? 'fa-spin' : ''}`}></i> {ar('تحديث', 'Refresh')}
                  </button>
                  <button onClick={() => { updateSyncConfig({ autoSync: !syncConfig.autoSync }) }}
                    className={`px-3.5 py-2 rounded-xl shadow-sm text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${syncConfig.autoSync ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-200/40' : 'bg-white border border-slate-200 text-slate-600 hover:text-purple-600'}`}>
                    <i className={`fas fa-clock text-[10px]`}></i> {ar('تلقائي', 'Auto')} {syncConfig.autoSync ? ar('(نشط)', '(On)') : ''}
                  </button>
                  <button onClick={openHistory}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all duration-200 flex items-center gap-1.5">
                    <i className="fas fa-clock-rotate-left text-[10px]"></i> {ar('السجل', 'History')}
                  </button>
                </div>
              </motion.div>

              {/* ═══ CURRENCY CARDS GRID ═══ */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {filteredCurrencies.length === currencies.length
                      ? `${currencies.length} ${ar('عملة', 'Currencies')}`
                      : `${filteredCurrencies.length} ${ar('من', 'of')} ${currencies.length} ${ar('عملة', 'Currencies')}`
                    }
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">1 EGP =</span>
                    <div className="flex gap-1">
                      {['USD', 'EUR', 'SAR', 'GBP'].map(code => {
                        const c = currencies.find(cc => cc.code === code)
                        return c ? (
                          <span key={code} className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-mono font-bold text-slate-500">
                            {c.flag} {rates[code] ? (1 / rates[code]).toFixed(4) : '—'}
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {otherCurrencies.map((currency, i) => (
                    <CurrencyCard key={currency.code} currency={currency} rate={rates[currency.code] || 0}
                      onRateChange={handleRateChange} isBase={false} isFavorite={favorites.includes(currency.code)}
                      onToggleFavorite={toggleFavorite} index={i} ar={ar} />
                  ))}
                </div>

                {otherCurrencies.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
                      <i className="fas fa-search text-slate-400 text-2xl"></i>
                    </div>
                    <h3 className="text-base font-bold text-slate-600 mb-1">{ar('لا توجد عملات', 'No currencies found')}</h3>
                    <p className="text-sm text-slate-400">{ar('حاول تعديل معايير البحث أو التصفية.', 'Try adjusting your search or filter criteria.')}</p>
                  </motion.div>
                )}
                <div className="h-4" />
              </div>
            </div>

            {/* ═══ FOOTER ═══ */}
            <div className="relative flex-shrink-0 px-8 py-4 border-t border-slate-100/80 bg-gradient-to-r from-slate-50/90 to-white/90 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="font-medium">
                    <i className="fas fa-database text-[10px] mr-1"></i> {Object.keys(rates).length} {ar('سعر', 'rates loaded')}
                  </span>
                  <span className="hidden sm:inline">·</span>
                  <span className="hidden sm:inline font-medium">
                    <i className="fas fa-clock text-[10px] mr-1"></i>
                    {lastUpdate
                      ? `${ar('آخر تحديث', 'Last updated')} ${lastUpdate.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`
                      : ar('لم يتم التحديث بعد', 'Not yet updated')
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button onClick={onClose} disabled={isLoading}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 disabled:opacity-50">
                    {ar('إلغاء', 'Cancel')}
                  </button>
                  <button onClick={saveRates} disabled={isLoading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-sm font-bold text-white hover:from-purple-600 hover:to-indigo-700 shadow-md shadow-purple-200/30 transition-all duration-200 disabled:opacity-50 flex items-center gap-2">
                    {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="fas fa-floppy-disk text-xs"></i>}
                    {ar('حفظ', 'Save')}
                  </button>
                  <button onClick={() => { saveRates(); toast.success(ar('تم الحفظ والتطبيق بنجاح', 'Saved & applied successfully')) }} disabled={isLoading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-bold text-white hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-200/30 transition-all duration-200 disabled:opacity-50 flex items-center gap-2">
                    <i className="fas fa-check-double text-xs"></i> {ar('حفظ وتطبيق', 'Save & Apply')}
                  </button>
                  <button onClick={updateRatesFromAPI} disabled={isLoading}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5"
                    title={ar('تحديث من البنك المركزي', 'Refresh from Central Bank')}>
                    <i className={`fas fa-sync-alt text-xs ${isLoading ? 'fa-spin' : ''}`}></i>
                  </button>
                  <button onClick={onClose} disabled={isLoading}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-500 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5">
                    <i className="fas fa-times text-xs mr-1"></i> {ar('إغلاق', 'Close')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ═══ SYNC SETTINGS MODAL ═══ */}
          <AnimatePresence>
            {showSyncSettings && (
              <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSyncSettings(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" dir={isRtl ? 'rtl' : 'ltr'}>
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm">
                        <i className="fas fa-sliders text-white text-sm"></i>
                      </div>
                      <h3 className="text-lg font-black text-slate-800">{ar('إعدادات المزامنة', 'Sync Settings')}</h3>
                    </div>
                    <button onClick={() => setShowSyncSettings(false)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </div>
                  <div className="p-6 space-y-5">
                    {/* API Provider */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">{ar('مزود API', 'API Provider')}</label>
                      <select value={syncConfig.provider} onChange={(e) => updateSyncConfig({ provider: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 bg-white focus:border-purple-300 focus:ring-2 focus:ring-purple-100 outline-none transition-all">
                        {Object.entries(SYNC_PROVIDERS).map(([key, val]) => (
                          <option key={key} value={key}>{val.name}{val.needsKey ? ' (requires API key)' : ''}</option>
                        ))}
                      </select>
                    </div>
                    {/* API Key */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">API Key {ar('(إن لزم)', '(if required)')}</label>
                      <input type="password" value={syncConfig.apiKey} onChange={(e) => updateSyncConfig({ apiKey: e.target.value })}
                        placeholder={ar('أدخل مفتاح API...', 'Enter API key...')}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 font-medium focus:border-purple-300 focus:ring-2 focus:ring-purple-100 outline-none transition-all" />
                    </div>
                    {/* Sync Interval */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">{ar('فترة المزامنة', 'Sync Interval')}</label>
                      <select value={syncConfig.syncInterval} onChange={(e) => updateSyncConfig({ syncInterval: parseInt(e.target.value) })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 bg-white focus:border-purple-300 focus:ring-2 focus:ring-purple-100 outline-none transition-all">
                        <option value={900000}>{ar('كل 15 دقيقة', 'Every 15 minutes')}</option>
                        <option value={1800000}>{ar('كل 30 دقيقة', 'Every 30 minutes')}</option>
                        <option value={3600000}>{ar('كل ساعة', 'Every hour')}</option>
                        <option value={7200000}>{ar('كل ساعتين', 'Every 2 hours')}</option>
                        <option value={21600000}>{ar('كل 6 ساعات', 'Every 6 hours')}</option>
                        <option value={86400000}>{ar('كل 24 ساعة', 'Every 24 hours')}</option>
                      </select>
                    </div>
                    {/* Max Retries */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">{ar('عدد محاولات إعادة المحاولة', 'Max Retries')}</label>
                      <select value={syncConfig.maxRetries} onChange={(e) => updateSyncConfig({ maxRetries: parseInt(e.target.value) })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 bg-white focus:border-purple-300 focus:ring-2 focus:ring-purple-100 outline-none transition-all">
                        {[0, 1, 2, 3, 5].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    {/* Auto Sync Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <h4 className="text-sm font-bold text-slate-700">{ar('المزامنة التلقائية', 'Auto Sync')}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{ar('تحديث أسعار الصرف تلقائياً', 'Automatically update exchange rates')}</p>
                      </div>
                      <button onClick={() => updateSyncConfig({ autoSync: !syncConfig.autoSync })}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${syncConfig.autoSync ? 'bg-purple-500' : 'bg-slate-300'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${syncConfig.autoSync ? (isRtl ? 'translate-x-[-1.5rem]' : 'translate-x-6') : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {/* Sync Status */}
                    {syncConfig.lastSyncError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2">
                        <i className="fas fa-triangle-exclamation text-rose-500 mt-0.5 text-xs"></i>
                        <div>
                          <p className="text-xs font-bold text-rose-600">{ar('خطأ في المزامنة', 'Sync Error')}</p>
                          <p className="text-xs text-rose-500 mt-0.5">{syncConfig.lastSyncError}</p>
                        </div>
                      </div>
                    )}
                    {syncConfig.lastSyncStatus === 'success' && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2">
                        <i className="fas fa-check-circle text-emerald-500 mt-0.5 text-xs"></i>
                        <p className="text-xs font-bold text-emerald-600">{ar('آخر مزامنة ناجحة', 'Last sync successful')}</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={() => setShowSyncSettings(false)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                      {ar('إغلاق', 'Close')}
                    </button>
                    <button onClick={async () => { await updateRatesFromAPI(); setShowSyncSettings(false) }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-sm font-bold text-white hover:from-purple-600 hover:to-indigo-700 shadow-md shadow-purple-200/30 transition-all flex items-center gap-2">
                      <i className="fas fa-sync-alt text-xs"></i> {ar('اختبار الاتصال', 'Test & Sync')}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ═══ HISTORY MODAL ═══ */}
          <AnimatePresence>
            {showHistory && (
              <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                        <i className="fas fa-clock-rotate-left text-white text-sm"></i>
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-800">{ar('سجل المزامنة', 'Sync History')}</h3>
                        <p className="text-xs text-slate-500">{historyData.length} {ar('تسجيل', 'entries')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { clearRateHistory(); setHistoryData([]) }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-rose-500 hover:bg-rose-50 transition-all">
                        {ar('مسح', 'Clear')}
                      </button>
                      <button onClick={() => setShowHistory(false)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                        <i className="fas fa-times text-xs"></i>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-2">
                    {historyData.length > 0 ? historyData.map((entry, i) => (
                      <motion.div key={entry.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${entry.source?.includes('api') ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                            <i className={`fas ${entry.source?.includes('api') ? 'fa-cloud-arrow-down' : 'fa-pen'} text-xs`}></i>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700">
                              {entry.source?.includes('api')
                                ? ar(`مزامنة ${entry.source.replace('api:', '')}`, `Sync: ${entry.source.replace('api:', '')}`)
                                : entry.source === 'manual_override' ? ar('تعديل يدوي', 'Manual Override') : entry.source || ar('غير معروف', 'Unknown')}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {new Date(entry.timestamp).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {entry.rates && Object.entries(entry.rates).slice(0, 5).map(([code, val]) => (
                                <span key={code} className="px-1.5 py-0.5 bg-white rounded text-[9px] font-mono font-bold text-slate-500 border border-slate-100">
                                  {code}: {typeof val === 'number' ? val.toFixed(4) : val}
                                </span>
                              ))}
                              {entry.rates && Object.keys(entry.rates).length > 5 && (
                                <span className="px-1.5 py-0.5 bg-white rounded text-[9px] font-bold text-slate-400 border border-slate-100">
                                  +{Object.keys(entry.rates).length - 5} {ar('أخرى', 'more')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
                          <i className="fas fa-clock-rotate-left text-slate-400 text-xl"></i>
                        </div>
                        <h3 className="text-base font-bold text-slate-600 mb-1">{ar('لا يوجد سجل', 'No history yet')}</h3>
                        <p className="text-sm text-slate-400">{ar('قم بمزامنة أو تعديل الأسعار لظهور السجل.', 'Sync or modify rates to see history.')}</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t border-slate-100 flex justify-end">
                    <button onClick={() => setShowHistory(false)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 text-sm font-bold text-white hover:from-slate-700 hover:to-slate-800 transition-all">
                      {ar('إغلاق', 'Close')}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  )
}

export default CurrencyManager
