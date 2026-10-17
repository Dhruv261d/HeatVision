import os
import sys
import json
import logging
import base64
import cv2
import numpy as np
from .person_detection import detect_people
from .tracker import PersonTracker
from .trajectory import TrajectoryManager
from .bottom_center import calculate_bottom_center
from .homography import apply_homography, parse_homography_matrix
from .roi import is_point_inside_roi, draw_roi, parse_roi_points, is_valid_bbox

# Setup logger for pipeline exception handling & crash recovery (Issue #17)
logger = logging.getLogger("HeatVision.VideoReader")
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

current_dir = os.path.dirname(os.path.abspath(__file__))
default_path = os.path.join(current_dir, '..', '..', '..', 'data', 'demo', 'demo 2.mp4')

def get_track_color(track_id):
    """Generate a distinct, vibrant BGR color for each track ID using HSV golden ratio."""
    try:
        tid = int(track_id)
    except (ValueError, TypeError):
        tid = 1
    hue = int((tid * 137.508) % 180)
    hsv_pixel = np.uint8([[[hue, 230, 255]]])
    bgr_pixel = cv2.cvtColor(hsv_pixel, cv2.COLOR_HSV2BGR)[0][0]
    return int(bgr_pixel[0]), int(bgr_pixel[1]), int(bgr_pixel[2])

