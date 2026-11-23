#!/usr/bin/env bash
# RoadWatch: AI-Powered Road Accountability Platform (40% Phase-1 MVP)
# One-click launcher script for college project review demo

set -e

echo "=========================================================="
echo "    ROAOWATCH: AI-POWERED ROAD ACCOUNTABILITY PLATFORM   "
echo "                40% Phase-1 MVP Prototype                "
echo "=========================================================="

# Check Python virtual environment
if [ ! -d ".venv" ]; then
    echo "[1/4] Creating Python virtual environment (.venv)..."
    python3 -m venv .venv
fi

echo "[2/4] Activating environment and verifying dependencies..."
source .venv/bin/activate
pip install -r requirements.txt --quiet

# Seed database if not yet initialized
echo "[3/4] Initializing SQLite database & Kothri Kalan seed roads..."
python -m backend.seed

# Check frontend node_modules
if [ ! -d "frontend/node_modules" ]; then
    echo "[4/4] Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "=========================================================="
echo "            STARTING LOCAL ROADWATCH SERVERS              "
echo "=========================================================="
echo "  Backend API   : http://127.0.0.1:8000"
echo "  API Docs      : http://127.0.0.1:8000/docs"
echo "  Web Dashboard : http://127.0.0.1:5173"
echo "=========================================================="
echo "Press Ctrl+C at any time to shut down both servers."
echo ""

# Start FastAPI backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# Start Vite React frontend
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173 &
FRONTEND_PID=$!
cd ..

trap "echo ''; echo 'Shutting down RoadWatch servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
