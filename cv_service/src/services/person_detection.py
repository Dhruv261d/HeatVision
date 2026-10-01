from ultralytics import YOLO

# Load model once at module initialization
model = YOLO('yolov8n.pt')

def detect_people(frame):
    # Filter strictly for person class (classes=[0]) with tracking persistent state
    tracks = model.track(frame, persist=True, show=False, classes=[0], conf=0.05, verbose=False)
    return tracks