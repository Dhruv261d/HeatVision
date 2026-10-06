import logging
import torch
from ultralytics import YOLO

logger = logging.getLogger("HeatVision.PersonDetection")

# Conditional device allocation (cuda GPU if available, CPU fallback) (Issue #18)
device = 'cuda' if torch.cuda.is_available() else 'cpu'
logger.info(f"Initializing YOLOv8 detection model on target device: {device}")

# Load model weights (Issue #18)
model = YOLO('yolov8n.pt')
if hasattr(model, 'to'):
    model.to(device)

DEFAULT_CONFIDENCE = 0.05

def detect_people(frame, conf=DEFAULT_CONFIDENCE):
    """
    Performs YOLOv8 person detection (class 0) only.
    Tracking is handled separately by PersonTracker (Issue #23).
    """
    results = model.predict(
        frame,
        show=False,
        classes=[0],
        conf=conf,
        device=device,
        verbose=False
    )
    return results