import os
import sys
import re
import csv
import random
from datetime import datetime, timedelta, timezone

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from PIL import Image, ImageDraw
from backend.database import SessionLocal, engine, Base
from backend.models import Road, Complaint
from backend.ai_detector import EVIDENCE_DIR, draw_damage_annotations

# Regional Jurisdiction Routing Map
REGION_ROUTING = {
    "MP": {
        "NH": {
            "authority": "NHAI Regional Office, Bhopal",
            "escalation": "NHAI HQ (New Delhi) -> Ministry of Road Transport & Highways (MoRTH)"
        },
        "SH": {
            "authority": "MP State PWD Executive Engineer, Sehore Division",
            "escalation": "PWD Chief Engineer (Zone-1) -> MP State PWD Secretariat"
        },
        "MDR": {
            "authority": "District Collector / Rural Road Engineering Services (RES), Sehore",
            "escalation": "District Magistrate -> Panchayat & Rural Development Dept"
        }
    },
    "BLR": {
        "NH": {
            "authority": "NHAI Project Implementation Unit (PIU), Bengaluru",
            "escalation": "NHAI Regional Officer, Karnataka -> NHAI HQ (New Delhi) / MoRTH"
        },
        "SH": {
            "authority": "Karnataka State Highway Improvement Project (KSHIP) / PWD Bengaluru",
            "escalation": "Chief Engineer (C&B South) -> PWD Principal Secretary, GoK"
        },
        "MDR": {
            "authority": "BBMP Road Infrastructure Cell, Bengaluru",
            "escalation": "Executive Engineer -> Chief Engineer (Roads) -> BBMP Chief Commissioner"
        }
    }
}

# Backward compatibility alias
AUTHORITY_ROUTING = REGION_ROUTING["MP"]

