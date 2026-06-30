@echo off
echo ========================================
echo    إصلاح أخطاء نظام إدارة الموارد البشرية
echo ========================================
echo.

echo جاري حذف الملفات القديمة...
if exist node_modules rmdir /s /q node_modules
if exist .next rmdir /s /q .next
if exist package-lock.json del package-lock.json

echo.
echo جاري تثبيت التبعيات الجديدة...
npm install

echo.
echo جاري تشغيل التطبيق...
npm run dev
