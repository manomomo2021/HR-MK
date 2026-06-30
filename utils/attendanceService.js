/**
 * خدمة الحضور والانصراف
 */

const db = require('./database');
const helpers = require('./helpers');
const storage = require('./storage');

/**
 * دالة لتسجيل الحضور
 * @param {string} employeeId - معرف الموظف
 * @param {string} date - التاريخ
 * @param {string} time - الوقت
 * @param {string} notes - ملاحظات (اختياري)
 * @returns {Object} نتيجة العملية
 */
const checkIn = async (employeeId, date, time, notes = '') => {
  try {
    // التحقق من وجود الموظف
    const employee = db.getEmployeeById(employeeId);
    if (!employee) {
      return {
        success: false,
        message: 'الموظف غير موجود'
      };
    }

    // الحصول على إعدادات النظام
    const settings = db.getSettings();
    const workHours = settings ? settings.workHours : { start: '09:00', end: '17:00', gracePeriod: 15 };

    // حساب التأخير
    const lateTime = helpers.calculateLateTime(time, workHours);

    // إنشاء سجل الحضور
    const record = {
      employeeId,
      employeeName: employee.name,
      date,
      time,
      type: 'check-in',
      notes: notes || (lateTime.totalMinutes > 0 ? `تأخر ${lateTime.minutes} دقيقة` : 'حضور في الموعد'),
      lateMinutes: lateTime.totalMinutes,
      timestamp: `${date}T${time}:00.000Z`,
      createdAt: new Date().toISOString()
    };

    // حفظ السجل في قاعدة البيانات
    const saved = db.addAttendanceRecord(record);

    if (saved) {
      // تحديث التخزين المؤقت
      const records = storage.get('manualAttendanceRecords', []);
      records.push(record);
      storage.set('manualAttendanceRecords', records);

      return {
        success: true,
        message: 'تم تسجيل الحضور بنجاح',
        record
      };
    } else {
      return {
        success: false,
        message: 'فشل في تسجيل الحضور'
      };
    }
  } catch (error) {
    console.error('خطأ في تسجيل الحضور:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تسجيل الحضور',
      error: error.message
    };
  }
};

/**
 * دالة لتسجيل الانصراف
 * @param {string} employeeId - معرف الموظف
 * @param {string} date - التاريخ
 * @param {string} time - الوقت
 * @param {string} notes - ملاحظات (اختياري)
 * @returns {Object} نتيجة العملية
 */
const checkOut = async (employeeId, date, time, notes = '') => {
  try {
    // التحقق من وجود الموظف
    const employee = db.getEmployeeById(employeeId);
    if (!employee) {
      return {
        success: false,
        message: 'الموظف غير موجود'
      };
    }

    // البحث عن سجل الحضور في نفس اليوم
    const checkInRecord = db.getAttendanceRecordsByEmployee(employeeId)
      .find(record => record.date === date && record.type === 'check-in');

    if (!checkInRecord) {
      return {
        success: false,
        message: 'لا يوجد سجل حضور لهذا الموظف في هذا اليوم'
      };
    }

    // الحصول على إعدادات النظام
    const settings = db.getSettings();
    const workHours = settings ? settings.workHours : { start: '09:00', end: '17:00' };

    // حساب المغادرة المبكرة
    const earlyDeparture = helpers.calculateEarlyDeparture(time, workHours);

    // حساب ساعات العمل
    const workHoursResult = helpers.calculateWorkHours(checkInRecord.time, time, workHours);

    // حساب العمل الإضافي
    const overtime = helpers.calculateOvertime(checkInRecord.time, time, workHours);

    // إنشاء سجل الانصراف
    const record = {
      employeeId,
      employeeName: employee.name,
      date,
      time,
      type: 'check-out',
      notes: notes || (earlyDeparture.totalMinutes > 0 ? `مغادرة مبكرة ${earlyDeparture.minutes} دقيقة` : 'انصراف في الموعد'),
      earlyDepartureMinutes: earlyDeparture.totalMinutes,
      workHours: workHoursResult.totalMinutes,
      overtime: overtime.totalMinutes,
      timestamp: `${date}T${time}:00.000Z`,
      createdAt: new Date().toISOString()
    };

    // حفظ السجل في قاعدة البيانات
    const saved = db.addAttendanceRecord(record);

    if (saved) {
      // تحديث التخزين المؤقت
      const records = storage.get('manualAttendanceRecords', []);
      records.push(record);
      storage.set('manualAttendanceRecords', records);

      return {
        success: true,
        message: 'تم تسجيل الانصراف بنجاح',
        record
      };
    } else {
      return {
        success: false,
        message: 'فشل في تسجيل الانصراف'
      };
    }
  } catch (error) {
    console.error('خطأ في تسجيل الانصراف:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تسجيل الانصراف',
      error: error.message
    };
  }
};

