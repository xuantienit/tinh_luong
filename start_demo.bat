@echo off
setlocal
cd /d "%~dp0"

set "AURORA_DB_PATH=%~dp0salary_test.sqlite3"
set "AURORA_DEMO_RESET=1"

echo ===============================================
echo   Aurora demo - local only
echo ===============================================
echo Reset du lieu Submit/thanh toan/phieu chi...
python reset_demo.py
if errorlevel 1 (
  echo Khong the reset du lieu. Kiem tra Python da duoc cai dat chua.
  pause
  exit /b 1
)

echo Mo trinh duyet tai http://127.0.0.1:8000/
start "" "http://127.0.0.1:8000/"
echo Server dang chay. Nhan F5 trong trinh duyet de reset va test lai tu dau.
echo Dong cua so nay de dung server.
echo.
python -m uvicorn app:app --host 127.0.0.1 --port 8000

pause
