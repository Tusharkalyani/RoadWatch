import os
import io
from typing import Union, Dict, Any, List
from PIL import Image

# Dynamic paths for weights
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_WEIGHTS_PATH = os.path.join(CURRENT_DIR, "weights", "best.pt")
FALLBACK_WEIGHTS_PATH = os.path.join(CURRENT_DIR, "weights", "last.pt")
ROOT_MODELS_PATH = os.path.join(os.path.dirname(os.path.dirname(CURRENT_DIR)), "models", "roadwatch_yolov8.pt")

_model = None

def get_model(weights_path: str = None):
    """
    Lazy-loader for the trained RoadWatch YOLOv8 model.
    Prioritizes backend/ml/weights/best.pt, then models/roadwatch_yolov8.pt, then last.pt.
    """
    global _model
    if _model is not None and weights_path is None:
        return _model

    from ultralytics import YOLO

    chosen_path = weights_path
    if not chosen_path:
        if os.path.exists(DEFAULT_WEIGHTS_PATH):
            chosen_path = DEFAULT_WEIGHTS_PATH
        elif os.path.exists(ROOT_MODELS_PATH):
            chosen_path = ROOT_MODELS_PATH
        elif os.path.exists(FALLBACK_WEIGHTS_PATH):
            chosen_path = FALLBACK_WEIGHTS_PATH
        else:
            chosen_path = "yolov8n.pt"

    print(f"[RoadWatch ML] Initializing YOLOv8 model from: {chosen_path}")
    _model = YOLO(chosen_path)
    return _model

# Classes configuration
IGNORE_CLASSES = ["road_marking_blur"]

CLASS_BASE_SEVERITY = {
    "pothole"            : 3,
    "alligator_crack"    : 2,
    "transverse_crack"   : 1,
    "longitudinal_crack" : 1,
}

SEVERITY_MAP = {
    1: "Low",
    2: "Medium",
    3: "High",
    4: "Critical"
}

SLA_MAP = {
    "Low"      : "30 days",
    "Medium"   : "15 days",
    "High"     : "7 days",
    "Critical" : "48 hours"
}

SLA_HOURS_MAP = {
    "Low"      : 720,
    "Medium"   : 360,
    "High"     : 168,
    "Critical" : 48
}

AUTHORITY_MAP = {
    "Low"      : "Assistant Engineer",
    "Medium"   : "Assistant Executive Engineer",
    "High"     : "Executive Engineer",
    "Critical" : "Senior Authority — Immediate Escalation"
}

def calculate_severity(class_name: str, confidence: float, box_area_ratio: float) -> str:
    """
    Calculates severity level (1-4) based on damage class, bounding-box size ratio, and model confidence.
    """
    base = CLASS_BASE_SEVERITY.get(class_name, 1)

    if box_area_ratio > 0.15:
        base += 1

    if confidence > 0.80:
        base += 1

    return SEVERITY_MAP[min(base, 4)]

def analyze_image(image_input: Union[bytes, str, Image.Image], conf_threshold: float = 0.25) -> Dict[str, Any]:
    """
    Analyzes an image using the trained RoadWatch YOLOv8 weights.
    Accepts raw bytes, file path string, or PIL Image.
    Returns structured detection summary and list of bounding-box defects.
    """
    if isinstance(image_input, bytes):
        image = Image.open(io.BytesIO(image_input)).convert("RGB")
    elif isinstance(image_input, str):
        image = Image.open(image_input).convert("RGB")
    elif isinstance(image_input, Image.Image):
        image = image_input.convert("RGB")
    else:
        raise ValueError(f"Unsupported image input type: {type(image_input)}")

    img_area = max(1, image.width * image.height)
    model = get_model()

    results = model.predict(source=image, conf=conf_threshold, verbose=False)
    detections = []

    for result in results:
        for box in result.boxes:
            class_id   = int(box.cls)
            confidence = float(box.conf)
            class_name = model.names[class_id]

            # Skip ignored classes
            if class_name in IGNORE_CLASSES:
                continue

            x1, y1, x2, y2 = box.xyxy[0].tolist()
            box_area = max(1.0, (x2 - x1) * (y2 - y1))
            box_area_ratio = box_area / img_area

            severity = calculate_severity(class_name, confidence, box_area_ratio)

            # Map to canonical RoadWatch defect type
            canonical_class = "Crack" if "crack" in class_name else ("Pothole" if "pothole" in class_name else class_name.replace("_", " ").title())

            detections.append({
                "damage_type"    : canonical_class,
                "subtype"        : class_name.replace("_", " ").title(),
                "confidence"     : round(confidence * 100, 1),
                "confidence_raw" : round(confidence, 3),
                "severity"       : severity,
                "sla"            : SLA_MAP[severity],
                "sla_hours"      : SLA_HOURS_MAP[severity],
                "route_to"       : AUTHORITY_MAP[severity],
                "area_pct"       : round(box_area_ratio * 100, 2),
                "bbox"           : [round(x1), round(y1), round(x2), round(y2)],
            })

    if not detections:
        return {
            "status"           : "no_damage_detected",
            "total_detections" : 0,
            "worst_severity"   : None,
            "sla"              : None,
            "sla_hours"        : None,
            "route_to"         : None,
            "detections"       : []
        }

    severity_order = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
    worst = max(detections, key=lambda x: (severity_order.get(x["severity"], 1), x["area_pct"]))

    return {
        "status"           : "damage_detected",
        "total_detections" : len(detections),
        "primary_damage"   : worst["damage_type"],
        "subtype"          : worst["subtype"],
        "worst_severity"   : worst["severity"],
        "confidence"       : worst["confidence_raw"],
        "sla"              : worst["sla"],
        "sla_hours"        : worst["sla_hours"],
        "route_to"         : worst["route_to"],
        "detections"       : detections
    }

if __name__ == "__main__":
    import sys
    print("RoadWatch ML Analyzer CLI")
    m = get_model()
    print("Loaded Model:", m.model_name or "YOLOv8")
    print("Class mapping:", m.names)
    if len(sys.argv) > 1:
        test_path = sys.argv[1]
        print(f"Testing on image: {test_path}")
        res = analyze_image(test_path)
        print("Analysis Result:")
        import json
        print(json.dumps(res, indent=2))