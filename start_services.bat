@echo off
echo Starting Backend...
start "YJWujian Backend" cmd /k "npm run dev:backend"

echo Starting Frontend...
start "YJWujian Frontend" cmd /k "npm run dev:frontend"

echo Services started in separate windows.
pause
