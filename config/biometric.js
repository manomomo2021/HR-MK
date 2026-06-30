// إعدادات جهاز البصمة
export const BIOMETRIC_CONFIG = {
  // إعدادات الاتصال
  DEVICE: {
    IP: process.env.BIOMETRIC_IP || '127.0.0.1', // تغيير الافتراضي إلى الجهاز الوهمي
    PORT: parseInt(process.env.BIOMETRIC_PORT) || 4370,
    TIMEOUT: parseInt(process.env.BIOMETRIC_TIMEOUT) || 10000,
    INPORT: parseInt(process.env.BIOMETRIC_INPORT) || 4000
  },

  // إعدادات أوقات العمل
  WORK_SCHEDULE: {
    START_HOUR: 8,
    START_MINUTE: 0,
    END_HOUR: 16,
    END_MINUTE: 30,
    LATE_ALLOWANCE_MINUTES: 10,
    EARLY_DEPARTURE_ALLOWANCE_MINUTES: 10
  },

  // إعدادات المعالجة
  PROCESSING: {
    DUPLICATE_FILTER_SECONDS: 60, // تصفية البصمات المكررة خلال 60 ثانية
    MAX_RECORDS_PER_REQUEST: 10000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000
  },

  // أنواع التحقق المدعومة
  VERIFY_MODES: {
    1: 'بصمة إصبع',
    2: 'كلمة مرور',
    3: 'بطاقة',
    4: 'بصمة وجه',
    15: 'بصمة كف',
    undefined: 'غير محدد'
  },

  // حالات الحضور
  ATTENDANCE_STATES: {
    CHECK_IN: 0,
    CHECK_OUT: 1,
    BREAK_OUT: 2,
    BREAK_IN: 3,
    OVERTIME_IN: 4,
    OVERTIME_OUT: 5
  },

  // رسائل الأخطاء
  ERROR_MESSAGES: {
    CONNECTION_REFUSED: 'لا يمكن الاتصال بجهاز البصمة. تأكد من أن الجهاز متصل بالشبكة',
    TIMEOUT: 'انتهت مهلة الاتصال بجهاز البصمة',
    NETWORK_ERROR: 'خطأ في الشبكة أثناء الاتصال بجهاز البصمة',
    DEVICE_BUSY: 'جهاز البصمة مشغول حالياً، يرجى المحاولة لاحقاً',
    INVALID_DATA: 'البيانات المستلمة من الجهاز غير صحيحة',
    UNKNOWN_ERROR: 'حدث خطأ غير متوقع أثناء الاتصال بجهاز البصمة'
  }
}

// دالة للحصول على رسالة خطأ مناسبة
export function getErrorMessage(error) {
  const { ERROR_MESSAGES } = BIOMETRIC_CONFIG
  
  if (error.code === 'ECONNREFUSED') {
    return ERROR_MESSAGES.CONNECTION_REFUSED
  } else if (error.code === 'ETIMEDOUT') {
    return ERROR_MESSAGES.TIMEOUT
  } else if (error.code === 'ENETUNREACH' || error.code === 'EHOSTUNREACH') {
    return ERROR_MESSAGES.NETWORK_ERROR
  } else if (error.message && error.message.includes('busy')) {
    return ERROR_MESSAGES.DEVICE_BUSY
  } else if (error.message && error.message.includes('invalid')) {
    return ERROR_MESSAGES.INVALID_DATA
  } else if (error.message) {
    return error.message
  } else {
    return ERROR_MESSAGES.UNKNOWN_ERROR
  }
}

// دالة للتحقق من صحة إعدادات الجهاز
export function validateDeviceConfig() {
  const { DEVICE } = BIOMETRIC_CONFIG
  
  const errors = []
  
  if (!DEVICE.IP || !/^(\d{1,3}\.){3}\d{1,3}$/.test(DEVICE.IP)) {
    errors.push('عنوان IP غير صحيح')
  }
  
  if (!DEVICE.PORT || DEVICE.PORT < 1 || DEVICE.PORT > 65535) {
    errors.push('رقم المنفذ غير صحيح')
  }
  
  if (!DEVICE.TIMEOUT || DEVICE.TIMEOUT < 1000) {
    errors.push('مهلة الاتصال قصيرة جداً')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// دالة لتنسيق معلومات الجهاز
export function formatDeviceInfo() {
  const { DEVICE } = BIOMETRIC_CONFIG
  
  return {
    ip: DEVICE.IP,
    port: DEVICE.PORT,
    timeout: `${DEVICE.TIMEOUT / 1000} ثانية`,
    connectionString: `${DEVICE.IP}:${DEVICE.PORT}`
  }
}

export default BIOMETRIC_CONFIG
