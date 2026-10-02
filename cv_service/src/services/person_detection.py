from ultralytics import YOLO

# Load model once at module initialization
model = YOLO('yolov8n.pt')

# Confidence threshold
CONFIDENCE_THRESHOLD = 0.05


def detect_people(frame):
    # Filter strictly for person class (classes=[0])
    # with tracking persistent state
    tracks = model.track(
        frame,
        persist=True,
        show=False,
        classes=[0],
        conf=CONFIDENCE_THRESHOLD,
        verbose=False
    )

    return tracks