import ZKLib from 'node-zklib'
import employees from '../../../data/employees'
import { BIOMETRIC_CONFIG, getErrorMessage } from '../../../config/biometric'

// دالة تحويل طريقة التحقق
function mapVerifyMode(mode) {
  return BIOMETRIC_CONFIG.VERIFY_MODES[mode] || `طريقة ${mode}`
}

// دالة تنسيق الوقت
function formatTime(date) {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  })
}

// دالة حساب مدة العمل
function calculateWorkDuration(inTime, outTime) {
  if (!inTime || !outTime) return 'غير محسوب'
  
  const diffMs = outTime - inTime
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  
  return `${hours} ساعة ${minutes} دقيقة`
}

// دالة حساب الوقت الإضافي
function calculateOvertime(outTime, workDate) {
  if (!outTime) return 0
  
  const { WORK_SCHEDULE } = BIOMETRIC_CONFIG
  const endOfDay = new Date(workDate)
  endOfDay.setHours(WORK_SCHEDULE.END_HOUR, WORK_SCHEDULE.END_MINUTE, 0, 0)
  
  if (outTime > endOfDay) {
    return Math.floor((outTime - endOfDay) / (1000 * 60))
  }
  
  return 0
}

// دالة حساب التأخير
function calculateLateMinutes(inTime, workDate) {
  if (!inTime) return 0
  
  const { WORK_SCHEDULE } = BIOMETRIC_CONFIG
  const startLimit = new Date(workDate)
  startLimit.setHours(
    WORK_SCHEDULE.START_HOUR, 
    WORK_SCHEDULE.START_MINUTE + WORK_SCHEDULE.LATE_ALLOWANCE_MINUTES, 
    0, 
    0
  )
  
  if (inTime > startLimit) {
    return Math.floor((inTime - startLimit) / (1000 * 60))
  }
  
  return 0
}

