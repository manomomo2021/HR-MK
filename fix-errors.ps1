# إصلاح أخطاء نظام إدارة الموارد البشرية - PowerShell

Write-Host "========================================" -ForegroundColor Green
Write-Host "   إصلاح أخطاء نظام إدارة الموارد البشرية" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "جاري حذف الملفات القديمة..." -ForegroundColor Yellow

# حذف node_modules
if (Test-Path "node_modules") {
    Write-Host "حذف مجلد node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules"
}

# حذف .next
if (Test-Path ".next") {
    Write-Host "حذف مجلد .next..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".next"
}

# حذف package-lock.json
if (Test-Path "package-lock.json") {
    Write-Host "حذف ملف package-lock.json..." -ForegroundColor Yellow
    Remove-Item -Force "package-lock.json"
}

Write-Host ""
Write-Host "جاري تثبيت التبعيات الجديدة..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "جاري تشغيل التطبيق..." -ForegroundColor Green
npm run dev
