#!/usr/bin/env bash
# RoadWatch: AI-Powered Road Accountability Platform (40% Phase-1 MVP)
# One-click launcher script for college project review demo

set -e

echo "=========================================================="
echo "    ROADWATCH: AI-POWERED ROAD ACCOUNTABILITY PLATFORM   "
echo "                40% Phase-1 MVP Prototype                "
echo "=========================================================="

# Activate Conda environment if present, or create/activate .venv
if [ -d "$HOME/anaconda3/envs/roadwatch-backend" ]; then
    echo "[1/4] Using detected conda environment (roadwatch-backend)..."
    export PATH="$HOME/anaconda3/envs/roadwatch-backend:$HOME/anaconda3/envs/roadwatch-backend/Scripts:$PATH"
elif [ -d "/c/Users/$USER/anaconda3/envs/roadwatch-backend" ]; then
    echo "[1/4] Using detected conda environment (roadwatch-backend)..."
    export PATH="/c/Users/$USER/anaconda3/envs/roadwatch-backend:/c/Users/$USER/anaconda3/envs/roadwatch-backend/Scripts:$PATH"
elif [ ! -d ".venv" ]; then
    echo "[1/4] Setting up Python environment..."
    python3 -m venv .venv 2>/dev/null || python -m venv .venv
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    elif [ -f ".venv/Scripts/activate" ]; then
        source .venv/Scripts/activate
    fi
    pip install -r requirements.txt --quiet
else
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    elif [ -f ".venv/Scripts/activate" ]; then
        source .venv/Scripts/activate
    fi
fi

# Seed database if not yet initialized
echo "[2/4] Verifying SQLite database & corridor seed records..."
python -m backend.seed

# Check frontend node_modules
if [ ! -d "frontend/node_modules" ]; then
    echo "[3/4] Installing frontend dependencies (npm install)..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "=========================================================="
echo "            STARTING LOCAL ROADWATCH SERVERS              "
echo "=========================================================="
echo "  Backend API   : http://127.0.0.1:8000"
echo "  API Docs      : http://127.0.0.1:8000/docs"
echo "  ML Status     : http://127.0.0.1:8000/api/ml/status"
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
