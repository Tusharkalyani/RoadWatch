@echo off
REM RoadWatch: AI-Powered Road Accountability Platform (40% Phase-1 MVP)
REM One-click Windows Launcher Script

title RoadWatch - AI Road Accountability Platform
echo ==========================================================
echo     ROADWATCH: AI-POWERED ROAD ACCOUNTABILITY PLATFORM   
echo                 40% Phase-1 MVP Prototype                
echo ==========================================================

REM Locate Python interpreter
set "PYTHON_EXE=python"
if exist "C:\Users\%USERNAME%\anaconda3\envs\roadwatch-backend\python.exe" (
    set "PYTHON_EXE=C:\Users\%USERNAME%\anaconda3\envs\roadwatch-backend\python.exe"
    echo [1/3] Using detected roadwatch-backend conda environment.
) else if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
    echo [1/3] Using local .venv environment.
)

REM Seed database if needed
echo [2/3] Verifying SQLite database and road master records...
"%PYTHON_EXE%" -m backend.seed

REM Check frontend node_modules
if not exist "frontend\node_modules" (
    echo [3/3] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo ==========================================================
echo             STARTING LOCAL ROADWATCH SERVERS              
echo ==========================================================
echo   Backend API   : http://127.0.0.1:8000
echo   API Docs      : http://127.0.0.1:8000/docs
echo   ML Status     : http://127.0.0.1:8000/api/ml/status
echo   Web Dashboard : http://127.0.0.1:5173
echo ==========================================================
echo Close this window to stop both servers.
echo.

start "RoadWatch Backend" "%PYTHON_EXE%" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
start "RoadWatch Frontend" cmd /c "cd frontend && npm run dev -- --host 127.0.0.1 --port 5173"

echo RoadWatch is launching...
pause