/**
 * دالة للحصول على سجلات الحضور والانصراف
 * @param {Object} filters - مرشحات البحث (اختياري)
 * @returns {Array} قائمة السجلات
 */
const getAttendanceRecords = (filters = {}) => {
  try {
    let records = db.getAttendanceRecords();

    // تطبيق المرشحات
    if (filters.employeeId) {
      records = records.filter(record => record.employeeId === filters.employeeId);
    }

    if (filters.date) {
      records = records.filter(record => record.date === filters.date);
    }

    if (filters.startDate && filters.endDate) {
      records = records.filter(record => 
        record.date >= filters.startDate && record.date <= filters.endDate
      );
    }

    if (filters.type) {
      records = records.filter(record => record.type === filters.type);
    }

    // ترتيب السجلات حسب التاريخ والوقت (الأحدث أولاً)
    records.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.time.localeCompare(a.time);
    });

    return records;
  } catch (error) {
    console.error('خطأ في جلب سجلات الحضور والانصراف:', error);
    return [];
  }
};

/**
 * دالة للحصول على ملخص الحضور والانصراف لموظف معين
 * @param {string} employeeId - معرف الموظف
 * @param {string} startDate - تاريخ البدء
 * @param {string} endDate - تاريخ الانتهاء
 * @returns {Object} ملخص الحضور والانصراف
 */
