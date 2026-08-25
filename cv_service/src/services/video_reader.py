import os
import cv2
from .person_detection import detect_people
from .bottom_center import calculate_bottom_center

current_dir = os.path.dirname(os.path.abspath(__file__))
default_path = os.path.join(current_dir, '..', '..', '..', 'data', 'dummy', 'dummy video 2.mp4')

def read_video(video_path=default_path):
    vid_capture = cv2.VideoCapture(video_path)
    
    if not vid_capture.isOpened():
        print(f"[CV Error]: Unable to open video source: {video_path}")
        return []

    frame_width = int(vid_capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(vid_capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = vid_capture.get(cv2.CAP_PROP_FPS)
    total_frames = int(vid_capture.get(cv2.CAP_PROP_FRAME_COUNT))

    print(f"[Video Metadata]: Resolution: {frame_width}x{frame_height} | FPS: {fps} | Total Frames: {total_frames}")

    frame_count = 0
    detections_log = []

    while True:
        ret, frame = vid_capture.read()
        if not ret:
            break

        frame_count += 1

        # Skip every other frame if 2x processing rate is desired
        if frame_count % 2 != 0:
            continue

        tracks = detect_people(frame)
        frame_detections = []

        for track in tracks:
            boxes = track.boxes
            for box in boxes:
                confidence = float(box.conf[0].cpu().numpy())
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                
                # Calculate ground foot-point coordinate
                x_feet, y_feet = calculate_bottom_center(x1, x2, y1, y2)
                
                frame_detections.append({
                    'bbox': [float(x1), float(y1), float(x2), float(y2)],
                    'feet': [float(x_feet), float(y_feet)],
                    'confidence': round(confidence, 2)
                })

                # Visual overlay: Draw bounding box
                cv2.rectangle(img=frame, pt1=(int(x1), int(y1)), pt2=(int(x2), int(y2)), color=(0, 255, 0), thickness=2)

                # Visual overlay: Draw labels safely (no \n)
                label = f"Person: {confidence:.2f}"
                cv2.putText(
                    img=frame,
                    text=label,
                    org=(int(x1), int(y1) - 10),
                    fontFace=cv2.FONT_HERSHEY_SIMPLEX,
                    fontScale=0.5,
                    color=(0, 255, 0),
                    thickness=2
                )

                # Visual overlay: Draw red foot point dot
                cv2.circle(img=frame, center=(int(x_feet), int(y_feet)), radius=5, color=(0, 0, 255), thickness=-1)

        detections_log.append({
            'frame': frame_count,
            'detections': frame_detections
        })

        cv2.imshow('HeatVision CV Pipeline', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    vid_capture.release()
    cv2.destroyAllWindows()
    
    return detections_log