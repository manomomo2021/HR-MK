// API لاختبار الاتصال بجهاز البصمة
let ZKLib = null

// محاولة استيراد مكتبة البصمة
try {
  ZKLib = require('node-zklib')
} catch (error) {
  console.warn('تحذير: مكتبة node-zklib غير متوفرة:', error.message)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    })
  }

  // التحقق من توفر المكتبة
  if (!ZKLib) {
    return res.status(500).json({
      success: false,
      message: 'مكتبة node-zklib غير مثبتة. يرجى تثبيتها باستخدام: npm install node-zklib',
      installCommand: 'npm install node-zklib',
      note: 'هذه المكتبة مطلوبة للاتصال بجهاز البصمة'
    })
  }

  const { ip, port, timeout } = req.body

  // التحقق من صحة البيانات
  if (!ip || !port) {
    return res.status(400).json({
      success: false,
      message: 'عنوان IP والمنفذ مطلوبان'
    })
  }

  // التحقق من صحة عنوان IP
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  if (!ipRegex.test(ip)) {
    return res.status(400).json({
      success: false,
      message: 'عنوان IP غير صحيح'
    })
  }

  // التحقق من صحة المنفذ
  if (port < 1 || port > 65535) {
    return res.status(400).json({
      success: false,
      message: 'رقم المنفذ يجب أن يكون بين 1 و 65535'
    })
  }

  // إنشاء جهاز وهمي للاختبار إذا كان IP هو 127.0.0.1
  if (ip === '127.0.0.1') {
    return res.status(200).json({
      success: true,
      message: 'تم الاتصال بجهاز البصمة الوهمي بنجاح',
      connectionTime: '50ms',
      deviceInfo: {
        ip,
        port,
        timeout: timeout || 5000,
        serialNumber: 'DEMO-12345',
        firmwareVersion: '1.0.0',
        platform: 'Demo Platform',
        deviceName: 'جهاز بصمة تجريبي',
        userCount: 10,
        logCount: 25,
        status: 'متصل'
      },
      timestamp: new Date().toISOString()
    })
  }

  const zk = new ZKLib(ip, port, timeout || 5000, 4000)

  try {
    console.log(`🔄 اختبار الاتصال بجهاز البصمة على ${ip}:${port}`)

    // محاولة الاتصال بالجهاز
    const startTime = Date.now()
    await zk.createSocket()
    const connectionTime = Date.now() - startTime

    console.log(`✅ تم الاتصال بجهاز البصمة بنجاح في ${connectionTime}ms`)

    // جلب معلومات الجهاز للتأكد من الاتصال
    let deviceInfo = {}
    try {
      // محاولة جلب معلومات الجهاز
      const info = await zk.getInfo()
      deviceInfo = {
        serialNumber: info?.serialNumber || 'غير متوفر',
        firmwareVersion: info?.firmwareVersion || 'غير متوفر',
        platform: info?.platform || 'غير متوفر',
        deviceName: info?.deviceName || 'غير متوفر'
      }
    } catch (infoError) {
      console.warn('تحذير: لا يمكن جلب معلومات الجهاز:', infoError.message)
      deviceInfo = {
        serialNumber: 'غير متوفر',
        firmwareVersion: 'غير متوفر',
        platform: 'غير متوفر',
        deviceName: 'غير متوفر'
      }
    }

    // جلب عدد المستخدمين والسجلات
    let userCount = 0
    let logCount = 0
    
    try {
      const users = await zk.getUsers()
      userCount = Array.isArray(users) ? users.length : (users?.data?.length || 0)
    } catch (userError) {
      console.warn('تحذير: لا يمكن جلب عدد المستخدمين:', userError.message)
    }

    try {
      const logs = await zk.getAttendances()
      logCount = Array.isArray(logs) ? logs.length : (logs?.data?.length || 0)
    } catch (logError) {
      console.warn('تحذير: لا يمكن جلب عدد السجلات:', logError.message)
    }

    // قطع الاتصال
    try {
      await zk.disconnect()
      console.log("🔌 تم قطع الاتصال مع جهاز البصمة")
    } catch (disconnectError) {
      console.warn("تحذير: مشكلة في قطع الاتصال:", disconnectError.message)
    }

    res.status(200).json({
      success: true,
      message: 'تم الاتصال بجهاز البصمة بنجاح',
      connectionTime: `${connectionTime}ms`,
      deviceInfo: {
        ip,
        port,
        timeout: timeout || 5000,
        ...deviceInfo,
        userCount,
        logCount,
        status: 'متصل'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("❌ خطأ في اختبار الاتصال:", error)

    // محاولة قطع الاتصال في حالة الخطأ
    try {
      await zk.disconnect()
    } catch (disconnectError) {
      console.warn("تحذير: مشكلة في قطع الاتصال:", disconnectError.message)
    }

    // تحديد نوع الخطأ وإرسال رسالة مناسبة
    let errorMessage = 'حدث خطأ غير متوقع'
    let errorCode = 'UNKNOWN_ERROR'

    // التحقق من أنواع أخطاء الاتصال المختلفة
    if (error.code === 'ECONNREFUSED' ||
        (error.err && error.err.code === 'ECONNREFUSED') ||
        error.message?.includes('ECONNREFUSED')) {

      errorMessage = 'تم رفض الاتصال. تأكد من أن جهاز البصمة يعمل والمنفذ صحيح'
      errorCode = 'CONNECTION_REFUSED'

    } else if (error.code === 'ETIMEDOUT' ||
               (error.err && error.err.code === 'ETIMEDOUT') ||
               error.message?.includes('ETIMEDOUT')) {

      errorMessage = 'انتهت مهلة الاتصال. تأكد من أن الجهاز متصل بالشبكة'
      errorCode = 'CONNECTION_TIMEOUT'

    } else if (error.code === 'EHOSTUNREACH' ||
               (error.err && error.err.code === 'EHOSTUNREACH') ||
               error.message?.includes('EHOSTUNREACH')) {

      errorMessage = 'لا يمكن الوصول للجهاز. تحقق من عنوان IP وإعدادات الشبكة'
      errorCode = 'HOST_UNREACHABLE'

    } else if (error.message) {
      errorMessage = error.message
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      errorCode,
      deviceInfo: {
        ip,
        port,
        timeout: timeout || 5000,
        status: 'غير متصل'
      },
      troubleshooting: {
        steps: [
          'تأكد من أن جهاز البصمة متصل بالشبكة',
          `تحقق من عنوان IP: ${ip}`,
          `تأكد من أن المنفذ ${port} مفتوح`,
          'أعد تشغيل جهاز البصمة إذا لزم الأمر',
          'تحقق من إعدادات جدار الحماية'
        ]
      },
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
