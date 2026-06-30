
# نظام إدارة الحضور والانصراف

هذا النظام يوفر قاعدة بيانات SQLite متخصصة لإدارة الحضور والانصراف، سواء كان تلقائيًا من أجهزة البصمة أو يدويًا.

## هيكل قاعدة البيانات

تم تصميم قاعدة البيانات لتشمل الجداول التالية:

1. **الموظفين (employees)**: لتخزين معلومات الموظفين
2. **الحضور والانصراف (attendance)**: لتخزين سجلات الحضور والانصراف من أجهزة البصمة
3. **الحضور والانصراف اليدوي (manual_attendance)**: لتخزين سجلات الحضور والانصراف المدخلة يدويًا
4. **أنواع الحضور (attendance_types)**: لتخزين أنواع الحضور المختلفة (حضور، انصراف، إلخ)
5. **إعدادات الحضور (attendance_settings)**: لتخزين إعدادات النظام المتعلقة بالحضور

## المميزات الرئيسية

1. **منع التكرار**: النظام يمنع تسجيل الحضور أو الانصراف أكثر من مرة في اليوم لنفس الموظف، إلا إذا تم تفعيل هذا الخيار في الإعدادات.
2. **فصل السجلات**: يتم فصل سجلات الحضور التلقائية عن اليدوية في جدولين مختلفين لسهولة الإدارة.
3. **التحقق من الصلاحيات**: يتم التحقق من وجود سجلات سابقة قبل إضافة سجلات جديدة.
4. **المرونة في الإعدادات**: يمكن تحديد ما إذا كان مسموحًا بتكرار تسجيل الحضور أو الانصراف من خلال الإعدادات.

## واجهات برمجة التطبيقات (APIs)

تم إنشاء واجهات برمجة التطبيقات التالية للتعامل مع قاعدة البيانات:

1. **تهيئة قاعدة البيانات**: `/api/init-attendance-db`
   - تستخدم لإنشاء جداول قاعدة البيانات عند بدء تشغيل النظام لأول مرة

2. **الحصول على سجلات الحضور**: `/api/get-attendance`
   - GET: للحصول على سجلات الحضور لموظف معين في شهر معين
   - GET بدون معلمات: للحصول على قائمة جميع الموظفين

3. **إضافة سجل حضور**: `/api/add-attendance`
   - POST: لإضافة سجل حضور جديد من أجهزة البصمة
   - يتحقق من وجود سجلات سابقة قبل الإضافة

4. **إضافة سجل حضور يدوي**: `/api/add-manual-attendance`
   - POST: لإضافة سجل حضور يدوي جديد
   - يتحقق من وجود سجلات سابقة من نفس النوع قبل الإضافة

5. **إدارة الموظفين**: `/api/attendance-employees`
   - GET: للحصول على قائمة جميع الموظفين
   - POST: لإضافة موظف جديد
   - PUT: لتحديث بيانات موظف موجود

## كيفية الاستخدام

### تهيئة قاعدة البيانات
```javascript
// استدعاء واجهة برمجة التطبيقات لتهيئة قاعدة البيانات
fetch('/api/init-attendance-db')
  .then(response => response.json())
  .then(data => console.log(data));
```

### إضافة سجل حضور
```javascript
const attendanceData = {
  employeeId: 1,
  date: '2023-10-02',
  checkIn: '08:30',
  checkOut: '17:00',
  deviceId: 'BIOMETRIC-001'
};

fetch('/api/add-attendance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(attendanceData),
})
.then(response => response.json())
.then(data => console.log(data));
```

### إضافة سجل حضور يدوي
```javascript
const manualAttendanceData = {
  employeeId: 1,
  date: '2023-10-02',
  checkIn: '08:30',
  checkOut: null,
  typeId: 1, // 1 = حضور
  notes: 'حضور يدوي',
  createdBy: 1
};

fetch('/api/add-manual-attendance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(manualAttendanceData),
})
.then(response => response.json())
.then(data => console.log(data));
```

### الحصول على سجلات الحضور
```javascript
// الحصول على سجلات موظف معين في شهر معين
fetch('/api/get-attendance?employeeId=1&year=2023&month=10')
  .then(response => response.json())
  .then(data => console.log(data));

// الحصول على قائمة جميع الموظفين
fetch('/api/get-attendance')
  .then(response => response.json())
  .then(data => console.log(data));
```

## التكامل مع واجهات المستخدم

يمكن استخدام هذه الواجهات مع صفحتي الحضور في المشروع:

1. **صفحة الحضور (attendance.js)**:
   - تستخدم `/api/get-attendance` لعرض سجلات الحضور
   - تستخدم `/api/add-attendance` لإضافة سجلات الحضور من أجهزة البصمة

2. **صفحة الحضور اليدوي (manual-attendance.js)**:
   - تستخدم `/api/get-attendance` لعرض سجلات الحضور
   - تستخدم `/api/add-manual-attendance` لإضافة سجلات الحضور اليدوية

## ملاحظات

- يتم تخزين قاعدة البيانات في مجلد `data` باسم `attendance.db`
- تم استخدام مكتبة `better-sqlite3` للتعامل مع قاعدة البيانات
- يمكن توسيع النظام بإضافة المزيد من الوظائف حسب الحاجة
