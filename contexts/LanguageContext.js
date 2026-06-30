import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'
import en from '../locales/en.json'
import ar from '../locales/ar.json'

const LanguageContext = createContext()

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('ar')
    const [translations, setTranslations] = useState(ar)

    // Apply language settings to document
    const applyLanguage = useCallback((lang) => {
        const isRtl = lang === 'ar'
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr'
        document.documentElement.lang = lang
        document.documentElement.style.fontFamily = isRtl
            ? "'Cairo', system-ui, sans-serif"
            : "'Inter', 'Cairo', system-ui, sans-serif"

        // Update document title
        document.title = isRtl
            ? 'HR MK — نظام إدارة الموارد البشرية المتقدم'
            : 'HR MK — Enterprise HR Management System'
    }, [])

    useEffect(() => {
        // Check local storage for saved language preference on mount
        const savedLanguage = localStorage.getItem('app_language')
        if (savedLanguage) {
            setLanguage(savedLanguage)
            setTranslations(savedLanguage === 'ar' ? ar : en)
            applyLanguage(savedLanguage)
        } else {
            // Default is Arabic
            applyLanguage('ar')
        }
    }, [applyLanguage])

    const toggleLanguage = useCallback(() => {
        const newLang = language === 'ar' ? 'en' : 'ar'
        setLanguage(newLang)
        setTranslations(newLang === 'ar' ? ar : en)
        localStorage.setItem('app_language', newLang)
        applyLanguage(newLang)
    }, [language, applyLanguage])

    // Get direction
    const direction = language === 'ar' ? 'rtl' : 'ltr'
    const isRtl = language === 'ar'

    // Helper function to get nested translation strings (e.g., 'dashboard.welcome')
    const t = useCallback((key, params = {}) => {
        const keys = key.split('.')
        let value = translations
        for (const k of keys) {
            if (value[k] === undefined) {
                console.warn(`Translation key not found: ${key}`)
                return key // fallback to key name
            }
            value = value[k]
        }
        // Simple parameter replacement
        if (typeof value === 'string') {
            return value.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`)
        }
        return value
    }, [translations])

    // Format date according to current language
    const formatDate = useCallback((date, options = {}) => {
        const d = date instanceof Date ? date : new Date(date)
        const locale = language === 'ar' ? 'ar-EG' : 'en-US'
        try {
            return d.toLocaleDateString(locale, {
                weekday: options.weekday ?? 'long',
                year: options.year ?? 'numeric',
                month: options.month ?? 'long',
                day: options.day ?? 'numeric',
            })
        } catch {
            return d.toLocaleDateString(locale)
        }
    }, [language])

    // Format time according to current language
    const formatTime = useCallback((date) => {
        const d = date instanceof Date ? date : new Date(date)
        const locale = language === 'ar' ? 'ar-EG' : 'en-US'
        try {
            return d.toLocaleTimeString(locale, {
                hour: '2-digit',
                minute: '2-digit',
            })
        } catch {
            return d.toLocaleTimeString(locale)
        }
    }, [language])

    // Get locale for Chart.js or other libraries
    const locale = language === 'ar' ? 'ar-EG' : 'en-US'

    return (
        <LanguageContext.Provider value={{
            language,
            toggleLanguage,
            t,
            direction,
            isRtl,
            formatDate,
            formatTime,
            locale,
        }}>
            {children}
        </LanguageContext.Provider>
    )
}

export const useLanguage = () => useContext(LanguageContext)
