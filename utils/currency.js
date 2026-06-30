// نظام إدارة العملات وأسعار الصرف

// أسعار الصرف الافتراضية (مقابل الجنيه المصري)
export const DEFAULT_EXCHANGE_RATES = {
  EGP: 1.0,        // جنيه مصري (العملة الأساسية)
  SAR: 0.121,      // ريال سعودي
  USD: 0.032,      // دولار أمريكي
  EUR: 0.030,      // يورو
  AED: 0.118,      // درهم إماراتي
  KWD: 0.0098,     // دينار كويتي
  QAR: 0.117,      // ريال قطري
  BHD: 0.012,      // دينار بحريني
  OMR: 0.012,      // ريال عماني
  JOD: 0.023,      // دينار أردني
  LBP: 485,        // ليرة لبنانية
  TRY: 0.95,       // ليرة تركية
  GBP: 0.026,      // جنيه إسترليني
  JPY: 4.82,       // ين ياباني
  CNY: 0.234,      // يوان صيني
  INR: 2.69        // روبية هندية
}

// معلومات العملات
export const CURRENCIES = {
  EGP: { name: 'جنيه مصري', symbol: 'ج.م', code: 'EGP', flag: '🇪🇬' },
  SAR: { name: 'ريال سعودي', symbol: 'ر.س', code: 'SAR', flag: '🇸🇦' },
  USD: { name: 'دولار أمريكي', symbol: '$', code: 'USD', flag: '🇺🇸' },
  EUR: { name: 'يورو', symbol: '€', code: 'EUR', flag: '🇪🇺' },
  AED: { name: 'درهم إماراتي', symbol: 'د.إ', code: 'AED', flag: '🇦🇪' },
  KWD: { name: 'دينار كويتي', symbol: 'د.ك', code: 'KWD', flag: '🇰🇼' },
  QAR: { name: 'ريال قطري', symbol: 'ر.ق', code: 'QAR', flag: '🇶🇦' },
  BHD: { name: 'دينار بحريني', symbol: 'د.ب', code: 'BHD', flag: '🇧🇭' },
  OMR: { name: 'ريال عماني', symbol: 'ر.ع', code: 'OMR', flag: '🇴🇲' },
  JOD: { name: 'دينار أردني', symbol: 'د.أ', code: 'JOD', flag: '🇯🇴' },
  LBP: { name: 'ليرة لبنانية', symbol: 'ل.ل', code: 'LBP', flag: '🇱🇧' },
  TRY: { name: 'ليرة تركية', symbol: '₺', code: 'TRY', flag: '🇹🇷' },
  GBP: { name: 'جنيه إسترليني', symbol: '£', code: 'GBP', flag: '🇬🇧' },
  JPY: { name: 'ين ياباني', symbol: '¥', code: 'JPY', flag: '🇯🇵' },
  CNY: { name: 'يوان صيني', symbol: '¥', code: 'CNY', flag: '🇨🇳' },
  CHF: { name: 'فرنك سويسري', symbol: 'CHF', code: 'CHF', flag: '🇨🇭' },
  INR: { name: 'روبية هندية', symbol: '₹', code: 'INR', flag: '🇮🇳' }
}

// الحصول على أسعار الصرف المحفوظة أو الافتراضية
export const getExchangeRates = () => {
  try {
    const savedRates = localStorage.getItem('hr_system_exchange_rates')
    if (savedRates) {
      const rates = JSON.parse(savedRates)
      // التحقق من وجود جميع العملات المطلوبة
      const hasAllCurrencies = Object.keys(DEFAULT_EXCHANGE_RATES).every(currency => 
        rates.hasOwnProperty(currency)
      )
      if (hasAllCurrencies) {
        return rates
      }
    }
  } catch (error) {
    console.error('خطأ في تحميل أسعار الصرف:', error)
  }
  
  // إرجاع الأسعار الافتراضية إذا لم توجد أسعار محفوظة
  return DEFAULT_EXCHANGE_RATES
}

// حفظ أسعار الصرف
export const saveExchangeRates = (rates) => {
  try {
    localStorage.setItem('hr_system_exchange_rates', JSON.stringify(rates))
    localStorage.setItem('hr_system_exchange_rates_updated', new Date().toISOString())
    return true
  } catch (error) {
    console.error('خطأ في حفظ أسعار الصرف:', error)
    return false
  }
}

