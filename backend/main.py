import os
import math
import random
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from backend.database import get_db, engine, Base
from backend.models import Road, Complaint
from backend.ai_detector import detect_road_damage, STATIC_DIR, EVIDENCE_DIR
from backend.seed import seed_database, REGION_ROUTING, AUTHORITY_ROUTING

# Initialize database tables & seed data on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RoadWatch Backend API",
    description="AI-Powered Civic Road Accountability Platform API (Supporting Kothri Kalan MP & Bengaluru BBMP)",
    version="1.2.0"
)

# Enable CORS for local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static evidence directory
os.makedirs(EVIDENCE_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.on_event("startup")
def startup_event():
    """Ensure database has baseline roads and historical complaints."""
    seed_database()

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Euclidean approx distance in degrees squared."""
    return (lat1 - lat2) ** 2 + (lon1 - lon2) ** 2

def find_nearest_road(lat: float, lon: float, db: Session, region: Optional[str] = None) -> Optional[Road]:
    """Finds the nearest road polyline to the given coordinates, auto-detecting region if needed."""
    if not region:
        # Lat < 18.0 is South India / Bengaluru; Lat >= 18.0 is Central India / MP
        region = "BLR" if lat < 18.0 else "MP"

    query = db.query(Road).filter(Road.region == region)
    roads = query.all()
    if not roads:
        roads = db.query(Road).all()

    if not roads:
        return None

    best_road = None
    min_dist = float("inf")

    for r in roads:
        coords = r.coordinates or []
        for pt in coords:
            d = calculate_distance(lat, lon, pt[0], pt[1])
            if d < min_dist:
                min_dist = d
                best_road = r

    return best_road or roads[0]

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "RoadWatch AI Platform API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ai_engine": "YOLOv8 + OpenCV/PIL",
        "supported_regions": ["MP (Kothri Kalan / Sehore)", "BLR (Bengaluru Urban BBMP)"]
    }

@app.get("/api/stats")
def get_stats(region: Optional[str] = None, db: Session = Depends(get_db)):
    road_query = db.query(Road)
    comp_query = db.query(Complaint)

    if region and region != "ALL":
        road_query = road_query.filter(Road.region == region)
        comp_query = comp_query.filter(Complaint.region == region)

    roads = road_query.all()
    complaints = comp_query.all()

    total_roads = len(roads)
    total_complaints = len(complaints)
    open_complaints = sum(1 for c in complaints if c.status == "Open")
    in_progress = sum(1 for c in complaints if c.status == "In Progress")
    resolved = sum(1 for c in complaints if c.status == "Resolved")
    critical_alerts = sum(1 for c in complaints if c.severity == "Critical" and c.status != "Resolved")

    avg_health = round(sum(r.road_health_score for r in roads) / total_roads, 1) if total_roads else 0
    total_sanctioned = round(sum(r.budget_sanctioned for r in roads), 2)
    total_released = round(sum(r.budget_released for r in roads), 2)
    total_spent = round(sum(r.budget_spent for r in roads), 2)
    total_unspent = round(sum(r.budget_unspent for r in roads), 2)

    return {
        "region": region or "ALL",
        "total_roads": total_roads,
        "total_complaints": total_complaints,
        "open_complaints": open_complaints,
        "in_progress_complaints": in_progress,
        "resolved_complaints": resolved,
        "critical_alerts": critical_alerts,
        "average_health_score": avg_health,
        "budget_summary": {
            "sanctioned_lakhs": total_sanctioned,
            "released_lakhs": total_released,
            "spent_lakhs": total_spent,
            "unspent_lakhs": total_unspent,
            "utilization_pct": round((total_spent / total_released * 100), 1) if total_released else 0
        }
    }

@app.get("/api/roads")
def get_roads(region: Optional[str] = None, limit: int = 200, db: Session = Depends(get_db)):
    """Returns monitored roads with polylines, contractor details, budget breakdown, and health scores."""
    query = db.query(Road)
    if region and region != "ALL":
        query = query.filter(Road.region == region)

    roads = query.limit(limit).all()
    result = []
    for r in roads:
        data = r.to_dict()
        data["complaints"] = [
            {
                "id": c.id,
                "tracking_id": c.tracking_id,
                "damage_type": c.damage_type,
                "severity": c.severity,
                "status": c.status,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in r.complaints
        ]
        result.append(data)
    return result

@app.get("/api/roads/{road_id}")
def get_road_detail(road_id: int, db: Session = Depends(get_db)):
    road = db.query(Road).filter(Road.id == road_id).first()
    if not road:
        raise HTTPException(status_code=404, detail="Road not found")
    data = road.to_dict()
    data["complaints"] = [c.to_dict() for c in road.complaints]
    return data

@app.get("/api/complaints")
def get_complaints(
    region: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    road_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Returns all complaints with evidence URLs, SLA, and routing info."""
    query = db.query(Complaint)
    if region and region != "ALL":
        query = query.filter(Complaint.region == region)
    if severity and severity != "All":
        query = query.filter(Complaint.severity == severity)
    if status and status != "All":
        query = query.filter(Complaint.status == status)
    if road_id:
        query = query.filter(Complaint.road_id == road_id)

    complaints = query.order_by(Complaint.created_at.desc()).all()
    return [c.to_dict() for c in complaints]

@app.patch("/api/complaints/{complaint_id}/status")
def update_complaint_status(
    complaint_id: int,
    status: str = Query(..., pattern="^(Open|In Progress|Resolved)$"),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.status = status
    db.commit()
    db.refresh(complaint)
    return complaint.to_dict()

@app.post("/api/complaints/detect")
async def detect_and_file_complaint(
    file: UploadFile = File(...),
    latitude: float = Form(23.0775),
    longitude: float = Form(76.8513),
    road_id: Optional[int] = Form(None),
    region: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Accepts an uploaded road damage image, runs YOLOv8 defect detection,
    computes severity + SLA, smart-routes to jurisdiction authority (MP or BBMP),
    records the complaint in DB, and returns full accountability receipt.
    """
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image uploaded.")

    # Run AI inference and annotation
    detection_res = detect_road_damage(image_bytes, filename_hint=file.filename or "upload.jpg")

    # Determine region from coordinates if not passed
    effective_region = region
    if not effective_region:
        effective_region = "BLR" if latitude < 18.0 else "MP"

    # Match or find road
    road = None
    if road_id:
        road = db.query(Road).filter(Road.id == road_id).first()

    if not road:
        road = find_nearest_road(latitude, longitude, db, region=effective_region)

    final_region = road.region if road else effective_region
    road_type = road.road_type if road else "MDR"

    region_map = REGION_ROUTING.get(final_region, REGION_ROUTING["MP"])
    routing_info = region_map.get(road_type, region_map.get("MDR", AUTHORITY_ROUTING["MDR"]))

    # Add division detail if Bengaluru road
    routed_auth_text = routing_info["authority"]
    if final_region == "BLR" and road and road.bbmp_division:
        routed_auth_text = f"{routed_auth_text} ({road.bbmp_division} Division)"

    # Generate sequential tracking ID
    total_existing = db.query(Complaint).count()
    prefix = "RW-BLR" if final_region == "BLR" else "RW-2026"
    tracking_id = f"{prefix}-{(total_existing + 1):03d}"

    # Calculate SLA Deadline
    now_utc = datetime.now(timezone.utc)
    sla_hours = detection_res["sla_hours"]
    sla_deadline = now_utc + timedelta(hours=sla_hours)

    complaint = Complaint(
        region=final_region,
        tracking_id=tracking_id,
        road_id=road.id if road else None,
        damage_type=detection_res["primary_damage"],
        severity=detection_res["severity"],
        confidence=detection_res["confidence"],
        latitude=latitude,
        longitude=longitude,
        routed_authority=routed_auth_text,
        escalation_path=routing_info["escalation"],
        sla_deadline=sla_deadline,
        status="Open",
        evidence_image_url=detection_res["evidence_image_url"],
        created_at=now_utc
    )

    db.add(complaint)

    # Dynamically lower road health score if critical or high defect detected
    if road:
        penalty = 12.0 if detection_res["severity"] == "Critical" else (7.0 if detection_res["severity"] == "High" else 3.0)
        road.road_health_score = max(5.0, round(road.road_health_score - penalty, 1))

    db.commit()
    db.refresh(complaint)

    return {
        "success": True,
        "message": "AI Defect Analysis Complete & Official Complaint Filed",
        "complaint": complaint.to_dict(),
        "ai_detection": detection_res,
        "routing": {
            "region": final_region,
            "road_name": road.name if road else "Unmapped Local Road",
            "road_type": road_type,
            "contractor": road.contractor_name if road else "Municipal Road Wing",
            "executive_engineer": road.executive_engineer if road else None,
            "ee_contact": road.ee_contact if road else None,
            "routed_authority": routed_auth_text,
            "escalation_ladder": routing_info["escalation"]
        }
    }
