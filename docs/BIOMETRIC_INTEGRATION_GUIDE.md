# دليل تكامل نظام البصمة

## نظرة عامة

تم تطوير نظام متكامل للاتصال بجهاز البصمة ZKTeco وجلب البيانات الفعلية للحضور والانصراف.

## 🔧 **المتطلبات التقنية**

### **1. المكتبات المطلوبة:**
```json
{
  "node-zklib": "^0.3.0",
  "xlsx": "^0.18.5", 
  "file-saver": "^2.0.5"
}
```

### **2. إعدادات الجهاز:**
```javascript
// config/biometric.js
export const BIOMETRIC_CONFIG = {
  DEVICE: {
    IP: '192.168.0.201',
    PORT: 4370,
    TIMEOUT: 10000,
    INPORT: 4000
  }
}
```

### **3. متغيرات البيئة (.env.local):**
```env
BIOMETRIC_IP=192.168.0.201
BIOMETRIC_PORT=4370
BIOMETRIC_TIMEOUT=10000
BIOMETRIC_INPORT=4000
```

## 📁 **هيكل الملفات**

```
├── pages/
│   ├── api/
│   │   └── attendance.js          # API endpoint للبصمة
│   └── biometric-attendance.js    # واجهة المستخدم
├── data/
│   └── employees.js               # بيانات الموظفين
├── config/
│   └── biometric.js               # إعدادات الجهاز
└── docs/
    └── BIOMETRIC_INTEGRATION_GUIDE.md
```

## 🔌 **API Endpoint**

### **المسار:** `/api/attendance`
### **الطريقة:** `GET`

### **الاستجابة الناجحة:**
```json
{
  "success": true,
  "attendance": [
    {
      "userId": "101",
      "userName": "أحمد محمد السعيد",
      "salary": 8000,
      "date": "2024-01-15",
      "inTime": "08:00 AM",
      "outTime": "05:30 PM",
      "workDuration": "9 ساعة 30 دقيقة",
      "overtime": "60 دقيقة",
      "overtimeMinutes": 60,
      "late": "0 دقيقة",
      "lateMinutes": 0,
      "verifyMode": "بصمة إصبع",
      "rawInTime": "2024-01-15T08:00:00.000Z",
      "rawOutTime": "2024-01-15T17:30:00.000Z"
    }
  ],
  "summary": {
    "totalRecords": 125,
    "totalEmployees": 20,
    "lastUpdate": "2024-01-15T10:30:25.000Z",
    "deviceInfo": {
      "ip": "192.168.0.201",
      "port": 4370
    }
  }
}
```

### **الاستجابة في حالة الخطأ:**
```json
{
  "success": false,
  "message": "لا يمكن الاتصال بجهاز البصمة. تأكد من أن الجهاز متصل بالشبكة",
  "error": "ECONNREFUSED"
}
```

## ⚙️ **إعدادات أوقات العمل**

```javascript
WORK_SCHEDULE: {
  START_HOUR: 8,           // بداية العمل 8:00 صباحاً
  START_MINUTE: 0,
  END_HOUR: 16,            // نهاية العمل 4:30 مساءً
  END_MINUTE: 30,
  LATE_ALLOWANCE_MINUTES: 10,  // سماح 10 دقائق تأخير
  EARLY_DEPARTURE_ALLOWANCE_MINUTES: 10
}
```

## 🔍 **معالجة البيانات**

### **1. تصفية السجلات المكررة:**
```javascript
// تصفية البصمات المكررة خلال 60 ثانية
records = records.filter((rec, i) => {
  if (i === 0) return true
  return (rec.timestamp - records[i - 1].timestamp) > 60000
})
```

### **2. حساب الوقت الإضافي:**
```javascript
function calculateOvertime(outTime, workDate) {
  const endOfDay = new Date(workDate)
  endOfDay.setHours(16, 30, 0, 0)  // 4:30 مساءً
  
  if (outTime > endOfDay) {
    return Math.floor((outTime - endOfDay) / (1000 * 60))
  }
  return 0
}
```

### **3. حساب التأخير:**
```javascript
function calculateLateMinutes(inTime, workDate) {
  const startLimit = new Date(workDate)
  startLimit.setHours(8, 10, 0, 0)  // 8:10 صباحاً (10 دقائق سماح)
  
  if (inTime > startLimit) {
    return Math.floor((inTime - startLimit) / (1000 * 60))
  }
  return 0
}
```