def create_sample_evidence_image(filename: str, damage_type: str, severity: str, sla_hours: int, box: list) -> str:
    """
    Generates a realistic synthetic road surface image with defects and draws
    the bounding box and HUD annotations.
    """
    os.makedirs(EVIDENCE_DIR, exist_ok=True)
    file_path = os.path.join(EVIDENCE_DIR, filename)
    if os.path.exists(file_path):
        return f"/static/evidence/{filename}"

    w, h = 640, 480
    img = Image.new("RGB", (w, h), color=(50, 52, 58))
    draw = ImageDraw.Draw(img)

    for _ in range(1200):
        rx = random.randint(0, w - 1)
        ry = random.randint(0, h - 1)
        gray = random.randint(35, 75)
        draw.point((rx, ry), fill=(gray, gray, gray))

    # Center lane line
    draw.line([w // 2, 0, w // 2, h], fill=(220, 200, 50), width=6)

    bx1, by1, bx2, by2 = box
    if damage_type == "Pothole":
        draw.ellipse([bx1, by1, bx2, by2], fill=(25, 25, 25), outline=(15, 15, 15), width=3)
    elif damage_type == "Crack":
        points = [(bx1, by1), (bx1 + 40, by1 + 60), (bx2 - 30, by2 - 40), (bx2, by2)]
        draw.line(points, fill=(20, 20, 20), width=4)
    elif damage_type == "Waterlogging":
        draw.ellipse([bx1, by1, bx2, by2], fill=(45, 75, 95), outline=(30, 55, 75), width=3)
    elif damage_type == "Road Cave-in":
        draw.ellipse([bx1, by1, bx2, by2], fill=(15, 12, 10), outline=(5, 5, 5), width=5)
    elif damage_type == "Missing Signage":
        draw.rectangle([bx1 + 20, by1 + 40, bx1 + 35, by2], fill=(120, 120, 120))
        draw.rectangle([bx1, by1, bx2, by1 + 40], outline=(200, 50, 50), width=3)

    detections = [{
        "class": damage_type,
        "confidence": 0.92,
        "box": box,
        "area_percentage": round((bx2 - bx1) * (by2 - by1) / (w * h) * 100, 2),
        "severity": severity,
        "sla_hours": sla_hours
    }]

    annotated = draw_damage_annotations(img, detections)
    annotated.save(file_path, "JPEG", quality=90)
    return f"/static/evidence/{filename}"

def seed_database():
    """
    Initializes tables and populates:
    1. Kothri Kalan / Sehore (MP) baseline roads & historical complaints.
    2. Bengaluru Metropolitan Master Roads (from bengaluru_roads_master.csv)
       with real engineers, contractor names, DLP dates, and 3-level budgets.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded with both regions
        has_mp = db.query(Road).filter(Road.region == "MP").count() > 0
        has_blr = db.query(Road).filter(Road.region == "BLR").count() > 0

        if has_mp and has_blr:
            print("[RoadWatch DB] Database already contains MP and Bengaluru road records. Skipping seed.")
            return

        # 1. Seed Kothri Kalan & Sehore (MP) Roads
        if not has_mp:
            print("[RoadWatch DB] Seeding 5 realistic roads around Kothri Kalan / Sehore (MP)...")
            mp_roads_data = [
                {
                    "region": "MP",
                    "osm_way_id": "OSM-WAY-948201",
                    "name": "NH-46 (Sehore Bypass - Kothri Toll Corridor)",
                    "road_type": "NH",
                    "road_ref": "NH46",
                    "length_km": 12.4,
                    "bbmp_division": "Sehore Division",
                    "coordinates": [
                        [23.0950, 76.8120],
                        [23.0880, 76.8320],
                        [23.0780, 76.8520],
                        [23.0690, 76.8720],
                        [23.0580, 76.8950]
                    ],
                    "last_repaired_date": "15.08.2025",
                    "contractor_name": "M/s Dilip Buildcon Ltd. (NHAI EPC Division)",
                    "executive_engineer": "R.K. Sharma",
                    "ee_contact": "+91 94251 01001",
                    "asst_exec_engineer": "Vikram Verma",
                    "aee_contact": "+91 94251 01002",
                    "asst_engineer": "Alok Mishra",
                    "ae_contact": "+91 94251 01003",
                    "completion_date": "15.08.2023",
                    "dlp_period": "5 Years",
                    "dlp_expiry_date": "14.08.2028",
                    "budget_sanctioned": 1450.0,  # Lakhs (₹ 14.50 Cr)
                    "budget_released": 1450.0,
                    "budget_spent": 1385.0,
                    "budget_unspent": 65.0,
                    "road_health_score": 86.5
                },
                {
                    "region": "MP",
                    "osm_way_id": "OSM-WAY-741290",
                    "name": "SH-18 (Sehore - Ashta State Corridor)",
                    "road_type": "SH",
                    "road_ref": "SH18",
                    "length_km": 8.7,
                    "bbmp_division": "Sehore PWD Sub-Division",
                    "coordinates": [
                        [23.1020, 76.8400],
                        [23.0890, 76.8460],
                        [23.0750, 76.8550],
                        [23.0610, 76.8620],
                        [23.0450, 76.8710]
                    ],
                    "last_repaired_date": "20.11.2024",
                    "contractor_name": "Singhai Infrastructure & Highways Ltd.",
                    "executive_engineer": "P.N. Trivedi",
                    "ee_contact": "+91 94252 02001",
                    "asst_exec_engineer": "Sanjay Solanki",
                    "aee_contact": "+91 94252 02002",
                    "asst_engineer": "Pooja Chawla",
                    "ae_contact": "+91 94252 02003",
                    "completion_date": "20.11.2022",
                    "dlp_period": "3 Years",
                    "dlp_expiry_date": "19.11.2025",
                    "budget_sanctioned": 820.0,   # Lakhs (₹ 8.20 Cr)
                    "budget_released": 820.0,
                    "budget_spent": 795.0,
                    "budget_unspent": 25.0,
                    "road_health_score": 58.0
                },
                {
                    "region": "MP",
                    "osm_way_id": "OSM-WAY-512034",
                    "name": "MDR-12 (Sehore City - Kothri Kalan Link)",
                    "road_type": "MDR",
                    "road_ref": "MDR12",
                    "length_km": 6.2,
                    "bbmp_division": "Sehore Rural Works",
                    "coordinates": [
                        [23.0850, 76.8280],
                        [23.0810, 76.8410],
                        [23.0760, 76.8530],
                        [23.0720, 76.8640],
                        [23.0670, 76.8760]
                    ],
                    "last_repaired_date": "10.04.2023",
                    "contractor_name": "Malwa Tollway & PWD Infra Corp",
                    "executive_engineer": "Dinesh Malviya",
                    "ee_contact": "+91 94253 03001",
                    "asst_exec_engineer": "Kamal Rajput",
                    "aee_contact": "+91 94253 03002",
                    "asst_engineer": "Sunil Patidar",
                    "ae_contact": "+91 94253 03003",
                    "completion_date": "10.04.2020",
                    "dlp_period": "3 Years",
                    "dlp_expiry_date": "09.04.2023",
                    "budget_sanctioned": 480.0,   # Lakhs (₹ 4.80 Cr)
                    "budget_released": 535.0,     # Released exceeds Sanctioned!
                    "budget_spent": 510.0,
                    "budget_unspent": 25.0,
                    "road_health_score": 32.5     # Poor
                },
                {
                    "region": "MP",
                    "osm_way_id": "OSM-WAY-320911",
                    "name": "Campus Approach Road (Kothri NH Junction to Campus Gate 1)",
                    "road_type": "MDR",
                    "road_ref": "LOCAL-01",
                    "length_km": 2.5,
                    "bbmp_division": "Kothri Gram Panchayat",
                    "coordinates": [
                        [23.0795, 76.8490],
                        [23.0775, 76.8515],
                        [23.0750, 76.8540],
                        [23.0730, 76.8570],
                        [23.0705, 76.8610]
                    ],
                    "last_repaired_date": "30.06.2024",
                    "contractor_name": "Sehore Rural Engineering Services (RES / PWD)",
                    "executive_engineer": "Manish Gour",
                    "ee_contact": "+91 94254 04001",
                    "asst_exec_engineer": "Abhishek Jain",
                    "aee_contact": "+91 94254 04002",
                    "asst_engineer": "Rohit Meena",
                    "ae_contact": "+91 94254 04003",
                    "completion_date": "30.06.2023",
                    "dlp_period": "3 Years",
                    "dlp_expiry_date": "29.06.2026",
                    "budget_sanctioned": 240.0,   # Lakhs (₹ 2.40 Cr)
                    "budget_released": 240.0,
                    "budget_spent": 232.0,
                    "budget_unspent": 8.0,
                    "road_health_score": 45.0
                },
                {
                    "region": "MP",
                    "osm_way_id": "OSM-WAY-109842",
                    "name": "Kothri - Bilkisganj Rural Feeder Route",
                    "road_type": "MDR",
                    "road_ref": "RURAL-05",
                    "length_km": 5.8,
                    "bbmp_division": "Bilkisganj Sub-Division",
                    "coordinates": [
                        [23.0710, 76.8530],
                        [23.0620, 76.8560],
                        [23.0530, 76.8600],
                        [23.0440, 76.8650],
                        [23.0350, 76.8720]
                    ],
                    "last_repaired_date": "14.10.2022",
                    "contractor_name": "Panchayat Gramin Sadak Nirman Sangh",
                    "executive_engineer": "H.S. Raghuvanshi",
                    "ee_contact": "+91 94255 05001",
                    "asst_exec_engineer": "Pramod Soni",
                    "aee_contact": "+91 94255 05002",
                    "asst_engineer": "Gopal Yadav",
                    "ae_contact": "+91 94255 05003",
                    "completion_date": "14.10.2021",
                    "dlp_period": "3 Years",
                    "dlp_expiry_date": "13.10.2024",
                    "budget_sanctioned": 190.0,   # Lakhs (₹ 1.90 Cr)
                    "budget_released": 160.0,
                    "budget_spent": 110.0,
                    "budget_unspent": 50.0,
                    "road_health_score": 36.0
                }
            ]

            created_mp_roads = []
            for rdata in mp_roads_data:
                road = Road(**rdata)
                db.add(road)
                db.flush()
                created_mp_roads.append(road)

            # Seed 6 Historical Complaints for MP
            now = datetime.now(timezone.utc)
            mp_complaints = [
                {
                    "region": "MP",
                    "tracking_id": "RW-2026-001",
                    "road_id": created_mp_roads[2].id,  # MDR-12
                    "damage_type": "Road Cave-in",
                    "severity": "Critical",
                    "confidence": 0.94,
                    "latitude": 23.0760,
                    "longitude": 76.8530,
                    "routed_authority": REGION_ROUTING["MP"]["MDR"]["authority"],
                    "escalation_path": REGION_ROUTING["MP"]["MDR"]["escalation"],
                    "sla_deadline": now + timedelta(hours=48),
                    "status": "Open",
                    "img_filename": "seed_cavein_001.jpg",
                    "box": [140, 200, 480, 420]
                },
                {
                    "region": "MP",
                    "tracking_id": "RW-2026-002",
                    "road_id": created_mp_roads[3].id,  # Campus Approach
                    "damage_type": "Pothole",
                    "severity": "High",
                    "confidence": 0.91,
                    "latitude": 23.0775,
                    "longitude": 76.8515,
                    "routed_authority": REGION_ROUTING["MP"]["MDR"]["authority"],
                    "escalation_path": REGION_ROUTING["MP"]["MDR"]["escalation"],
                    "sla_deadline": now + timedelta(days=7),
                    "status": "In Progress",
                    "img_filename": "seed_pothole_002.jpg",
                    "box": [180, 240, 420, 380]
                },
                {
                    "region": "MP",
                    "tracking_id": "RW-2026-003",
                    "road_id": created_mp_roads[1].id,  # SH-18
                    "damage_type": "Waterlogging",
                    "severity": "High",
                    "confidence": 0.89,
                    "latitude": 23.0890,
                    "longitude": 76.8460,
                    "routed_authority": REGION_ROUTING["MP"]["SH"]["authority"],
                    "escalation_path": REGION_ROUTING["MP"]["SH"]["escalation"],
                    "sla_deadline": now + timedelta(days=7),
                    "status": "Open",
                    "img_filename": "seed_water_003.jpg",
                    "box": [120, 220, 500, 400]
                },
                {
                    "region": "MP",
                    "tracking_id": "RW-2026-004",
                    "road_id": created_mp_roads[0].id,  # NH-46
                    "damage_type": "Crack",
                    "severity": "Medium",
                    "confidence": 0.86,
                    "latitude": 23.0780,
                    "longitude": 76.8520,
                    "routed_authority": REGION_ROUTING["MP"]["NH"]["authority"],
                    "escalation_path": REGION_ROUTING["MP"]["NH"]["escalation"],
                    "sla_deadline": now + timedelta(days=15),
                    "status": "In Progress",
                    "img_filename": "seed_crack_004.jpg",
                    "box": [160, 180, 460, 320]
                },
                {
                    "region": "MP",
                    "tracking_id": "RW-2026-005",
                    "road_id": created_mp_roads[2].id,  # MDR-12
                    "damage_type": "Missing Signage",
                    "severity": "Medium",
                    "confidence": 0.88,
                    "latitude": 23.0810,
                    "longitude": 76.8410,
                    "routed_authority": REGION_ROUTING["MP"]["MDR"]["authority"],
                    "escalation_path": REGION_ROUTING["MP"]["MDR"]["escalation"],
                    "sla_deadline": now + timedelta(days=15),
                    "status": "Resolved",
                    "img_filename": "seed_sign_005.jpg",
                    "box": [380, 80, 560, 310]
                },
                {
                    "region": "MP",
                    "tracking_id": "RW-2026-006",
                    "road_id": created_mp_roads[4].id,  # Rural Feeder
                    "damage_type": "Pothole",
                    "severity": "Low",
                    "confidence": 0.83,
                    "latitude": 23.0620,
                    "longitude": 76.8560,
                    "routed_authority": REGION_ROUTING["MP"]["MDR"]["authority"],
                    "escalation_path": REGION_ROUTING["MP"]["MDR"]["escalation"],
                    "sla_deadline": now + timedelta(days=30),
                    "status": "Open",
                    "img_filename": "seed_pothole_006.jpg",
                    "box": [220, 280, 360, 360]
                }
            ]

            for cdata in mp_complaints:
                sla_hours = 48 if cdata["severity"] == "Critical" else (168 if cdata["severity"] == "High" else (360 if cdata["severity"] == "Medium" else 720))
                img_url = create_sample_evidence_image(
                    filename=cdata["img_filename"],
                    damage_type=cdata["damage_type"],
                    severity=cdata["severity"],
                    sla_hours=sla_hours,
                    box=cdata["box"]
                )

                complaint = Complaint(
                    region="MP",
                    tracking_id=cdata["tracking_id"],
                    road_id=cdata["road_id"],
                    damage_type=cdata["damage_type"],
                    severity=cdata["severity"],
                    confidence=cdata["confidence"],
                    latitude=cdata["latitude"],
                    longitude=cdata["longitude"],
                    routed_authority=cdata["routed_authority"],
                    escalation_path=cdata["escalation_path"],
                    sla_deadline=cdata["sla_deadline"],
                    status=cdata["status"],
                    evidence_image_url=img_url,
                    created_at=now - timedelta(days=random.randint(1, 10))
                )
                db.add(complaint)

            print(f"[RoadWatch DB] Successfully inserted 5 MP roads and 6 complaints.")

        # 2. Seed Bengaluru Roads from bengaluru_roads_master.csv
        csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "bengaluru_roads_master.csv")
        if not has_blr and os.path.exists(csv_path):
            print(f"[RoadWatch DB] Ingesting Bengaluru Roads Master from {csv_path}...")
            blr_roads_to_create = []

            with open(csv_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    wkt = row.get("geometry", "").strip()
                    m = re.search(r"\((.*)\)", wkt)
                    if not m:
                        continue

                    coords = []
                    for pair in m.group(1).split(","):
                        parts = pair.strip().split()
                        if len(parts) >= 2:
                            coords.append([float(parts[1]), float(parts[0])])

                    if not coords:
                        continue

                    # Convert raw budget into Lakhs (INR)
                    sanctioned_raw = float(row.get("budget_sanctioned", 0) or 0)
                    released_raw = float(row.get("budget_released", 0) or 0)
                    spent_raw = float(row.get("budget_spent", 0) or 0)
                    unspent_raw = float(row.get("budget_unspent", 0) or 0)

                    sanctioned_lakhs = round(sanctioned_raw / 100000.0, 2)
                    released_lakhs = round(released_raw / 100000.0, 2)
                    spent_lakhs = round(spent_raw / 100000.0, 2)
                    unspent_lakhs = round(unspent_raw / 100000.0, 2)

                    health_score = float(row.get("health_score", 65.0) or 65.0)
                    length_km = float(row.get("length_km", 1.0) or 1.0)

                    b_road = Road(
                        region="BLR",
                        osm_way_id=row.get("road_id") or row.get("osm_id") or f"BLR-{random.randint(1000, 9999)}",
                        name=row.get("road_name") or "Bengaluru Urban Corridor",
                        road_type=row.get("road_type", "MDR"),
                        road_ref=row.get("road_ref") or None,
                        length_km=length_km,
                        bbmp_division=row.get("bbmp_division") or "East",
                        coordinates=coords,
                        last_repaired_date=row.get("completion_date") or "01.01.2023",
                        contractor_name=row.get("contractor_name") or "BBMP Empanelled Contractor",
                        executive_engineer=row.get("executive_engineer") or "Executive Engineer (BBMP)",
                        ee_contact=row.get("ee_contact") or "+91 98451 00000",
                        asst_exec_engineer=row.get("asst_exec_engineer") or "Asst. Exec. Engineer (BBMP)",
                        aee_contact=row.get("aee_contact") or "+91 98451 00005",
                        asst_engineer=row.get("asst_engineer") or "Asst. Engineer (BBMP)",
                        ae_contact=row.get("ae_contact") or "+91 98451 00004",
                        completion_date=row.get("completion_date") or None,
                        dlp_period=row.get("dlp_period") or "3 Years",
                        dlp_expiry_date=row.get("dlp_expiry_date") or None,
                        budget_sanctioned=sanctioned_lakhs,
                        budget_released=released_lakhs,
                        budget_spent=spent_lakhs,
                        budget_unspent=unspent_lakhs,
                        road_health_score=health_score
                    )
                    blr_roads_to_create.append(b_road)

            db.add_all(blr_roads_to_create)
            db.flush()
            print(f"[RoadWatch DB] Successfully ingested {len(blr_roads_to_create)} Bengaluru roads.")

            # Seed 5 Historical Complaints on Key Bengaluru Corridors
            now = datetime.now(timezone.utc)
            sample_blr_roads = blr_roads_to_create[:10]
            if sample_blr_roads:
                blr_complaints_data = [
                    {
                        "road": sample_blr_roads[0], # e.g. NICE Road
                        "damage_type": "Road Cave-in",
                        "severity": "Critical",
                        "conf": 0.95,
                        "filename": "blr_cavein_01.jpg",
                        "box": [130, 190, 490, 410]
                    },
                    {
                        "road": sample_blr_roads[1] if len(sample_blr_roads) > 1 else sample_blr_roads[0],
                        "damage_type": "Pothole",
                        "severity": "High",
                        "conf": 0.92,
                        "filename": "blr_pothole_02.jpg",
                        "box": [170, 220, 430, 370]
                    },
                    {
                        "road": sample_blr_roads[4] if len(sample_blr_roads) > 4 else sample_blr_roads[0],
                        "damage_type": "Crack",
                        "severity": "Medium",
                        "conf": 0.88,
                        "filename": "blr_crack_03.jpg",
                        "box": [150, 160, 470, 310]
                    },
                    {
                        "road": sample_blr_roads[3] if len(sample_blr_roads) > 3 else sample_blr_roads[0],
                        "damage_type": "Waterlogging",
                        "severity": "High",
                        "conf": 0.90,
                        "filename": "blr_water_04.jpg",
                        "box": [110, 210, 510, 390]
                    }
                ]

                total_existing = db.query(Complaint).count()
                for idx, citem in enumerate(blr_complaints_data):
                    rd = citem["road"]
                    c_pt = rd.coordinates[len(rd.coordinates) // 2] if rd.coordinates else [12.9716, 77.5946]
                    sla_h = 48 if citem["severity"] == "Critical" else (168 if citem["severity"] == "High" else 360)

                    img_url = create_sample_evidence_image(
                        filename=citem["filename"],
                        damage_type=citem["damage_type"],
                        severity=citem["severity"],
                        sla_hours=sla_h,
                        box=citem["box"]
                    )

                    r_type = rd.road_type if rd.road_type in REGION_ROUTING["BLR"] else "MDR"
                    routing = REGION_ROUTING["BLR"][r_type]

                    bc = Complaint(
                        region="BLR",
                        tracking_id=f"RW-BLR-{(idx + 1):03d}",
                        road_id=rd.id,
                        damage_type=citem["damage_type"],
                        severity=citem["severity"],
                        confidence=citem["conf"],
                        latitude=c_pt[0],
                        longitude=c_pt[1],
                        routed_authority=f"{routing['authority']} ({rd.bbmp_division or 'City'} Div)",
                        escalation_path=routing["escalation"],
                        sla_deadline=now + timedelta(hours=sla_h),
                        status="Open" if idx < 2 else "In Progress",
                        evidence_image_url=img_url,
                        created_at=now - timedelta(days=idx + 1)
                    )
                    db.add(bc)

                print(f"[RoadWatch DB] Successfully seeded {len(blr_complaints_data)} complaints for Bengaluru corridors.")

        db.commit()
        print("[RoadWatch DB] Database seeding completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"[RoadWatch DB Error] Failed to seed database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
