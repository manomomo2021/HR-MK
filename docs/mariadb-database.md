
# نظام إدارة قاعدة بيانات MariaDB

هذا المشروع يستخدم MariaDB كقاعدة بيانات أساسية لتخزين بيانات نظام إدارة الموارد البشرية.

## المتطلبات

- تثبيت MariaDB على الخادم
- إنشاء قاعدة بيانات للمشروع
- تثبيت مكتبة mysql2 في المشروع:
  ```bash
  npm install mysql2
  ```

## إعدادات الاتصال

يمكن تكوين اتصال قاعدة البيانات من خلال متغيرات البيئة التالية:

- `DB_HOST`: عنوان خادم قاعدة البيانات (الافتراضي: localhost)
- `DB_USER`: اسم مستخدم قاعدة البيانات (الافتراضي: root)
- `DB_PASSWORD`: كلمة مرور قاعدة البيانات (الافتراضي: فارغ)
- `DB_NAME`: اسم قاعدة البيانات (الافتراضي: hr_management)

## هيكل قاعدة البيانات

تم تصميم قاعدة البيانات لتشمل الجداول التالية:

1. **المستخدمين (users)**: لتخزين معلومات المستخدمين الذين يمكنهم الوصول إلى النظام
2. **الأقسام (departments)**: لتخزين معلومات الأقسام المختلفة في الشركة
3. **المناصب (positions)**: لتخزين المناصب الوظيفية المختلفة
4. **الموظفين (employees)**: لتخزين معلومات الموظفين
5. **الحضور والانصراف (attendance)**: لتسجيل حضور وانصراف الموظفين من أجهزة البصمة
6. **الحضور والانصراف اليدوي (manual_attendance)**: لتسجيل الحضور والانصراف يدويًا
7. **أنواع الحضور (attendance_types)**: لتخزين أنواع الحضور المختلفة
8. **إعدادات الحضور (attendance_settings)**: لتخزين إعدادات النظام المتعلقة بالحضور
9. **الإجازات (leaves)**: لتسجيل طلبات الإجازات والموافقات عليها
10. **الرواتب (payroll)**: لتخزين معلومات الرواتب والمدفوعات
11. **أجهزة البصمة (biometric_devices)**: لتخزين معلومات أجهزة البصمة
12. **السلف (loans)**: لتخزين معلومات السلف والقروض
13. **الإعدادات (settings)**: لتخزين إعدادات النظام المختلفة

## واجهات برمجة التطبيقات (APIs)

تم إنشاء واجهات برمجة التطبيقات التالية للتعامل مع قاعدة البيانات:

1. **تهيئة قاعدة البيانات**: `/api/init-mariadb`
   - تستخدم لإنشاء جداول قاعدة البيانات عند بدء تشغيل النظام لأول مرة

2. **الموظفين**: `/api/mariadb-employees`
   - GET: للحصول على قائمة الموظفين أو موظف محدد
   - POST: لإضافة موظف جديد
   - PUT: لتحديث معلومات موظف موجود
   - DELETE: لحذف موظف (تغيير الحالة إلى غير نشط)

3. **الحضور والانصراف**: `/api/mariadb-attendance`
   - GET: للحصول على سجلات الحضور والانصراف
   - POST: لإضافة سجل حضور جديد
   - PUT: لتحديث سجل حضور موجود
   - DELETE: لحذف سجل حضور

4. **الحضور والانصراف اليدوي**: `/api/mariadb-manual-attendance`
   - GET: للحصول على سجلات الحضور اليدوي
   - POST: لإضافة سجل حضور يدوي جديد
   - PUT: لتحديث سجل حضور يدوي موجود
   - DELETE: لحذف سجل حضور يدوي

5. **الرواتب**: `/api/mariadb-payroll`
   - GET: للحصول على سجلات الرواتب
   - POST: لإضافة سجل راتب جديد
   - PUT: لتحديث سجل راتب موجود
   - DELETE: لحذف سجل راتب

6. **السلف**: `/api/mariadb-loans`
   - GET: للحصول على سجلات السلف
   - POST: لإضافة سلفة جديدة
   - PUT: لتحديث سلفة موجودة
   - DELETE: لحذف سلفة

## كيفية الاستخدام

### تهيئة قاعدة البيانات
```javascript
// استدعاء واجهة برمجة التطبيقات لتهيئة قاعدة البيانات
fetch('/api/init-mariadb')
  .then(response => response.json())
  .then(data => console.log(data));
```

### إضافة موظف جديد
```javascript
const employeeData = {
  employee_id: 'EMP001',
  first_name: 'أحمد',
  last_name: 'محمد',
  email: 'ahmed@example.com',
  phone: '0123456789',
  address: 'العنوان',
  birth_date: '1990-01-01',
  hire_date: '2023-01-01',
  department_id: 1,
  position_id: 1,
  salary: 5000
};

fetch('/api/mariadb-employees', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(employeeData),
})
.then(response => response.json())
.then(data => console.log(data));
```

### الحصول على قائمة الموظفين
```javascript
fetch('/api/mariadb-employees')
  .then(response => response.json())
  .then(data => console.log(data));
```

### تسجيل حضور موظف
```javascript
const attendanceData = {
  employee_id: 1,
  date: '2023-10-02',
  check_in: '08:30',
  check_out: '17:00',
  device_id: 'BIOMETRIC-001'
};

fetch('/api/mariadb-attendance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(attendanceData),
})
.then(response => response.json())
.then(data => console.log(data));
```

### تسجيل حضور يدوي
```javascript
const manualAttendanceData = {
  employee_id: 1,
  date: '2023-10-02',
  check_in: '08:30',
  check_out: null,
  type_id: 1, // 1 = حضور
  notes: 'حضور يدوي',
  created_by: 1
};

fetch('/api/mariadb-manual-attendance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(manualAttendanceData),
})
.then(response => response.json())
.then(data => console.log(data));
```

## ميزات MariaDB

1. **الأداء العالي**: MariaDB توفر أداءً عاليًا للقراءة والكتابة
2. **الموثوقية**: تدعم المعاملات (Transactions) لضمان سلامة البيانات
3. **التوافق**: متوافقة مع MySQL، مما يسهل الترحيل بينهما
4. **المجتمع النشط**: تدعمها مجتمع نشط من المطورين
5. **المصدر المفتوح**: مجانية ومفتوحة المصدر

## النسخ الاحتياطي والاستعادة

### النسخ الاحتياطي
```bash
mysqldump -u [username] -p [database_name] > backup.sql
```

### الاستعادة
```bash
mysql -u [username] -p [database_name] < backup.sql
```

## ملاحظات

- تم استخدام مكتبة mysql2 للتعامل مع قاعدة البيانات
- تم تصميم النظام لمنع تكرار الحضور والانصراف في نفس اليوم
- يمكن توسيع النظام بإضافة المزيد من الجداول والوظائف حسب الحاجة
