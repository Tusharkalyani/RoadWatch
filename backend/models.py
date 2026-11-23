from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from backend.database import Base

class Road(Base):
    __tablename__ = "roads"

    id = Column(Integer, primary_key=True, index=True)
    region = Column(String(32), default="MP", index=True) # "MP" (Kothri Kalan / Sehore) or "BLR" (Bengaluru)
    osm_way_id = Column(String(64), index=True, nullable=True)
    name = Column(String(255), nullable=False)
    road_type = Column(String(10), nullable=False)  # 'NH', 'SH', 'MDR'
    road_ref = Column(String(32), nullable=True)    # e.g. 'NH48', 'SH35'
    length_km = Column(Float, default=0.0)
    bbmp_division = Column(String(64), nullable=True) # e.g. 'East', 'South', 'Mahadevapura'
    coordinates = Column(JSON, nullable=False)  # [[lat, lng], [lat, lng], ...]
    last_repaired_date = Column(String(32), nullable=True)
    contractor_name = Column(String(255), nullable=False)
    
    # Engineer Directory & Accountability
    executive_engineer = Column(String(128), nullable=True)
    ee_contact = Column(String(32), nullable=True)
    asst_exec_engineer = Column(String(128), nullable=True)
    aee_contact = Column(String(32), nullable=True)
    asst_engineer = Column(String(128), nullable=True)
    ae_contact = Column(String(32), nullable=True)

    # Defect Liability Period (DLP)
    completion_date = Column(String(32), nullable=True)
    dlp_period = Column(String(32), nullable=True)
    dlp_expiry_date = Column(String(32), nullable=True)

    # 3-Level Budget Figures (In Lakhs INR)
    budget_sanctioned = Column(Float, nullable=False, default=0.0)  # In Lakhs INR
    budget_released = Column(Float, nullable=False, default=0.0)    # In Lakhs INR
    budget_spent = Column(Float, nullable=False, default=0.0)       # In Lakhs INR
    budget_unspent = Column(Float, nullable=False, default=0.0)     # In Lakhs INR
    road_health_score = Column(Float, nullable=False, default=100.0) # 0 to 100

    complaints = relationship("Complaint", back_populates="road", cascade="all, delete-orphan")

    def to_dict(self):
        open_complaints_count = sum(1 for c in self.complaints if c.status != "Resolved") if self.complaints else 0
        return {
            "id": self.id,
            "region": self.region,
            "osm_way_id": self.osm_way_id,
            "name": self.name,
            "road_type": self.road_type,
            "road_ref": self.road_ref,
            "length_km": round(self.length_km, 2) if self.length_km else None,
            "bbmp_division": self.bbmp_division,
            "coordinates": self.coordinates,
            "last_repaired_date": self.last_repaired_date,
            "contractor_name": self.contractor_name,
            "executive_engineer": self.executive_engineer,
            "ee_contact": self.ee_contact,
            "asst_exec_engineer": self.asst_exec_engineer,
            "aee_contact": self.aee_contact,
            "asst_engineer": self.asst_engineer,
            "ae_contact": self.ae_contact,
            "completion_date": self.completion_date,
            "dlp_period": self.dlp_period,
            "dlp_expiry_date": self.dlp_expiry_date,
            "budget_sanctioned": round(self.budget_sanctioned, 2),
            "budget_released": round(self.budget_released, 2),
            "budget_spent": round(self.budget_spent, 2),
            "budget_unspent": round(self.budget_unspent, 2),
            "road_health_score": round(self.road_health_score, 1),
            "open_complaints_count": open_complaints_count,
            "total_complaints_count": len(self.complaints) if self.complaints else 0,
        }

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    region = Column(String(32), default="MP", index=True) # "MP" or "BLR"
    tracking_id = Column(String(32), unique=True, index=True, nullable=False)
    road_id = Column(Integer, ForeignKey("roads.id"), nullable=True)
    damage_type = Column(String(64), nullable=False)  # 'Pothole', 'Crack', 'Waterlogging', 'Missing Signage', 'Road Cave-in'
    severity = Column(String(16), nullable=False)     # 'Low', 'Medium', 'High', 'Critical'
    confidence = Column(Float, nullable=False, default=0.85)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    routed_authority = Column(String(255), nullable=False)
    escalation_path = Column(String(255), nullable=False)
    sla_deadline = Column(DateTime, nullable=False)
    status = Column(String(32), nullable=False, default="Open")  # 'Open', 'In Progress', 'Resolved'
    evidence_image_url = Column(String(512), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    road = relationship("Road", back_populates="complaints")

    def to_dict(self):
        return {
            "id": self.id,
            "region": self.region,
            "tracking_id": self.tracking_id,
            "road_id": self.road_id,
            "road_name": self.road.name if self.road else "Unmapped Local Sector",
            "road_type": self.road.road_type if self.road else "MDR",
            "bbmp_division": self.road.bbmp_division if self.road else None,
            "damage_type": self.damage_type,
            "severity": self.severity,
            "confidence": round(self.confidence, 3),
            "latitude": self.latitude,
            "longitude": self.longitude,
            "routed_authority": self.routed_authority,
            "escalation_path": self.escalation_path,
            "sla_deadline": self.sla_deadline.isoformat() if self.sla_deadline else None,
            "status": self.status,
            "evidence_image_url": self.evidence_image_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
