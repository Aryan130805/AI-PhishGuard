@echo off
title PhishGuard Dev Launcher
echo ============================================
echo   PhishGuard Local Development
echo   Backend  -^> http://localhost:8000
echo   Frontend -^> http://localhost:3000
echo   API Docs -^> http://localhost:8000/docs
echo ============================================
echo.

:: ── Backend (FastAPI) ──────────────────────────────────────────────────────
echo [1/2] Starting FastAPI backend on port 8000...
start "PhishGuard Backend :8000" cmd /k "cd /d %~dp0phishguard\backend && echo. && echo  Backend starting... && echo  Press Ctrl+C to stop. && echo. && .venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload"

:: Small pause so the backend has a moment to bind before the frontend hits /api
ping 127.0.0.1 -n 3 >nul

:: ── Frontend (Vite) ────────────────────────────────────────────────────────
echo [2/2] Starting Vite frontend on port 3000...
start "PhishGuard Frontend :3000" cmd /k "cd /d %~dp0phishguard\frontend && echo. && echo  Frontend starting... && echo  Press Ctrl+C to stop. && echo. && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo.
echo  Open http://localhost:3000 in your browser.
echo  Backend API docs: http://localhost:8000/docs
echo.
pause
