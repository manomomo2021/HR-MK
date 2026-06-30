@echo off
REM ═══════════════════════════════════════════════════════════════
REM تشغيل محرك التحقق من الغياب التلقائي — Windows Batch
REM Automatic Absence Verification Engine — Windows Batch
REM ═══════════════════════════════════════════════════════════════
REM
REM إعداد Windows Task Scheduler:
REM 1. افتح Task Scheduler (taskschd.msc)
REM 2. Create Task → General:
REM    - Name: "HR Absence Engine Daily"
REM    - Run whether user is logged on or not
REM 3. Triggers → New:
REM    - Daily, Start: 12:00 PM, Recur every: 1 day
REM 4. Actions → New:
REM    - Action: Start a program
REM    - Program/script: D:\HR-MK-main\scripts\run-absence-cron.bat
REM 5. Settings → If task fails, restart every 5 minutes
REM ═══════════════════════════════════════════════════════════════

set BASE_URL=http://localhost:3000
set API_PATH=/api/jobs/verify-attendance
set LOG_FILE=%~dp0..\logs\absence-cron.log

REM Use token from environment if set
set TOKEN_URL=%API_PATH%
if not "%CRON_SECRET_TOKEN%"=="" set TOKEN_URL=%API_PATH%?token=%CRON_SECRET_TOKEN%

echo [%DATE% %TIME%] === Starting Absence Engine === >> "%LOG_FILE%" 2>&1

REM Call the API using curl (included in Windows 10+)
curl -s -o - "%BASE_URL%%TOKEN_URL%" >> "%LOG_FILE%" 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo [%DATE% %TIME%] FAILED: curl returned error %ERRORLEVEL% >> "%LOG_FILE%" 2>&1
    exit /b 1
)

echo [%DATE% %TIME%] === Absence Engine Complete === >> "%LOG_FILE%" 2>&1
exit /b 0
