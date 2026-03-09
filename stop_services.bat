@echo off
echo Stopping services on ports 3100, 5173, 5174...

REM Find and kill process on port 3100 (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr "LISTENING" ^| findstr ":3100"') do (
    echo Killing process %%a on port 3100...
    taskkill /F /PID %%a
)

REM Find and kill process on port 5173 (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr "LISTENING" ^| findstr ":5173"') do (
    echo Killing process %%a on port 5173...
    taskkill /F /PID %%a
)

REM Find and kill process on port 5174 (Frontend Alt)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr "LISTENING" ^| findstr ":5174"') do (
    echo Killing process %%a on port 5174...
    taskkill /F /PID %%a
)

echo Services stopped.
pause
