<#
.SYNOPSIS
    تشغيل محرك التحقق من الغياب التلقائي — جدولة يومية عند 12:00 ظهراً
    Runs the Automatic Absence Verification Engine — scheduled daily at 12:00 PM

.DESCRIPTION
    هذا السكريبت مخصص للاستخدام مع Windows Task Scheduler.
    يقوم باستدعاء API محرك الغياب لتسجيل حالات الغياب تلقائياً.

    إعداد Windows Task Scheduler:
    1. افتح Task Scheduler (taskschd.msc)
    2. Create Task → General:
       - Name: "HR Absence Engine Daily"
       - Run whether user is logged on or not
    3. Triggers → New:
       - Begin the task: On a schedule
       - Daily
       - Start: 12:00 PM
       - Recur every: 1 day
    4. Actions → New:
       - Action: Start a program
       - Program/script: powershell.exe
       - Arguments: -File "D:\HR-MK-main\scripts\run-absence-cron.ps1"
    5. Conditions → Uncheck "Stop if running for X days"
    6. Settings → If task fails, restart every 5 minutes

    متغيرات البيئة المطلوبة (اختياري):
    - CRON_SECRET_TOKEN: رمز سري لحماية الـ API

.NOTES
    Author: Enterprise HR System
    Version: 2.0
    Requires: PowerShell 5.0+
#>

# ── إعدادات ──
$BASE_URL = "http://localhost:3000"
$API_PATH = "/api/jobs/verify-attendance"
$CRON_TOKEN = $env:CRON_SECRET_TOKEN
$LOG_FILE = Join-Path $PSScriptRoot "..\logs\absence-cron.log"

# التأكد من وجود مجلد logs
$logDir = Split-Path $LOG_FILE -Parent
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# ── تسجيل بدء التشغيل ──
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"[$timestamp] === Starting Absence Engine ===" | Out-File -FilePath $LOG_FILE -Append

try {
    # بناء URL مع الـ token
    $url = "$BASE_URL$API_PATH"
    if ($CRON_TOKEN) {
        $url += "?token=$CRON_TOKEN"
        "[$timestamp] Token configured, using secure endpoint." | Out-File -FilePath $LOG_FILE -Append
    } else {
        "[$timestamp] WARNING: No CRON_SECRET_TOKEN configured. Set environment variable for security." | Out-File -FilePath $LOG_FILE -Append
    }

    # استدعاء API
    "[$timestamp] Calling: $url" | Out-File -FilePath $LOG_FILE -Append
    $response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 120

    # تحليل النتيجة
    if ($response.success) {
        $message = "SUCCESS: $($response.message)"
        Write-Host $message -ForegroundColor Green
        "[$timestamp] $message" | Out-File -FilePath $LOG_FILE -Append

        if ($response.absentCount -and $response.absentCount -gt 0) {
            "[$timestamp] Absent employees marked: $($response.absentCount)" | Out-File -FilePath $LOG_FILE -Append
        }
    } else {
        $errorMsg = "ERROR: $($response.error)"
        Write-Host $errorMsg -ForegroundColor Red
        "[$timestamp] $errorMsg" | Out-File -FilePath $LOG_FILE -Append
        exit 1
    }

    "[$timestamp] === Absence Engine Complete ===" | Out-File -FilePath $LOG_FILE -Append

} catch {
    $errorMsg = "FAILED: $($_.Exception.Message)"
    Write-Host $errorMsg -ForegroundColor Red
    "[$timestamp] $errorMsg" | Out-File -FilePath $LOG_FILE -Append
    "[$timestamp] === Absence Engine FAILED ===" | Out-File -FilePath $LOG_FILE -Append
    exit 1
}
