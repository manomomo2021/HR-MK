import { useEffect } from 'react'
import Head from 'next/head'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '../contexts/AuthContext'
import { DataProvider } from '../contexts/DataContext'
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext'
import '../styles/globals.css'

function AppContent({ Component, pageProps }) {
  const { language, isRtl } = useLanguage()

  useEffect(() => {
    // Apply font based on language
    const font = isRtl ? "'Cairo', system-ui, sans-serif" : "'Inter', system-ui, sans-serif"
    document.documentElement.style.fontFamily = font
  }, [isRtl])

  return (
    <>
      <Head>
        <meta name="description" content={
          isRtl
            ? 'منصة متكاملة لإدارة الموارد البشرية، الرواتب، الحضور والإجازات بذكاء فائق'
            : 'Integrated HR management platform for employees, payroll, attendance, and leave management'
        } />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#6d4aff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div
        className={`min-h-screen bg-[#f7f8fa] text-surface-900 ${isRtl ? 'font-cairo' : ''}`}
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{ fontFamily: isRtl ? "'Cairo', system-ui, sans-serif" : "'Inter', system-ui, sans-serif" }}
      >
        <Component {...pageProps} />
        <Toaster
          position={isRtl ? 'top-center' : 'top-center'}
          gutter={12}
          containerStyle={{ top: 24 }}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#14161d',
              border: '1px solid #e0e3ea',
              borderRadius: '16px',
              padding: '14px 18px',
              fontFamily: "'Cairo', 'Inter', sans-serif",
              fontWeight: '700',
              fontSize: '14px',
              boxShadow: '0 20px 40px rgba(20,22,29,0.10), 0 8px 16px rgba(20,22,29,0.06)',
              minWidth: '280px',
              textAlign: isRtl ? 'right' : 'left',
            },
            success: {
              iconTheme: { primary: '#0ead69', secondary: '#ffffff' },
              style: { borderRight: isRtl ? '4px solid #0ead69' : '', borderLeft: !isRtl ? '4px solid #0ead69' : '' },
            },
            error: {
              iconTheme: { primary: '#e11937', secondary: '#ffffff' },
              style: { borderRight: isRtl ? '4px solid #e11937' : '', borderLeft: !isRtl ? '4px solid #e11937' : '' },
            },
            loading: {
              iconTheme: { primary: '#6d4aff', secondary: '#f0f0ff' },
            },
          }}
        />
      </div>
    </>
  )
}

export default function App({ Component, pageProps }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <DataProvider>
          <AppContent Component={Component} pageProps={pageProps} />
        </DataProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}