// دالة لمعالجة سجلات الحضور
function processAttendanceLogs(logs, employees) {
  // إنشاء خريطة الموظفين للبحث السريع
  const employeeMap = {}
  employees.forEach(emp => {
    employeeMap[String(emp.code)] = {
      name: emp.name,
      salary: emp.salary,
      department: emp.department,
      position: emp.position
    }
  })

  // تجميع السجلات حسب الموظف واليوم
  const groupedByDay = {}
  logs.forEach(att => {
    const uid = String(att.userId)
    const timestamp = new Date(att.timestamp)

    if (!timestamp || isNaN(timestamp)) {
      console.warn(`⚠️ تجاهل سجل بتاريخ غير صحيح:`, att)
      return
    }

    const dateKey = timestamp.toISOString().split('T')[0]
    const key = `${uid}-${dateKey}`

    if (!groupedByDay[key]) {
      groupedByDay[key] = []
    }

    groupedByDay[key].push({
      uid,
      timestamp,
      verifyMode: mapVerifyMode(att.verify)
    })
  })

  // معالجة السجلات وإنشاء تقرير الحضور
  const attendance = []

  for (const key in groupedByDay) {
    let records = groupedByDay[key].sort((a, b) => a.timestamp - b.timestamp)

    // تصفية البصمات المكررة
    records = records.filter((rec, i) => {
      if (i === 0) return true
      return (rec.timestamp - records[i - 1].timestamp) > (BIOMETRIC_CONFIG.PROCESSING.DUPLICATE_FILTER_SECONDS * 1000)
    })

    if (records.length === 0) continue

    const uid = records[0].uid
    const employee = employeeMap[uid] || {
      name: `موظف ${uid}`,
      salary: 0,
      department: 'غير محدد',
      position: 'غير محدد'
    }

    // أول سجل = حضور، آخر سجل = انصراف
    const inRecord = records[0]
    const outRecord = records.length > 1 ? records[records.length - 1] : null

    // حساب مدة العمل
    const workDuration = calculateWorkDuration(
      inRecord.timestamp,
      outRecord?.timestamp
    )

    // حساب الوقت الإضافي
    const overtimeMinutes = outRecord ?
      calculateOvertime(outRecord.timestamp, inRecord.timestamp) : 0

    // حساب التأخير
    const lateMinutes = calculateLateMinutes(
      inRecord.timestamp,
      inRecord.timestamp
    )

    // إضافة السجل إلى التقرير
    attendance.push({
      userId: uid,
      userName: employee.name,
      salary: employee.salary,
      department: employee.department,
      position: employee.position,
      date: inRecord.timestamp.toISOString().split('T')[0],
      inTime: formatTime(inRecord.timestamp),
      outTime: outRecord ? formatTime(outRecord.timestamp) : 'لم يسجل انصراف',
      workDuration,
      overtime: `${overtimeMinutes} دقيقة`,
      overtimeMinutes,
      late: `${lateMinutes} دقيقة`,
      lateMinutes,
      verifyMode: inRecord.verifyMode,
      rawInTime: inRecord.timestamp.toISOString(),
      rawOutTime: outRecord ? outRecord.timestamp.toISOString() : null,
      recordsCount: records.length
    })
  }

  // ترتيب السجلات حسب التاريخ (الأحدث أولاً)
  attendance.sort((a, b) => new Date(b.date) - new Date(a.date))

  return attendance
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    })
  }

  const { fromDate } = req.query
  const { DEVICE, PROCESSING } = BIOMETRIC_CONFIG
  
  // إذا كان IP هو 127.0.0.1، استخدم البيانات التجريبية
  if (DEVICE.IP === '127.0.0.1') {
    console.log('🧪 استخدام بيانات تجريبية للجهاز الوهمي')
    
    // إنشاء سجلات حضور تجريبية
    const mockLogs = []
    const today = new Date()
    const startDate = fromDate ? new Date(fromDate) : new Date(today)
    startDate.setHours(0, 0, 0, 0)
    
    // إنشاء بيانات لآخر 7 أيام
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() - i)
      
      // إنشاء سجل دخول (8:00 صباحاً)
      const inTime = new Date(date)
      inTime.setHours(8, 0, 0, 0)
      
      // إنشاء سجل خروج (4:30 مساءً)
      const outTime = new Date(date)
      outTime.setHours(16, 30, 0, 0)
      
      // إضافة سجلين لكل موظف (دخول وخروج)
      employees.slice(0, 5).forEach((emp, index) => {
        // سجل الدخول
        mockLogs.push({
          userId: String(emp.code),
          timestamp: inTime.getTime() + (index * 60000), // توزيع الدخول على دقائق مختلفة
          type: 0, // 0 = دخول
          verify: 1 // 1 = بصمة
        })
        
        // سجل الخروج
        mockLogs.push({
          userId: String(emp.code),
          timestamp: outTime.getTime() + (index * 60000), // توزيع الخروج على دقائق مختلفة
          type: 1, // 1 = خروج
          verify: 1 // 1 = بصمة
        })
      })
    }
    
    // معالجة السجلات التجريبية
    const processedLogs = processAttendanceLogs(mockLogs, employees)
    
    return res.status(200).json({
      success: true,
      message: `تم جلب ${processedLogs.length} سجل حضور (بيانات تجريبية)`,
      logs: processedLogs,
      deviceInfo: {
        ip: DEVICE.IP,
        port: DEVICE.PORT,
        totalLogs: processedLogs.length,
        note: 'بيانات تجريبية - جهاز وهمي للاختبار'
      }
    })
  }
  
  const zk = new ZKLib(DEVICE.IP, DEVICE.PORT, DEVICE.TIMEOUT, DEVICE.INPORT)

  try {
    console.log(`🔄 محاولة الاتصال بجهاز البصمة ${DEVICE.IP}:${DEVICE.PORT}`)
    
    // الاتصال بالجهاز
    await zk.createSocket()
    console.log('✅ تم الاتصال بجهاز البصمة بنجاح')

    // إنشاء خريطة الموظفين للبحث السريع
    const employeeMap = {}
    employees.forEach(emp => {
      employeeMap[String(emp.code)] = {
        name: emp.name,
        salary: emp.salary,
        department: emp.department,
        position: emp.position
      }
    })

    // جلب سجلات الحضور من الجهاز
    console.log('📥 جاري جلب سجلات الحضور...')
    const logsResult = await zk.getAttendances()
    const rawLogs = Array.isArray(logsResult) ? logsResult : (logsResult?.data || [])
    
    console.log(`📊 تم جلب ${rawLogs.length} سجل من الجهاز`)

    // تطبيق فلتر التاريخ إذا تم تحديده
    let filteredLogs = rawLogs
    if (fromDate) {
      const filterDate = new Date(fromDate)
      filteredLogs = rawLogs.filter(att => {
        const recordTime = att.recordTime ? new Date(att.recordTime) : null
        return recordTime && recordTime >= filterDate
      })
      console.log(`📅 تم تطبيق فلتر التاريخ: ${filteredLogs.length} سجل بعد ${fromDate}`)
    }

    // تجميع السجلات حسب الموظف واليوم
    const groupedByDay = {}
    filteredLogs.forEach(att => {
      const uid = String(att.deviceUserId ?? att.userid ?? att.uid ?? 'غير معرف')
      const timestamp = att.recordTime ? new Date(att.recordTime) : null
      
      if (!timestamp || isNaN(timestamp)) {
        console.warn(`⚠️ تجاهل سجل بتاريخ غير صحيح:`, att)
        return
      }

      const dateKey = timestamp.toISOString().split('T')[0]
      const key = `${uid}-${dateKey}`

      if (!groupedByDay[key]) {
        groupedByDay[key] = []
      }
      
      groupedByDay[key].push({
        uid,
        timestamp,
        verifyMode: mapVerifyMode(att.verifyType ?? att.verify_mode)
      })
    })

    // معالجة السجلات وإنشاء تقرير الحضور
    const attendance = []
    
    for (const key in groupedByDay) {
      let records = groupedByDay[key].sort((a, b) => a.timestamp - b.timestamp)

      // تصفية البصمات المكررة
      records = records.filter((rec, i) => {
        if (i === 0) return true
        return (rec.timestamp - records[i - 1].timestamp) > (PROCESSING.DUPLICATE_FILTER_SECONDS * 1000)
      })

      if (records.length === 0) continue

      const uid = records[0].uid
      const employee = employeeMap[uid] || { 
        name: `موظف ${uid}`, 
        salary: 0,
        department: 'غير محدد',
        position: 'غير محدد'
      }

      // أول سجل = حضور، آخر سجل = انصراف
      const inRecord = records[0]
      const outRecord = records.length > 1 ? records[records.length - 1] : null

      // حساب مدة العمل
      const workDuration = calculateWorkDuration(
        inRecord.timestamp, 
        outRecord?.timestamp
      )

      // حساب الوقت الإضافي
      const overtimeMinutes = outRecord ? 
        calculateOvertime(outRecord.timestamp, inRecord.timestamp) : 0

      // حساب التأخير
      const lateMinutes = calculateLateMinutes(
        inRecord.timestamp, 
        inRecord.timestamp
      )

      // إضافة السجل إلى التقرير
      attendance.push({
        userId: uid,
        userName: employee.name,
        salary: employee.salary,
        department: employee.department,
        position: employee.position,
        date: inRecord.timestamp.toISOString().split('T')[0],
        inTime: formatTime(inRecord.timestamp),
        outTime: outRecord ? formatTime(outRecord.timestamp) : 'لم يسجل انصراف',
        workDuration,
        overtime: `${overtimeMinutes} دقيقة`,
        overtimeMinutes,
        late: `${lateMinutes} دقيقة`,
        lateMinutes,
        verifyMode: inRecord.verifyMode,
        rawInTime: inRecord.timestamp.toISOString(),
        rawOutTime: outRecord ? outRecord.timestamp.toISOString() : null,
        recordsCount: records.length
      })
    }

    // قطع الاتصال مع الجهاز
    await zk.disconnect()
    console.log('🔌 تم قطع الاتصال مع جهاز البصمة')

    // ترتيب السجلات حسب التاريخ (الأحدث أولاً)
    attendance.sort((a, b) => new Date(b.date) - new Date(a.date))

    console.log(`✅ تم معالجة ${attendance.length} سجل حضور بنجاح`)

    // إرسال النتيجة
    res.status(200).json({ 
      success: true, 
      data: attendance,
      summary: {
        totalRecords: attendance.length,
        totalEmployees: new Set(attendance.map(a => a.userId)).size,
        rawLogsCount: rawLogs.length,
        filteredLogsCount: filteredLogs.length,
        lastUpdate: new Date().toISOString(),
        fromDate: fromDate || null,
        deviceInfo: {
          ip: DEVICE.IP,
          port: DEVICE.PORT
        }
      }
    })

  } catch (error) {
    console.error('❌ خطأ في جلب بيانات البصمة:', error)
    
    // محاولة قطع الاتصال في حالة الخطأ
    try {
      await zk.disconnect()
    } catch (disconnectError) {
      console.error('❌ خطأ في قطع الاتصال:', disconnectError)
    }

    const errorMessage = getErrorMessage(error)

    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
