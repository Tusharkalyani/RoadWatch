# RoadWatch: AI-Powered Road Accountability Platform (40% Phase-1 MVP)
# One-click PowerShell Launcher Script

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    ROADWATCH: AI-POWERED ROAD ACCOUNTABILITY PLATFORM   " -ForegroundColor Yellow
Write-Host "                40% Phase-1 MVP Prototype                " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan

# Locate Python interpreter
$pythonExe = "python"
$condaPath = "C:\Users\$env:USERNAME\anaconda3\envs\roadwatch-backend\python.exe"

if (Test-Path $condaPath) {
    $pythonExe = $condaPath
    Write-Host "[1/3] Using detected roadwatch-backend conda environment." -ForegroundColor Green
} elseif (Test-Path ".venv\Scripts\python.exe") {
    $pythonExe = ".venv\Scripts\python.exe"
    Write-Host "[1/3] Using local .venv environment." -ForegroundColor Green
} else {
    Write-Host "[1/3] Using system python." -ForegroundColor Gray
}

# Seed database
Write-Host "[2/3] Verifying SQLite database and road master records..." -ForegroundColor Yellow
& $pythonExe -m backend.seed

# Check frontend node_modules
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "[3/3] Installing frontend dependencies (npm install)..." -ForegroundColor Yellow
    Push-Location frontend
    npm install
    Pop-Location
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "            STARTING LOCAL ROADWATCH SERVERS              " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Backend API   : http://127.0.0.1:8000"
Write-Host "  API Docs      : http://127.0.0.1:8000/docs"
Write-Host "  ML Status     : http://127.0.0.1:8000/api/ml/status"
Write-Host "  Web Dashboard : http://127.0.0.1:5173"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop servers."
Write-Host ""

$backendJob = Start-Process -FilePath $pythonExe -ArgumentList "-m uvicorn backend.main:app --host 127.0.0.1 --port 8000" -PassThru
$frontendJob = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd frontend && npm run dev -- --host 127.0.0.1 --port 5173" -PassThru

try {
    Start-Sleep -Seconds 2
    Start-Process "http://127.0.0.1:5173"
    $backendJob.WaitForExit()
} finally {
    if ($backendJob -and -not $backendJob.HasExited) { Stop-Process -Id $backendJob.Id -Force -ErrorAction SilentlyContinue }
    if ($frontendJob -and -not $frontendJob.HasExited) { Stop-Process -Id $frontendJob.Id -Force -ErrorAction SilentlyContinue }
}