// تحويل مبلغ من عملة إلى أخرى
export const convertCurrency = (amount, fromCurrency, toCurrency) => {
  if (!amount || amount === 0) return 0
  if (fromCurrency === toCurrency) return amount

  const rates = getExchangeRates()
  
  if (!rates[fromCurrency] || !rates[toCurrency]) {
    console.error('عملة غير مدعومة:', fromCurrency, toCurrency)
    return amount
  }

  // تحويل إلى الريال السعودي أولاً ثم إلى العملة المطلوبة
  const amountInSAR = amount / rates[fromCurrency]
  const convertedAmount = amountInSAR * rates[toCurrency]
  
  return Math.round(convertedAmount * 100) / 100 // تقريب إلى منزلتين عشريتين
}

// تنسيق المبلغ مع رمز العملة
export const formatCurrency = (amount, currency = 'SAR', showSymbol = true) => {
  if (!amount && amount !== 0) return '-'
  
  const currencyInfo = CURRENCIES[currency] || CURRENCIES.SAR
  const formattedAmount = new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
  
  if (showSymbol) {
    return `${formattedAmount} ${currencyInfo.symbol}`
  }
  
  return formattedAmount
}

// الحصول على معلومات العملة
export const getCurrencyInfo = (currencyCode) => {
  return CURRENCIES[currencyCode] || CURRENCIES.SAR
}

// الحصول على قائمة العملات المدعومة
export const getSupportedCurrencies = () => {
  return Object.keys(CURRENCIES).map(code => ({
    code,
    ...CURRENCIES[code]
  }))
}

// ─── Exchange Rate Sync Configuration ───
const SYNC_CONFIG_KEY = 'hr_system_exchange_sync_config'
const RATE_HISTORY_KEY = 'hr_system_exchange_rate_history'
const MAX_HISTORY_ENTRIES = 100
const DEFAULT_SYNC_INTERVAL = 3600000 // 1 hour

// Supported API providers
export const SYNC_PROVIDERS = {
  exchangerate_api: { name: 'ExchangeRate-API', url: 'https://v6.exchangerate-api.com/v6/{apiKey}/latest/EGP', needsKey: true },
  frankfurter: { name: 'Frankfurter', url: 'https://api.frankfurter.app/latest?from=EGP', needsKey: false },
  exchangerate_host: { name: 'ExchangeRate.host', url: 'https://api.exchangerate.host/latest?base=EGP', needsKey: false }
}

export const getSyncConfig = () => {
  try {
    const saved = localStorage.getItem(SYNC_CONFIG_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return {
    provider: 'frankfurter',
    apiKey: '',
    autoSync: false,
    syncInterval: DEFAULT_SYNC_INTERVAL,
    maxRetries: 3,
    lastSyncStatus: null,
    lastSyncError: null
  }
}

export const saveSyncConfig = (config) => {
  try {
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config))
    return true
  } catch (e) { return false }
}

// ─── Rate History ───
export const getRateHistory = (currencyCode = null, limit = 50) => {
  try {
    const data = localStorage.getItem(RATE_HISTORY_KEY)
    if (!data) return []
    let history = JSON.parse(data)
    if (currencyCode) history = history.filter(h => h.currency === currencyCode)
    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit)
  } catch { return [] }
}

export const addRateHistoryEntry = (rates, source) => {
  try {
    const existing = JSON.parse(localStorage.getItem(RATE_HISTORY_KEY) || '[]')
    const snapshot = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      source: source || 'manual',
      rates: { ...rates }
    }
    existing.unshift(snapshot)
    if (existing.length > MAX_HISTORY_ENTRIES) existing.length = MAX_HISTORY_ENTRIES
    localStorage.setItem(RATE_HISTORY_KEY, JSON.stringify(existing))
  } catch (e) { console.error('Failed to save rate history:', e) }
}

export const clearRateHistory = () => {
  try { localStorage.removeItem(RATE_HISTORY_KEY); return true } catch { return false }
}

// ─── Fetch rates from configured provider ───
async function fetchRatesFromProvider(provider, apiKey) {
  const providerConfig = SYNC_PROVIDERS[provider]
  if (!providerConfig) throw new Error(`Unknown provider: ${provider}`)

  let url = providerConfig.url
  if (providerConfig.needsKey && apiKey) url = url.replace('{apiKey}', apiKey)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  let response
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })
  } finally {
    clearTimeout(timeoutId)
  }
  if (!response.ok) throw new Error(`API responded with status ${response.status}`)
  const data = await response.json()

  // Normalize different API response formats to our format
  let fetchedRates = {}

  if (data.conversion_rates) {
    // ExchangeRate-API format
    fetchedRates = data.conversion_rates
  } else if (data.rates) {
    // Frankfurter / ExchangeRate.host format
    fetchedRates = data.rates
  } else {
    throw new Error('Unrecognized API response format')
  }

  // Convert to EGP base (API returns rates with EGP as base already)
  // Ensure EGP = 1.0 and map to our supported currencies
  const mapped = { EGP: 1.0 }
  const supported = Object.keys(DEFAULT_EXCHANGE_RATES)
  for (const code of supported) {
    if (fetchedRates[code] !== undefined) {
      mapped[code] = fetchedRates[code]
    }
  }

  return mapped
}

