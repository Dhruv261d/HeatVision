import logging
import torch
from ultralytics import YOLO

import os
logger = logging.getLogger("HeatVision.PersonDetection")

# Conditional device allocation (cuda GPU if available, CPU fallback) (Issue #18)
device = 'cuda' if torch.cuda.is_available() else 'cpu'
logger.info(f"Initializing YOLOv8 detection model on target device: {device}")

# Locate existing model weights in cv_service if available (Issue #18)
curr_dir = os.path.dirname(os.path.abspath(__file__))
local_model_path = os.path.normpath(os.path.join(curr_dir, '..', '..', 'yolov8n.pt'))
model_weight = local_model_path if os.path.exists(local_model_path) else 'yolov8n.pt'

# Load model weights
model = YOLO(model_weight)
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