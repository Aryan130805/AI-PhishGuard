@echo off
title PhishGuard Dev Launcher
echo ============================================
echo   PhishGuard Local Development Launcher
echo   Backend  -^> http://localhost:8000
echo   Frontend -^> http://localhost:3000
echo   API Docs -^> http://localhost:8000/docs
echo ============================================
echo.

echo [1/2] Starting FastAPI backend on port 8000...
start "PhishGuard Backend :8000" cmd /k "cd /d %~dp0backend && echo. && echo  Backend starting... && .venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload"

ping 127.0.0.1 -n 3 >nul

echo [2/2] Starting Vite frontend on port 3000...
start "PhishGuard Frontend :3000" cmd /k "cd /d %~dp0frontend && echo. && echo  Frontend starting... && npm run dev"

echo.
echo Both servers started successfully!
echo Open http://localhost:3000 in your browser.
echo.
