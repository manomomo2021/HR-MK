/**
 * إعدادات النظام الافتراضية
 */

// إعدادات النظام الافتراضية
const settings = {
  // إعدادات ساعات العمل
  workHours: {
    start: '09:00',
    end: '17:00',
    friday: '12:00', // يوم الجمعة ينتهي العمل مبكراً
    gracePeriod: 15 // فترة السماح بالتأخير بالدقائق
  },

  // إعدادات العطلات الرسمية
  holidays: [
    { date: '2023-09-23', name: 'اليوم الوطني' },
    { date: '2023-09-24', name: 'اليوم الوطني' },
    { date: '2023-09-25', name: 'اليوم الوطني' },
    { date: '2023-10-15', name: 'عيد الفطر' },
    { date: '2023-10-16', name: 'عيد الفطر' },
    { date: '2023-10-17', name: 'عيد الفطر' },
    { date: '2023-10-18', name: 'عيد الفطر' },
    { date: '2023-10-19', name: 'عيد الفطر' },
    { date: '2023-12-20', name: 'عيد الأضحى' },
    { date: '2023-12-21', name: 'عيد الأضحى' },
    { date: '2023-12-22', name: 'عيد الأضحى' },
    { date: '2023-12-23', name: 'عيد الأضحى' },
    { date: '2023-12-24', name: 'عيد الأضحى' }
  ],

  // إعدادات التقارير
  reports: {
    currency: 'SAR',
    language: 'ar',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm'
  },

  // إعدادات النظام
  system: {
    autoBackup: true,
    backupInterval: 7, // أيام
    maxRecordsPerPage: 50,
    sessionTimeout: 30 // دقائق
  },

  // إعدادات الإشعارات
  notifications: {
    enableEmail: false,
    enableSMS: false,
    enablePush: true,
    lateArrival: true,
    earlyDeparture: true,
    absence: true
  },

  // إعدادات الحسابات
  accounting: {
    overtimeRate: 1.5, // معدل العمل الإضافي
    deductionRate: 0.5, // معدل الخصم للتأخير
    weekendBonus: 0.25 // مكافأة نهاية الأسبوع
  }
};

// تصدير إعدادات النظام
module.exports = settings;
