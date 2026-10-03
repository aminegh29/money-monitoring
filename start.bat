@echo off
REM Starts the Money Monitor backend and frontend in two windows.
REM To enable the AI advisor, uncomment and fill the two lines below (see README.md).
REM set AI_PROVIDER=groq
REM set AI_API_KEY=gsk_your_key_here

start "Money Monitor - Backend" cmd /k "cd /d %~dp0backend && mvn spring-boot:run"

if not exist "%~dp0frontend\node_modules" (
  echo Installing frontend dependencies...
  cd /d %~dp0frontend && call npm install
)
start "Money Monitor - Frontend" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo Backend:  http://localhost:8080
echo Frontend: http://localhost:4200  (opens in a few seconds)
timeout /t 25 /nobreak >nul
start http://localhost:4200
