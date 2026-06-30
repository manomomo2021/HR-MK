
# نظام إدارة قاعدة بيانات SQLite

هذا المشروع يستخدم SQLite كقاعدة بيانات أساسية لتخزين بيانات نظام إدارة الموارد البشرية.

## هيكل قاعدة البيانات

تم تصميم قاعدة البيانات لتشمل الجداول التالية:

1. **المستخدمين (users)**: لتخزين معلومات المستخدمين الذين يمكنهم الوصول إلى النظام
2. **الأقسام (departments)**: لتخزين معلومات الأقسام المختلفة في الشركة
3. **المناصب (positions)**: لتخزين المناصب الوظيفية المختلفة
4. **الموظفين (employees)**: لتخزين معلومات الموظفين
5. **الحضور والانصراف (attendance)**: لتسجيل حضور وانصراف الموظفين
6. **الإجازات (leaves)**: لتسجيل طلبات الإجازات والموافقات عليها
7. **الرواتب (payroll)**: لتخزين معلومات الرواتب والمدفوعات
8. **أجهزة البصمة (biometric_devices)**: لتخزين معلومات أجهزة البصمة
9. **الإعدادات (settings)**: لتخزين إعدادات النظام المختلفة

## واجهات برمجة التطبيقات (APIs)

تم إنشاء واجهات برمجة التطبيقات التالية للتعامل مع قاعدة البيانات:

1. **تهيئة قاعدة البيانات**: `/api/init-db`
   - تستخدم لإنشاء جداول قاعدة البيانات عند بدء تشغيل النظام لأول مرة

2. **الموظفين**: `/api/employees`
   - GET: للحصول على قائمة الموظفين أو موظف محدد
   - POST: لإضافة موظف جديد
   - PUT: لتحديث معلومات موظف موجود
   - DELETE: لحذف موظف (تغيير الحالة إلى غير نشط)

3. **الحضور والانصراف**: `/api/attendance-sqlite`
   - GET: للحصول على سجلات الحضور والانصراف
   - POST: لإضافة سجل حضور جديد
   - PUT: لتحديث سجل حضور موجود
   - DELETE: لحذف سجل حضور

4. **الرواتب**: `/api/payroll`
   - GET: للحصول على سجلات الرواتب
   - POST: لإضافة سجل راتب جديد
   - PUT: لتحديث سجل راتب موجود
   - DELETE: لحذف سجل راتب

5. **السلف**: `/api/loans`
   - GET: للحصول على سجلات السلف
   - POST: لإضافة سلفة جديدة
   - PUT: لتحديث سلفة موجودة
   - DELETE: لحذف سلفة

## كيفية الاستخدام

1. **تهيئة قاعدة البيانات**:
   ```javascript
   // استدعاء واجهة برمجة التطبيقات لتهيئة قاعدة البيانات
   fetch('/api/init-db')
     .then(response => response.json())
     .then(data => console.log(data));
   ```

2. **إضافة موظف جديد**:
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

   fetch('/api/employees', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
     },
     body: JSON.stringify(employeeData),
   })
   .then(response => response.json())
   .then(data => console.log(data));
   ```

3. **الحصول على قائمة الموظفين**:
   ```javascript
   fetch('/api/employees')
     .then(response => response.json())
     .then(data => console.log(data));
   ```

4. **تسجيل حضور موظف**:
   ```javascript
   const attendanceData = {
     employee_id: 1,
     date: '2023-10-02',
     check_in: '08:30',
     check_out: '17:00',
     status: 'present'
   };

   fetch('/api/attendance-sqlite', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
     },
     body: JSON.stringify(attendanceData),
   })
   .then(response => response.json())
   .then(data => console.log(data));
   ```

## ملاحظات

- يتم تخزين قاعدة البيانات في مجلد `data` باسم `hr_management.db`
- تم استخدام مكتبة `better-sqlite3` للتعامل مع قاعدة البيانات
- يمكن توسيع النظام بإضافة المزيد من الجداول والوظائف حسب الحاجة
