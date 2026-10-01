import os
import sys
import json
import logging
import cv2
from .person_detection import detect_people
from .bottom_center import calculate_bottom_center
from .homography import apply_homography, parse_homography_matrix

# Setup logger for pipeline exception handling & crash recovery (Issue #17)
logger = logging.getLogger("HeatVision.VideoReader")
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

current_dir = os.path.dirname(os.path.abspath(__file__))
default_path = os.path.join(current_dir, '..', '..', '..', 'data', 'demo', 'demo 2.mp4')

def read_video(video_path=default_path, homography_matrix=None, show_preview=False):
    """
    Reads a video file frame-by-frame, performs YOLO object detection, foot-point calculation,
    3x3 homography perspective transformation (Issue #16), and outputs detection payloads
    with full exception handling and crash recovery (Issue #17).
    """
    logger.info(f"Initializing video processing stream for: {video_path}")
    
    if not os.path.exists(video_path):
        logger.error(f"Video file does not exist at path: {video_path}")
        return []

    try:
        vid_capture = cv2.VideoCapture(video_path)
    except Exception as e:
        logger.error(f"Failed to initialize VideoCapture for {video_path}: {e}")
        return []

    if not vid_capture.isOpened():
        logger.error(f"Unable to open video source: {video_path}")
        return []

    try:
        frame_width = int(vid_capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(vid_capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = vid_capture.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(vid_capture.get(cv2.CAP_PROP_FRAME_COUNT))
    except Exception as e:
        logger.warning(f"Failed to extract full video metadata: {e}")
        frame_width, frame_height, fps, total_frames = 1920, 1080, 30.0, 100

    logger.info(f"[Video Metadata]: {frame_width}x{frame_height} @ {fps:.2f} FPS | Total Frames: {total_frames}")
    
    H = parse_homography_matrix(homography_matrix)

    frame_count = 0
    detections_log = []

    try:
        while True:
            try:
                ret, frame = vid_capture.read()
                if not ret or frame is None:
                    logger.info("End of video stream or unreadable frame encountered.")
                    break

                frame_count += 1

                # Progress indicator for external process runner (Issue #13 & #17)
                if total_frames > 0 and frame_count % 10 == 0:
                    progress_pct = min(100, int((frame_count / total_frames) * 100))
                    progress_payload = json.dumps({
                        "type": "progress",
                        "frame": frame_count,
                        "totalFrames": total_frames,
                        "progress": progress_pct
                    })
                    print(f"[CV Progress]: {progress_payload}")
                    sys.stdout.flush()

                # Process every 2nd frame for 2x speed optimization
                if frame_count % 2 != 0:
                    continue

                # Run person detection with error recovery wrapper
                try:
                    tracks = detect_people(frame)
                except Exception as det_err:
                    logger.error(f"Error during detection on frame {frame_count}: {det_err}")
                    tracks = []

                frame_detections = []

                for track in tracks:
                    try:
                        boxes = track.boxes
                        for box in boxes:
                            confidence = float(box.conf[0].cpu().numpy())
                            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                            
                            # 1. Calculate ground foot-point coordinate
                            x_feet, y_feet = calculate_bottom_center(x1, x2, y1, y2)
                            
                            # 2. Apply 3x3 Homography transformation (Issue #16)
                            u_floor, v_floor = apply_homography((x_feet, y_feet), H)

                            track_id = int(box.id[0].cpu().numpy()) if hasattr(box, 'id') and box.id is not None else None

                            frame_detections.append({
                                'track_id': track_id,
                                'bbox': [float(x1), float(y1), float(x2), float(y2)],
                                'feet': [float(x_feet), float(y_feet)],
                                'floorplan_coords': [float(u_floor), float(v_floor)],
                                'confidence': round(confidence, 2)
                            })

                            if show_preview:
                                cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                                label = f"Person: {confidence:.2f}"
                                cv2.putText(frame, label, (int(x1), int(y1) - 10),
                                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                                cv2.circle(frame, (int(x_feet), int(y_feet)), 5, (0, 0, 255), -1)
                    except Exception as box_err:
                        logger.error(f"Error processing bounding box in frame {frame_count}: {box_err}")
                        continue

                detections_log.append({
                    'frame': frame_count,
                    'detections': frame_detections
                })

                if show_preview:
                    try:
                        cv2.imshow('HeatVision CV Pipeline', frame)
                        if cv2.waitKey(1) & 0xFF == ord('q'):
                            logger.info("User requested termination via preview window 'q' key.")
                            break
                    except Exception as gui_err:
                        logger.warning(f"GUI preview error (running headless): {gui_err}")
                        show_preview = False

            except Exception as frame_err:
                logger.error(f"Unhandled exception on frame {frame_count}: {frame_err}. Recovering to next frame.")
                continue

    except KeyboardInterrupt:
        logger.warning("Pipeline execution interrupted by user.")
    except Exception as pipeline_err:
        logger.critical(f"Critical error in video processing pipeline: {pipeline_err}")
    finally:
        logger.info("Cleaning up VideoCapture resources.")
        try:
            vid_capture.release()
            if show_preview:
                cv2.destroyAllWindows()
        except Exception as cleanup_err:
            logger.error(f"Error releasing video capture resources: {cleanup_err}")

    logger.info(f"Video processing finished. Processed {len(detections_log)} sampled frames.")
    return detections_log