const getEmployeeAttendanceSummary = (employeeId, startDate, endDate) => {
  try {
    const records = getAttendanceRecords({
      employeeId,
      startDate,
      endDate
    });

    // تجميع السجلات حسب التاريخ
    const recordsByDate = {};
    records.forEach(record => {
      if (!recordsByDate[record.date]) {
        recordsByDate[record.date] = [];
      }
      recordsByDate[record.date].push(record);
    });

    // حساب الإحصائيات
    let totalDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let earlyDepartureDays = 0;
    let totalWorkHours = 0;
    let totalOvertime = 0;
    let totalLateMinutes = 0;
    let totalEarlyDepartureMinutes = 0;

    // الحصول على إعدادات النظام
    const settings = db.getSettings();
    const workHours = settings ? settings.workHours : { start: '09:00', end: '17:00' };
    const holidays = settings ? settings.holidays : [];

    // حساب عدد الأيام في النطاق المحدد
    const totalDaysInRange = helpers.daysBetween(startDate, endDate) + 1;

    // حساب الإحصائيات لكل يوم
    for (const date in recordsByDate) {
      const dayRecords = recordsByDate[date];

      // التحقق من وجود سجل حضور وانصراف
      const checkIn = dayRecords.find(r => r.type === 'check-in');
      const checkOut = dayRecords.find(r => r.type === 'check-out');

      if (checkIn && checkOut) {
        presentDays++;
        totalWorkHours += checkIn.workHours || 0;
        totalOvertime += checkIn.overtime || 0;

        if (checkIn.lateMinutes > 0) {
          lateDays++;
          totalLateMinutes += checkIn.lateMinutes;
        }

        if (checkOut.earlyDepartureMinutes > 0) {
          earlyDepartureDays++;
          totalEarlyDepartureMinutes += checkOut.earlyDepartureMinutes;
        }
      } else if (checkIn) {
        // وجود سجل حضور فقط
        presentDays++;
        if (checkIn.lateMinutes > 0) {
          lateDays++;
          totalLateMinutes += checkIn.lateMinutes;
        }
      }
    }

    // حساب أيام الغياب
    absentDays = totalDaysInRange - presentDays;

    // حساب متوسط ساعات العمل اليومية
    const avgWorkHours = presentDays > 0 ? totalWorkHours / presentDays / 60 : 0;

    // حساب متوسط العمل الإضافي اليومي
    const avgOvertime = presentDays > 0 ? totalOvertime / presentDays / 60 : 0;

    // حساب متوسط التأخير اليومي
    const avgLateTime = lateDays > 0 ? totalLateMinutes / lateDays : 0;

    // حساب متوسط المغادرة المبكرة اليومية
    const avgEarlyDeparture = earlyDepartureDays > 0 ? totalEarlyDepartureMinutes / earlyDepartureDays : 0;

    return {
      employeeId,
      startDate,
      endDate,
      totalDays: totalDaysInRange,
      presentDays,
      absentDays,
      lateDays,
      earlyDepartureDays,
      attendanceRate: totalDaysInRange > 0 ? (presentDays / totalDaysInRange) * 100 : 0,
      totalWorkHours: Math.floor(totalWorkHours / 60),
      totalOvertime: Math.floor(totalOvertime / 60),
      avgWorkHours,
      avgOvertime,
      totalLateMinutes,
      avgLateTime,
      totalEarlyDepartureMinutes,
      avgEarlyDeparture
    };
  } catch (error) {
    console.error('خطأ في حساب ملخص الحضور والانصراف:', error);
    return null;
  }
};

/**
 * دالة لتصدير بيانات الحضور والانصراف
 * @param {Object} filters - مرشحات البحث (اختياري)
 * @returns {Object} بيانات جاهزة للتصدير
 */
const exportAttendanceData = (filters = {}) => {
  try {
    const records = getAttendanceRecords(filters);
    const employees = db.getEmployees();

    // إنشاء بيانات السجلات
    const dataSheet = records.map(record => {
      const employee = employees.find(emp => emp.id === record.employeeId);
      return {
        'كود الموظف': employee ? employee.code : record.employeeId,
        'اسم الموظف': record.employeeName,
        'التاريخ': record.date,
        'الوقت': record.time,
        'نوع التسجيل': record.type === 'check-in' ? 'حضور' : 'انصراف',
        'ملاحظات': record.notes || '-',
        'تاريخ التسجيل': helpers.formatDate(record.createdAt, 'YYYY-MM-DD HH:mm:ss')
      };
    });

    // إنشاء ملخص
    const summary = [
      ['تقرير الحضور والانصراف'],
      [`تاريخ الإنشاء: ${helpers.formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss')}`],
      [`مرشح: ${filters.employeeId ? 'موظف معين' : filters.date ? 'يوم معين' : filters.startDate && filters.endDate ? 'نطاق تواريخ' : 'جميع السجلات'}`],
      [`إجمالي السجلات: ${records.length}`],
      []
    ];

    // حساب إحصائيات السجلات
    const checkIns = records.filter(r => r.type === 'check-in').length;
    const checkOuts = records.filter(r => r.type === 'check-out').length;
    summary.push(['إحصائيات السجلات']);
    summary.push(['حضور:', checkIns]);
    summary.push(['انصراف:', checkOuts]);
    summary.push([]);

    return {
      dataSheet,
      summary
    };
  } catch (error) {
    console.error('خطأ في تصدير بيانات الحضور والانصراف:', error);
    return null;
  }
};

// تصدير خدمة الحضور والانصراف
module.exports = {
  checkIn,
  checkOut,
  getAttendanceRecords,
  getEmployeeAttendanceSummary,
  exportAttendanceData
};
