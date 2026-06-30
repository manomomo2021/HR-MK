/**
 * دوال مساعدة لنظام الحضور والانصراف
 */

/**
 * دالة لتنسيق التاريخ
 * @param {string|Date} date - التاريخ المطلوب تنسيقه
 * @param {string} format - صيغة التنسيق (اختياري)
 * @returns {string} التاريخ المنسق
 */
const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * دالة لتنسيق الوقت
 * @param {string|Date} time - الوقت المطلوب تنسيقه
 * @returns {string} الوقت المنسق
 */
const formatTime = (time) => {
  if (!time) return '';

  const d = new Date(time);
  if (isNaN(d.getTime())) return '';

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
};

/**
 * دالة لحساب عدد الأيام بين تاريخين
 * @param {string|Date} startDate - تاريخ البدء
 * @param {string|Date} endDate - تاريخ الانتهاء
 * @returns {number} عدد الأيام
 */
const daysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // تجاهل الوقت
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * دالة للتحقق مما إذا كان التاريخ هو عطلة
 * @param {string|Date} date - التاريخ المطلوب التحقق منه
 * @param {Array} holidays - قائمة العطلات
 * @returns {boolean} هل هو عطلة
 */
const isHoliday = (date, holidays = []) => {
  const d = new Date(date);
  const dateStr = formatDate(d);

  // التحقق من يوم الجمعة
  if (d.getDay() === 5) return true;

  // التحقق من العطلات الرسمية
  return holidays.some(holiday => holiday.date === dateStr);
};

/**
 * دالة لحساب ساعات العمل
 * @param {string} startTime - وقت البدء
 * @param {string} endTime - وقت الانتهاء
 * @param {Object} workHours - إعدادات ساعات العمل
 * @returns {Object} كائن يحتوي على ساعات العمل والدقائق
 */
const calculateWorkHours = (startTime, endTime, workHours) => {
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);

  // إذا كان وقت الانتهاء قبل وقت البدء، أضف يوم
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }

  const diffMs = end - start;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    hours: diffHours,
    minutes: diffMinutes,
    totalMinutes: diffHours * 60 + diffMinutes
  };
};

/**
 * دالة لحساب العمل الإضافي
 * @param {string} startTime - وقت البدء
 * @param {string} endTime - وقت الانتهاء
 * @param {Object} workHours - إعدادات ساعات العمل
 * @returns {Object} كائن يحتوي على ساعات العمل الإضافي والدقائق
 */
const calculateOvertime = (startTime, endTime, workHours) => {
  const workHoursResult = calculateWorkHours(startTime, endTime, workHours);
  const standardWorkHours = calculateWorkHours(workHours.start, workHours.end, workHours);

  let overtimeMinutes = workHoursResult.totalMinutes - standardWorkHours.totalMinutes;
  if (overtimeMinutes < 0) overtimeMinutes = 0;

  return {
    hours: Math.floor(overtimeMinutes / 60),
    minutes: overtimeMinutes % 60,
    totalMinutes: overtimeMinutes
  };
};

/**
 * دالة لحساب التأخير
 * @param {string} startTime - وقت البدء
 * @param {Object} workHours - إعدادات ساعات العمل
 * @returns {Object} كائن يحتوي على ساعات التأخير والدقائق
 */
const calculateLateTime = (startTime, workHours) => {
  const gracePeriod = workHours.gracePeriod || 0;
  const start = new Date(`1970-01-01T${startTime}`);
  const standardStart = new Date(`1970-01-01T${workHours.start}`);

  // إضافة فترة السماح
  standardStart.setMinutes(standardStart.getMinutes() + gracePeriod);

  let lateMinutes = 0;
  if (start > standardStart) {
    const diffMs = start - standardStart;
    lateMinutes = Math.floor(diffMs / (1000 * 60));
  }

  return {
    hours: Math.floor(lateMinutes / 60),
    minutes: lateMinutes % 60,
    totalMinutes: lateMinutes
  };
};

/**
 * دالة لحساب المغادرة المبكرة
 * @param {string} endTime - وقت الانتهاء
 * @param {Object} workHours - إعدادات ساعات العمل
 * @returns {Object} كائن يحتوي على ساعات المغادرة المبكرة والدقائق
 */
const calculateEarlyDeparture = (endTime, workHours) => {
  const end = new Date(`1970-01-01T${endTime}`);
  const standardEnd = new Date(`1970-01-01T${workHours.end}`);

  let earlyMinutes = 0;
  if (end < standardEnd) {
    const diffMs = standardEnd - end;
    earlyMinutes = Math.floor(diffMs / (1000 * 60));
  }

  return {
    hours: Math.floor(earlyMinutes / 60),
    minutes: earlyMinutes % 60,
    totalMinutes: earlyMinutes
  };
};

/**
 * دالة لإنشاء معرف فريد
 * @returns {string} معرف فريد
 */
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * دالة للتحقق من صحة البريد الإلكتروني
 * @param {string} email - البريد الإلكتروني
 * @returns {boolean} هل هو صحيح
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * دالة للتحقق من صحة رقم الهاتف
 * @param {string} phone - رقم الهاتف
 * @returns {boolean} هل هو صحيح
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^05[0-9]{8}$/;
  return phoneRegex.test(phone);
};

/**
 * دالة لتنسيق الرقم
 * @param {number} number - الرقم المطلوب تنسيقه
 * @param {number} decimals - عدد الأرقام العشرية
 * @returns {string} الرقم المنسق
 */
const formatNumber = (number, decimals = 2) => {
  if (number === null || number === undefined) return '';

  return new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number);
};

/**
 * دالة لتنسيق العملة
 * @param {number} amount - المبلغ المطلوب تنسيقه
 * @param {string} currency - رمز العملة
 * @returns {string} المبلغ المنسق
 */
const formatCurrency = (amount, currency = 'SAR') => {
  if (amount === null || amount === undefined) return '';

  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};

// تصدير الدوال المساعدة
module.exports = {
  formatDate,
  formatTime,
  daysBetween,
  isHoliday,
  calculateWorkHours,
  calculateOvertime,
  calculateLateTime,
  calculateEarlyDeparture,
  generateId,
  isValidEmail,
  isValidPhone,
  formatNumber,
  formatCurrency
};
