#!/bin/bash

echo "========================================"
echo "   نظام إدارة الموارد البشرية - Next.js"
echo "========================================"
echo

echo "جاري تثبيت التبعيات..."
npm install

echo
echo "جاري تشغيل التطبيق..."
echo
echo "يمكنك الوصول للتطبيق على:"
echo "http://localhost:3000"
echo
echo "بيانات تسجيل الدخول:"
echo "اسم المستخدم: admin"
echo "كلمة المرور: admin123"
echo

npm run dev
