# RoadWatch: AI-Powered Road Accountability Platform
> **RoadWatch** is a map-first civic road accountability system that bridges **computer vision road-defect detection** (YOLOv8 + OpenCV) with **statutory jurisdiction routing** (NHAI / State PWD / Rural RES) and **transparent 3-level fiscal tracking** (Sanctioned vs. Released vs. Spent).

---

## 🚀 Quick Start (Run Locally in Under 2 Minutes)

### Option A: 1-Click All-in-One Launcher
- **Windows (PowerShell)**:
  ```powershell
  .\start_demo.ps1
  ```
- **Windows (CMD)**:
  ```cmd
  start_demo.bat
  ```
- **Linux / macOS / Git Bash**:
  ```bash
  ./start_demo.sh
  ```

### Option B: Step-by-Step Terminal Execution

#### 1. Backend (FastAPI + YOLOv8 + SQLite)
```bash
# In the project root directory
# Activate Python environment (e.g. conda or venv)
conda activate roadwatch-backend   # OR source .venv/bin/activate
pip install -r requirements.txt

# Run SQLite auto-seeder (populates Kothri Kalan & Sehore roads + Bengaluru master)
python -m backend.seed

# Start FastAPI server (Runs on port 8000)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

#### 2. Frontend (React + Vite + Leaflet + Tailwind CSS)
In a second terminal window:
```bash
cd frontend
npm install
npm run dev
```

Open **[http://127.0.0.1:5173](http://127.0.0.1:5173)** in your browser.
API Swagger Docs are available at **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**.
ML Engine Status is available at **[http://127.0.0.1:8000/api/ml/status](http://127.0.0.1:8000/api/ml/status)**.

---

## 🎥 Running the Dashcam Video Inference Demo

To demonstrate real-time video/dashcam defect frame-sampling to your project evaluators:
```bash
# Interactive GUI window demo (processes video, runs YOLOv8, draws HUD telemetry, and logs GPS anomalies):
python backend/run_dashcam_demo.py

# Headless / Terminal table demo:
python backend/run_dashcam_demo.py --headless --skip 2
```
*Note: If no custom MP4 dashcam clip is supplied, the script automatically synthesizes a high-fidelity test video with moving highway lane markings and approaching asphalt defects, running YOLOv8 inference and saving keyframe anomalies to `backend/static/evidence/dashcam_anomalies/`.*

---

## 🎯 40% Phase-1 Scope & Features Implemented

| Module | Feature | Implementation Details |
| :--- | :--- | :--- |
| **AI Detection & SLA** | **Trained YOLOv8 Defect Inference** | Integrates custom-trained YOLOv8 weights from `backend/ml/weights/best.pt` detecting: `pothole`, `alligator_crack`, `transverse_crack`, `longitudinal_crack`, and `road_marking_blur`. Maps to canonical classes (`Pothole`, `Crack`, `Missing Signage`, `Road Cave-in`, `Waterlogging`) with subtype granularity. Includes zero-crash heuristic fallback. |
| **ML Engine API** | **Direct Inference & Status Endpoints** | Exposes `/api/ml/status` for inspection of architecture, active weights, and class mappings, plus `/api/ml/analyze` for raw model evaluation via Swagger. Supported via standalone module `backend.ml.analyzer`. |
| **Severity Matrix** | **Automated SLA Engine** | Computes bounding-box area percentage: <br>• `Road Cave-in` or Area &gt; 15% ➔ **Critical (48h SLA)**<br>• `Pothole`/`Waterlogging` &amp; Area 7–15% or `Alligator Crack` ➔ **High (7d SLA)**<br>• `Crack`/`Missing Signage` or Area 3–7% ➔ **Medium (15d SLA)**<br>• Area &lt; 3% ➔ **Low (30d SLA)** |
| **Multi-Region Civic Routing** | **Smart Jurisdiction Rules** | • **MP Region**: NH ➔ NHAI Bhopal, SH ➔ MP PWD Sehore, MDR ➔ District Collector / RES Sehore.<br>• **Bengaluru (BBMP)**: NH ➔ NHAI PIU Bengaluru, SH ➔ KSHIP / Karnataka PWD, MDR ➔ BBMP Road Infrastructure Cell ([Division] Division) with direct engineer contacts. |
| **Database & GIS** | **Dual Region Master Ingestion** | Ingests both **Kothri Kalan & Sehore (MP)** campus corridors AND **564 Real Bengaluru Urban Corridors** from `bengaluru_roads_master.csv` across all 8 BBMP divisions with real WKT geometries, engineer directories, and DLP warranty records. |
| **Contractor & DLP Accountability** | **Defect Liability Period (DLP) & Engineers** | Displays statutory contractor warranty status (Active DLP vs. Expired), plus direct contacts for Executive Engineer, Assistant Executive Engineer, and Assistant Engineer. |
| **Fiscal Accountability** | **3-Level Budget Comparison** | Displays Sanctioned vs. Released vs. Spent budget bars with dynamic **Audit Red Flags** (e.g. *Released &gt; Sanctioned* anomalies or *&gt;85% spent on critical/failing roads*). |
| **Multi-Page Architecture & Design** | **Royal Civic Governance System** | Replaced cluttered single-page layout with `react-router-dom` multi-page routing:<br>• `/` — **Executive Overview** (District road health summary & key metrics)<br>• `/map` — **Tap-a-Road GIS Map** (Full-height natural cartography & road drawer)<br>• `/inspect` — **AI Damage Inspector** (Photo upload, YOLOv8 receipt & statutory routing)<br>• `/ledger` — **Accountability Ledger** (Formal audit table & evidence modal)<br>• **Aesthetic:** Warm Alabaster (`#FAF9F6`), Deep Imperial Navy (`#0F2342`), Antique Gold (`#B48A3E`), hairline borders (`#E2E8F0`), and `Playfair Display` serif typography with a strict limit of one primary action button per page. |