def read_video(video_path=default_path, homography_matrix=None, show_preview=False,
               debug_video_path=None, conf_threshold=0.05, roi_points=None,
               exit_zones=None, session_summaries=None, live_stream=True):
    """
    Reads a video file frame-by-frame, performs YOLO person detection (Issue #20),
    ByteTrack tracking with ID recovery (Issues #23, #25), trajectory state and velocity
    smoothing (Issue #24), shopper session cleanup at exit zones (Issue #26),
    ROI polygon filtering (Issue #20), foot-point calculation, 3x3 homography perspective
    transformation (Issue #16), and outputs detection payloads (Issue #21).
    Renders visual overlays (ROI, bounding boxes, foot points) and optionally exports
    a debug output video (Issue #22).

    exit_zones: optional list of polygons (floorplan coordinates) that end a shopper's session.
    session_summaries: optional list; completed session summaries are appended to it.
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
    active_roi = parse_roi_points(roi_points)
    logger.info(f"Active ROI polygon initialized with {len(active_roi)} vertices: {active_roi.tolist()}")

    # Entrance/exit boundary polygons on the floorplan (Issue #26)
    parsed_exit_zones = [parse_roi_points(zone) for zone in exit_zones] if exit_zones else []

    # Setup Debug Video Writer if requested (Issue #22)
    debug_writer = None
    if debug_video_path:
        try:
            out_dir = os.path.dirname(debug_video_path)
            if out_dir and not os.path.exists(out_dir):
                os.makedirs(out_dir, exist_ok=True)
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer_fps = max(1.0, fps / 2.0)
            debug_writer = cv2.VideoWriter(debug_video_path, fourcc, writer_fps, (frame_width, frame_height))
            logger.info(f"Initialized debug video recorder: {debug_video_path} @ {writer_fps:.1f} FPS")
        except Exception as writer_err:
            logger.error(f"Failed to initialize VideoWriter for debug output: {writer_err}")
            debug_writer = None

    frame_count = 0
    detections_log = []

    # Pipeline processes every 2nd frame, so the tracker sees half the video FPS (Issue #23)
    tracker = PersonTracker(frame_rate=fps / 2)

    # Trajectory state for all shoppers; sessions end at exit zones or after the buffer (Issues #24, #26)
    trajectories = TrajectoryManager(
        fps=fps,
        exit_zones=parsed_exit_zones,
        timeout_frames=tracker.buffer_frames * 2 + 2   # tracker buffer in video frames, plus a small margin
    )

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

                # Draw ROI overlay on frame (Issue #22)
                draw_roi(frame, active_roi)

                # Run person detection, then ByteTrack for persistent IDs (Issues #20, #23)
                try:
                    results = detect_people(frame, conf=conf_threshold)
                    boxes = results[0].boxes if len(results) > 0 else None
                    tracked_people = tracker.update(boxes, frame)
                except Exception as det_err:
                    logger.error(f"Error during detection/tracking on frame {frame_count}: {det_err}")
                    tracked_people = []

                frame_detections = []
                observations = []

                for person in tracked_people:
                    try:
                        x1, y1, x2, y2 = person['bbox']
                        confidence = person['confidence']
                        track_id = person['track_id']

                        # Bounding box size & ratio check (Issue #20)
                        if not is_valid_bbox(x1, y1, x2, y2):
                            continue

                        # 1. Calculate ground foot-point coordinate
                        x_feet, y_feet = calculate_bottom_center(x1, x2, y1, y2)

                        # 2. Check if foot point is inside ROI polygon (Issue #20)
                        if not is_point_inside_roi(x_feet, y_feet, active_roi):
                            continue

                        # 3. Apply 3x3 Homography transformation (Issue #16)
                        u_floor, v_floor = apply_homography((x_feet, y_feet), H)

                        # JSON Detection serialization (Issue #21)
                        frame_detections.append({
                            'track_id': track_id,
                            'bbox': [float(x1), float(y1), float(x2), float(y2)],
                            'feet': [float(x_feet), float(y_feet)],
                            'floorplan_coords': [float(u_floor), float(v_floor)],
                            'confidence': round(confidence, 2)
                        })

                        # Collect observation for trajectory state (Issue #24)
                        observations.append({
                            'track_id': track_id,
                            'pixel': (x_feet, y_feet),
                            'floor': (u_floor, v_floor)
                        })

                        # Overlays: Bounding box with track-specific color and ID tag
                        color = get_track_color(track_id)
                        cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                        label = f"ID {track_id}"
                        (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                        cv2.rectangle(frame, (int(x1), int(y1) - lh - 6), (int(x1) + lw + 6, int(y1)), color, -1)
                        cv2.putText(frame, label, (int(x1) + 3, int(y1) - 4),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)
                        cv2.circle(frame, (int(x_feet), int(y_feet)), 5, color, -1, lineType=cv2.LINE_AA)
                        cv2.circle(frame, (int(x_feet), int(y_feet)), 7, (255, 255, 255), 1, lineType=cv2.LINE_AA)

                    except Exception as box_err:
                        logger.error(f"Error processing bounding box in frame {frame_count}: {box_err}")
                        continue

                # Update trajectories and attach smoothed position + velocity (Issue #24)
                completed_before = len(trajectories.completed)
                motion = trajectories.update(frame_count, observations)
                for det in frame_detections:
                    m = motion.get(det['track_id'])
                    if m is not None:
                        det['smoothed_floorplan_coords'] = m['smoothed_floor']
                        det['velocity'] = m['velocity']

                # --- DRAW TRAJECTORY TRAILS FOR ACTIVE SHOPPERS ---
                for track_id, track in trajectories.tracks.items():
                    if len(track.points) >= 2:
                        color = get_track_color(track_id)
                        # Extract recent pixel foot points for smooth trail
                        pts = [p['pixel'] for p in track.points[-50:] if 'pixel' in p]
                        if len(pts) >= 2:
                            pts_arr = np.array(pts, dtype=np.int32).reshape((-1, 1, 2))
                            cv2.polylines(frame, [pts_arr], isClosed=False, color=color, thickness=2, lineType=cv2.LINE_AA)
                            for p in pts[-12:]:
                                cv2.circle(frame, (int(p[0]), int(p[1])), 2, color, -1, lineType=cv2.LINE_AA)

                # Overlay status banner on frame top
                banner_text = f"Frame: {frame_count}/{total_frames} | Active Shoppers: {len(trajectories.tracks)}"
                cv2.rectangle(frame, (10, 10), (370, 36), (15, 23, 42), -1)
                cv2.rectangle(frame, (10, 10), (370, 36), (59, 130, 246), 1)
                cv2.putText(frame, banner_text, (18, 27), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1, cv2.LINE_AA)

                # Free tracker memory for finished and long-lost shoppers (Issue #26)
                for summary in trajectories.completed[completed_before:]:
                    tracker.release_track(summary['track_id'])
                tracker.purge_expired()

                detections_log.append({
                    'frame': frame_count,
                    'detections': frame_detections
                })

                # Record frame to debug video if enabled (Issue #22)
                if debug_writer is not None:
                    debug_writer.write(frame)

                # Emit live preview frame to stdout for real-time frontend streaming (every 3rd sampled frame)
                if live_stream and frame_count % 6 == 0:
                    try:
                        preview_w = 540
                        preview_h = int(preview_w * frame_height / max(1, frame_width))
                        small_frame = cv2.resize(frame, (preview_w, preview_h), interpolation=cv2.INTER_AREA)
                        _, buffer = cv2.imencode('.jpg', small_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 65])
                        jpg_b64 = base64.b64encode(buffer).decode('utf-8')
                        print(f"[CV Frame]: {jpg_b64}")
                        sys.stdout.flush()
                    except Exception:
                        pass

                # GUI preview display (safe headless guard)
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
            if debug_writer is not None:
                debug_writer.release()
                logger.info(f"Saved debug output video to: {debug_video_path}")
            if show_preview:
                cv2.destroyAllWindows()
        except Exception as cleanup_err:
            logger.error(f"Error releasing video capture resources: {cleanup_err}")

    # End all remaining shopper sessions and hand back the summaries (Issue #26)
    trajectories.finalize()
    if session_summaries is not None:
        session_summaries.extend(trajectories.completed)
    logger.info(f"Shopper sessions completed: {len(trajectories.completed)}")

    logger.info(f"Video processing finished. Processed {len(detections_log)} sampled frames.")
    return detections_log