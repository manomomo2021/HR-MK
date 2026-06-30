import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  // إظهار شاشة تحميل أثناء التحقق من المصادقة
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa]">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  // إذا لم يكن المستخدم مسجل دخوله، لا نعرض شيئاً
  if (!user) {
    return null
  }

  // إذا كان المستخدم مسجل دخوله، نعرض المحتوى
  return children
}

export default ProtectedRoute
