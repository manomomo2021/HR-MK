let ZKLib
try {
  const zklib = await import('zklib')
  ZKLib = zklib.ZKLib || zklib.default?.ZKLib || zklib.default
} catch (error) {
  console.warn('⚠️ تعذر تحميل مكتبة zklib:', error.message)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    })
    return
  }

  try {
    // التحقق من توفر مكتبة zklib
    if (!ZKLib) {
      console.warn('⚠️ مكتبة zklib غير متوفرة، استخدام البيانات التجريبية')
      const mockResponse = getMockUsers()
      res.status(mockResponse.status).json(mockResponse.json)
      return
    }

    // قراءة إعدادات الجهاز من متغيرات البيئة أو قاعدة البيانات
    const deviceConfig = {
      ip: process.env.BIOMETRIC_IP || '192.168.0.201',
      port: parseInt(process.env.BIOMETRIC_PORT) || 4370,
      timeout: parseInt(process.env.BIOMETRIC_TIMEOUT) || 5000,
      inport: parseInt(process.env.BIOMETRIC_INPORT) || 4000
    }
    
    // إذا كان IP هو 127.0.0.1، استخدم البيانات التجريبية مباشرة
    if (deviceConfig.ip === '127.0.0.1') {
      console.log('🧪 استخدام بيانات تجريبية للجهاز الوهمي')
      const mockResponse = getMockUsers()
      // تحديث معلومات الجهاز في الرد
      mockResponse.json.deviceInfo = {
        ip: deviceConfig.ip,
        port: deviceConfig.port,
        totalUsers: mockResponse.json.users.length,
        note: 'بيانات تجريبية - جهاز وهمي للاختبار'
      }
      res.status(mockResponse.status).json(mockResponse.json)
      return
    }

    console.log('🔐 محاولة الاتصال بجهاز البصمة لجلب بيانات الموظفين:', deviceConfig)

    // إنشاء اتصال مع جهاز البصمة
    const zkInstance = new ZKLib(deviceConfig.ip, deviceConfig.port, deviceConfig.timeout, deviceConfig.inport)
    
    try {
      // محاولة الاتصال
      await zkInstance.connect()
      console.log('✅ تم الاتصال بجهاز البصمة بنجاح')

      // جلب بيانات الموظفين من الجهاز
      const users = await zkInstance.getUsers()
      console.log(`📋 تم جلب ${users.data?.length || 0} موظف من جهاز البصمة`)

      // تنسيق البيانات
      const formattedUsers = (users.data || []).map(user => ({
        userId: user.userId,
        name: user.name || `موظف ${user.userId}`,
        cardno: user.cardno || '',
        role: user.role || 0,
        password: user.password || '',
        // إضافة معلومات إضافية إذا كانت متوفرة
        department: user.department || '',
        position: user.position || ''
      }))

      // قطع الاتصال
      await zkInstance.disconnect()
      console.log('🔌 تم قطع الاتصال مع جهاز البصمة')

      res.status(200).json({
        success: true,
        message: `تم جلب بيانات ${formattedUsers.length} موظف من جهاز البصمة`,
        users: formattedUsers,
        deviceInfo: {
          ip: deviceConfig.ip,
          port: deviceConfig.port,
          totalUsers: formattedUsers.length
        }
      })
      return

    } catch (connectionError) {
      console.error('❌ خطأ في الاتصال مع جهاز البصمة:', connectionError.message)
      
      // محاولة قطع الاتصال في حالة الخطأ
      try {
        await zkInstance.disconnect()
      } catch (disconnectError) {
        console.warn('⚠️ تعذر قطع الاتصال:', disconnectError.message)
      }

      // استخدام دالة البيانات التجريبية
      const mockResponse = getMockUsers()
      res.status(mockResponse.status).json(mockResponse.json)
      return
    }

  } catch (error) {
    console.error('❌ خطأ عام في جلب بيانات الموظفين:', error)
    
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب بيانات الموظفين من جهاز البصمة',
      error: error.message,
      details: {
        timestamp: new Date().toISOString(),
        endpoint: '/api/biometric-users'
      }
    })
  }
}

// دالة للحصول على بيانات تجريبية
function getMockUsers() {
  const mockUsers = [
    {
      userId: '1',
      name: 'أحمد محمد علي',
      cardno: '12345',
      role: 0,
      password: '',
      department: 'تقنية المعلومات',
      position: 'مطور'
    },
    {
      userId: '2',
      name: 'فاطمة أحمد',
      cardno: '12346',
      role: 0,
      password: '',
      department: 'الموارد البشرية',
      position: 'أخصائي موارد بشرية'
    },
    {
      userId: '3',
      name: 'محمد خالد حافظ',
      cardno: '12347',
      role: 14,
      password: '',
      department: 'الإدارة',
      position: 'مدير النظام'
    },
    {
      userId: '4',
      name: 'سارة محمود',
      cardno: '12348',
      role: 0,
      password: '',
      department: 'المحاسبة',
      position: 'محاسب'
    },
    {
      userId: '5',
      name: 'عمر حسن',
      cardno: '12349',
      role: 0,
      password: '',
      department: 'المبيعات',
      position: 'مندوب مبيعات'
    },
    {
      userId: '6',
      name: 'نورا أحمد',
      cardno: '12350',
      role: 0,
      password: '',
      department: 'التسويق',
      position: 'أخصائي تسويق'
    },
    {
      userId: '7',
      name: 'يوسف محمد',
      cardno: '12351',
      role: 0,
      password: '',
      department: 'المشتريات',
      position: 'مسؤول مشتريات'
    }
  ]

  console.log('🧪 استخدام بيانات تجريبية:', mockUsers.length, 'موظف')

  return {
    status: 200,
    json: {
      success: true,
      message: `تم جلب بيانات ${mockUsers.length} موظف (بيانات تجريبية)`,
      users: mockUsers,
      deviceInfo: {
        ip: '192.168.0.201',
        port: 4370,
        totalUsers: mockUsers.length,
        note: 'بيانات تجريبية - مكتبة zklib غير متوفرة أو تعذر الاتصال بالجهاز'
      },
      warning: 'تم استخدام بيانات تجريبية'
    }
  }
}
