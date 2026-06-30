require('dotenv').config();
const { initializeDatabase } = require('./utils/db');

console.log('جاري تحديث قاعدة البيانات بناءً على هيكلية محرك الأحداث (Enterprise Event Engine)...');
initializeDatabase()
  .then(() => {
    console.log('تم تحديث قاعدة البيانات (بما في ذلك Postgres) بنجاح وإنشاء جميع الجداول المطلوبة!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('حدث خطأ أثناء تحديث قاعدة البيانات:', error);
    process.exit(1);
  });
