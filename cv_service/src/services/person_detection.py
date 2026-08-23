# pyrefly: ignore [missing-import]
from ultralytics import YOLO
model = YOLO('yolov8n.pt')

def detect_people(frame):
    tracks = model.track(frame, persist=True, show=False, classes=[0], conf=0.05,verbose=False)
    return tracks