---

## 📋 Step-by-Step Project Review Demo Walkthrough

During your college viva or project review presentation, follow this 5-minute script:

### Step 1: The Civic Overview (Map View)
1. Open `http://127.0.0.1:5173`.
2. Explain that the map is centered on **Kothri Kalan & Sehore (MP)**, monitoring 5 key road stretches.
3. Show the **color-coded polylines**:
   - **Green (NH-46)**: Health score 86.5/100 (Optimal).
   - **Amber (SH-18 & Campus Approach)**: Moderate wear (58.0/100).
   - **Red (MDR-12)**: Severely deteriorated (32.5/100).
4. Point out the glowing red radar pulse pin marking a **Critical Hazard** on MDR-12.

### Step 2: The "Tap-a-Road" Drawer & 3-Level Budget Audit
1. Click on the red polyline for **MDR-12 (Sehore City - Kothri Kalan Link)**.
2. The right-hand drawer slides open displaying:
   - Contractor: *Malwa Tollway & PWD Infra Corp*.
   - Road Health Index: **32.5 / 100**.
   - **3-Level Budget Breakdown Bar**:
     - Sanctioned: ₹4.80 Cr (Blue)
     - Released: ₹5.35 Cr (Red highlight)
     - Spent: ₹5.10 Cr (Amber)
3. Highlight the **Audit Red Flag Banner**: *"Released funds (₹5.35 Cr) exceed sanctioned budget (₹4.80 Cr) by ₹55.0 Lakhs"*. Explain that RoadWatch automatically flags public fund discrepancies.

### Step 3: AI Defect Tester & 1-Click Inference
1. Click the **"⚡ AI Defect Tester"** tab in the navigation bar.
2. Under **Quick Viva Test Presets**, click **"Road Cave-in"** or **"Pothole Defect"**.
3. Note how the photo, GPS coordinates, and road segment are automatically populated.
4. Click **"Analyze Road & File Official Complaint"**.
5. Watch the real-time inference receipt appear:
   - YOLOv8 annotated bounding box + HUD banner.
   - Defect Class: **Road Cave-in** (Confidence: 94%).
   - Severity: **Critical** (SLA: **48 Hours**).
   - Jurisdiction Routed to: **District Collector / Rural Road Engineering Services (RES), Sehore**.
   - Escalation: *District Magistrate ➔ Panchayat & Rural Development Dept*.
6. Click **"Locate Defect Pin on Map"** to see the newly generated tracking ID (`RW-2026-007`) appear live on the map.