// ─── Update rates from API with retry logic ───
export const updateExchangeRatesFromAPI = async (overrideConfig = null) => {
  const config = overrideConfig || getSyncConfig()
  const maxRetries = config.maxRetries || 3
  let lastError = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const fetchedRates = await fetchRatesFromProvider(config.provider, config.apiKey)

      // Merge fetched rates with existing (keep manual overrides for unsupported currencies)
      const existing = getExchangeRates()
      const merged = { ...existing, ...fetchedRates }

      // Save
      saveExchangeRates(merged)

      // Record history
      addRateHistoryEntry(merged, `api:${config.provider}`)

      // Update config with success status
      const updatedConfig = { ...config, lastSyncStatus: 'success', lastSyncError: null }
      saveSyncConfig(updatedConfig)

      return {
        success: true,
        message: `Rates synchronized via ${SYNC_PROVIDERS[config.provider]?.name || config.provider}`,
        timestamp: new Date().toISOString(),
        rates: merged,
        attempt
      }
    } catch (error) {
      lastError = error
      console.error(`Sync attempt ${attempt}/${maxRetries} failed:`, error.message)

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s...
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)))
      }
    }
  }

  // All retries failed
  const updatedConfig = { ...config, lastSyncStatus: 'error', lastSyncError: lastError?.message || 'Unknown error' }
  saveSyncConfig(updatedConfig)

  return {
    success: false,
    message: `Sync failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
    error: lastError?.message,
    timestamp: new Date().toISOString()
  }
}

// ─── Auto-sync management ───
let autoSyncTimer = null

export const startAutoSync = (config) => {
  stopAutoSync()
  if (!config.autoSync) return

  const interval = config.syncInterval || DEFAULT_SYNC_INTERVAL
  autoSyncTimer = setInterval(async () => {
    try {
      await updateExchangeRatesFromAPI(config)
    } catch (e) {
      console.error('Auto-sync failed:', e)
    }
  }, interval)

  // Also fire immediately if rates haven't been updated recently
  const lastUpdate = getLastUpdateTime()
  if (!lastUpdate || (Date.now() - lastUpdate.getTime()) > interval) {
    updateExchangeRatesFromAPI(config).catch(() => {})
  }
}

export const stopAutoSync = () => {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer)
    autoSyncTimer = null
  }
}

// ─── Manual override with history logging ───
export const saveExchangeRatesWithHistory = (rates, overrideNote = '') => {
  const result = saveExchangeRates(rates)
  if (result) {
    addRateHistoryEntry(rates, overrideNote || 'manual_override')
  }
  return result
}

// الحصول على تاريخ آخر تحديث لأسعار الصرف
export const getLastUpdateTime = () => {
  try {
    const lastUpdate = localStorage.getItem('hr_system_exchange_rates_updated')
    return lastUpdate ? new Date(lastUpdate) : null
  } catch (error) {
    return null
  }
}

// التحقق من الحاجة لتحديث أسعار الصرف (أكثر من 24 ساعة)
export const needsRateUpdate = () => {
  const lastUpdate = getLastUpdateTime()
  if (!lastUpdate) return true
  
  const now = new Date()
  const diffHours = (now - lastUpdate) / (1000 * 60 * 60)
  
  return diffHours > 24
}

// حساب إجمالي الراتب بعملات مختلفة
export const calculateSalaryInCurrencies = (basicSalary, allowances = 0, currency = 'SAR') => {
  const totalSalary = (basicSalary || 0) + (allowances || 0)
  const supportedCurrencies = getSupportedCurrencies()
  
  return supportedCurrencies.map(curr => ({
    currency: curr.code,
    amount: convertCurrency(totalSalary, currency, curr.code),
    formatted: formatCurrency(convertCurrency(totalSalary, currency, curr.code), curr.code),
    info: curr
  }))
}

// تصدير الوظائف الافتراضية
export default {
  getExchangeRates,
  saveExchangeRates,
  convertCurrency,
  formatCurrency,
  getCurrencyInfo,
  getSupportedCurrencies,
  updateExchangeRatesFromAPI,
  getLastUpdateTime,
  needsRateUpdate,
  calculateSalaryInCurrencies,
  CURRENCIES,
  DEFAULT_EXCHANGE_RATES,
  getSyncConfig,
  saveSyncConfig,
  getRateHistory,
  addRateHistoryEntry,
  clearRateHistory,
  saveExchangeRatesWithHistory,
  startAutoSync,
  stopAutoSync,
  SYNC_PROVIDERS
}