## 👥 **إدارة بيانات الموظفين**

### **ملف البيانات:** `data/employees.js`
```javascript
const employees = [
  {
    code: '101',                    // كود البصمة
    name: 'أحمد محمد السعيد',
    salary: 8000,
    department: 'المحاسبة',
    position: 'محاسب أول',
    joinDate: '2023-01-15'
  }
]
```

### **ربط البيانات:**
```javascript
// إنشاء خريطة للبحث السريع
const employeeMap = {}
employees.forEach(emp => {
  employeeMap[String(emp.code)] = {
    name: emp.name,
    salary: emp.salary
  }
})

// ربط بيانات البصمة بالموظف
const employee = employeeMap[uid] || { 
  name: `موظف ${uid}`, 
  salary: 0 
}
```

## 🔧 **أنواع التحقق المدعومة**

```javascript
VERIFY_MODES: {
  1: 'بصمة إصبع',
  2: 'كلمة مرور',
  3: 'بطاقة',
  4: 'بصمة وجه',
  15: 'بصمة كف',
  undefined: 'غير محدد'
}
```

## 🚨 **معالجة الأخطاء**

### **أنواع الأخطاء الشائعة:**

1. **ECONNREFUSED**: الجهاز غير متصل
2. **ETIMEDOUT**: انتهاء مهلة الاتصال
3. **ENETUNREACH**: مشكلة في الشبكة
4. **Device Busy**: الجهاز مشغول

### **رسائل الأخطاء:**
```javascript
ERROR_MESSAGES: {
  CONNECTION_REFUSED: 'لا يمكن الاتصال بجهاز البصمة. تأكد من أن الجهاز متصل بالشبكة',
  TIMEOUT: 'انتهت مهلة الاتصال بجهاز البصمة',
  NETWORK_ERROR: 'خطأ في الشبكة أثناء الاتصال بجهاز البصمة',
  DEVICE_BUSY: 'جهاز البصمة مشغول حالياً، يرجى المحاولة لاحقاً'
}
```

## 🔄 **تشغيل النظام**

### **1. تثبيت المكتبات:**
```bash
npm install node-zklib xlsx file-saver
```

### **2. إعداد متغيرات البيئة:**
```bash
# .env.local
BIOMETRIC_IP=192.168.0.201
BIOMETRIC_PORT=4370
```

### **3. تشغيل الخادم:**
```bash
npm run dev
```

### **4. الوصول للنظام:**
```
http://localhost:3000/biometric-attendance
```

## 📊 **اختبار الاتصال**

### **اختبار API:**
```bash
curl http://localhost:3000/api/attendance
```

### **اختبار الجهاز:**
```javascript
// في المتصفح
fetch('/api/attendance')
  .then(res => res.json())
  .then(data => console.log(data))
```

## 🔧 **استكشاف الأخطاء**

### **1. مشاكل الاتصال:**
- تأكد من أن الجهاز متصل بالشبكة
- تحقق من عنوان IP ورقم المنفذ
- تأكد من عدم وجود جدار حماية يحجب الاتصال

### **2. مشاكل البيانات:**
- تحقق من تطابق أكواد الموظفين
- تأكد من صحة تنسيق التاريخ والوقت
- راجع إعدادات أوقات العمل

### **3. مشاكل الأداء:**
- قم بزيادة مهلة الاتصال للشبكات البطيئة
- استخدم تصفية البيانات لتقليل حجم الاستجابة
- فعل التخزين المؤقت للبيانات

## 📈 **التحسينات المستقبلية**

1. **التخزين المؤقت**: حفظ البيانات محلياً لتحسين الأداء
2. **المزامنة التلقائية**: جدولة تحديث البيانات تلقائياً
3. **التنبيهات**: إشعارات عند حدوث أخطاء
4. **التقارير المتقدمة**: تحليلات أعمق للحضور والانصراف
5. **دعم أجهزة متعددة**: الاتصال بعدة أجهزة بصمة

---

## ✅ **النتيجة النهائية**

نظام متكامل وموثوق للاتصال بجهاز البصمة:
- ✅ **اتصال مباشر** بجهاز ZKTeco
- ✅ **معالجة ذكية** للبيانات
- ✅ **حسابات دقيقة** للوقت الإضافي والتأخير
- ✅ **معالجة شاملة** للأخطاء
- ✅ **واجهة احترافية** لعرض البيانات

النظام جاهز للاستخدام الإنتاجي! 🚀