### Step 4: Accountability Ledger & Status Lifecycle
1. Click the **"📋 Complaints Ledger"** tab.
2. Filter complaints by **Severity: Critical** or **Status: Open**.
3. Click **"Inspect"** on any row to open the high-resolution evidence modal.
4. Use the lifecycle buttons (`Open` ➔ `In Progress` ➔ `Resolved`) to demonstrate how civic engineers can log complaint resolution in real-time.

### Step 5: Dashcam Frame-Sampling Engine
1. Switch to your terminal and execute:
   ```bash
   python backend/run_dashcam_demo.py
   ```
2. Explain how this module samples frames from vehicle dashcams, correlates defects with GPS coordinates, overlays real-time HUD telemetry, and logs anomalies for automated bulk ingestion.

---

## 📂 Project Architecture

```
RoadWatch/
├── backend/
│   ├── ai_detector.py           # YOLOv8 inference, severity calculation & bounding-box annotation
│   ├── database.py              # SQLite / SQLAlchemy engine & session management
│   ├── main.py                  # FastAPI application with routing & REST endpoints
│   ├── models.py                # SQLAlchemy models (Road, Complaint)
│   ├── ml/                      # Machine learning engine & trained weights
│   │   ├── analyzer.py          # Standalone YOLOv8 inference & damage severity classifier
│   │   └── weights/             # Custom trained weights (best.pt, last.pt)
│   ├── run_dashcam_demo.py      # Video dashcam frame-sampling CLI engine with YOLOv8
│   ├── seed.py                  # Dual-region seeder (5 MP roads + 564 Bengaluru corridors)
│   ├── data/
│   │   └── bengaluru_roads_master.csv  # 564 Bengaluru corridors with WKT geometries
│   └── static/
│       ├── evidence/            # Saved AI annotated bounding-box images
│       └── sample_dashcam.mp4   # Generated synthetic dashcam test clip
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── RoadWatchContext.jsx    # Unified multi-page state management
│   │   ├── components/
│   │   │   ├── Header.jsx              # Minimalist Navy top navigation with 4 clean links
│   │   │   ├── MapView.jsx             # Leaflet OpenStreetMap natural cartography & pins
│   │   │   ├── RoadDetailDrawer.jsx    # Tap-a-Road slide-over inspector (Contractor, DLP, 3-level budget)
│   │   │   └── EvidenceModal.jsx       # YOLOv8 machine-vision audit viewer & lifecycle updater
│   │   ├── pages/
│   │   │   ├── OverviewPage.jsx        # / — Executive Overview & district road health KPIs
│   │   │   ├── MapPage.jsx             # /map — Tap-a-Road GIS Map
│   │   │   ├── InspectPage.jsx         # /inspect — AI Damage Inspector with YOLOv8 & auto-routing
│   │   │   └── LedgerPage.jsx          # /ledger — Formal Accountability Ledger & audit table
│   │   ├── App.jsx                     # React Router DOM configuration
│   │   ├── index.css                   # Royal Civic Governance styling & typography
│   │   └── main.jsx                    # React entrypoint
│   ├── index.html                      # HTML with Playfair Display & Plus Jakarta Sans
│   ├── package.json                    # Node dependencies (including react-router-dom)
│   └── vite.config.js                  # Vite configuration with proxy to FastAPI backend
├── models/                             # Custom weights directory (roadwatch_yolov8.pt)
├── requirements.txt                    # Python dependencies
├── start_demo.sh                       # 1-click startup bash script (Linux / macOS / Git Bash)
├── start_demo.bat                      # 1-click Windows CMD startup script
├── start_demo.ps1                      # 1-click Windows PowerShell startup script
└── README.md                           # Documentation & viva review guide
```

---

## 🛠️ Technology Stack
- **AI / Computer Vision:** Ultralytics YOLOv8, OpenCV (`opencv-python`), Pillow, PyTorch.
- **Backend:** Python 3, FastAPI, Uvicorn, SQLAlchemy, SQLite (`roadwatch.db`).
- **Frontend:** React 19, Vite, Tailwind CSS v4, Leaflet.js (`react-leaflet` + OpenStreetMap), Lucide Icons, Axios.
- **Theme:** Academic dark charcoal (`#090d16`), emerald green (`#10b981`), amber warning, and rose red distress colors.
