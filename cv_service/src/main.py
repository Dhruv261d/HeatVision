import os
import sys
import json
import logging
import argparse
import cv2
import numpy as np

from services.video_reader import read_video
from services.trajectory_export import export_trajectories

# Configured logging format
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [CV.Main]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("CV.Main")

def check_cv_setup():
    logger.info(f"OpenCV Version: {cv2.__version__}")
    logger.info(f"NumPy Version: {np.__version__}")

    try:
        blank_image = np.zeros((100, 100, 3), np.uint8)
        logger.info(f"Test array created successfully with shape: {blank_image.shape}")
    except Exception as e:
        logger.error(f"Environment check failed: {e}")


def main():
    parser = argparse.ArgumentParser(description="HeatVision CV Processing Pipeline")
    parser.add_argument("--video", required=False, help="Path to input video file")
    parser.add_argument("--camera", required=False, help="Camera identifier")
    parser.add_argument("--output", required=False, help="Path to save output JSON detections payload")
    parser.add_argument("--homography", required=False, help="JSON string or file path to 3x3 homography matrix")
    parser.add_argument("--preview", action="store_true", help="Display live OpenCV window preview")
    parser.add_argument("--debug-video", required=False, help="Path to save annotated output debug video MP4")
    parser.add_argument("--roi", required=False, help="JSON string or file path to ROI polygon coordinates [(x,y), ...]")
    parser.add_argument("--exit-zones", required=False, help="JSON string or file path to a list of exit zone polygons on the floorplan (Issue #26)")
    parser.add_argument("--conf", type=float, default=0.05, help="Confidence threshold for YOLO person detection")
    parser.add_argument("--check-setup", action="store_true", help="Run environment diagnostic check")

    args = parser.parse_args()

    if args.check_setup:
        check_cv_setup()
        return

    video_path = args.video
    if not video_path:
        # Default sample video path for testing
        current_dir = os.path.dirname(os.path.abspath(__file__))
        video_path = os.path.normpath(os.path.join(current_dir, '..','..', 'data', 'demo', 'demo 2.mp4'))

    homography_matrix = None
    if args.homography:
        try:
            if os.path.exists(args.homography):
                with open(args.homography, 'r') as f:
                    homography_matrix = json.load(f)
            else:
                homography_matrix = json.loads(args.homography)
        except Exception as e:
            logger.warning(f"Failed to parse homography matrix input: {e}. Defaulting to identity matrix.")

    roi_points = None
    if args.roi:
        try:
            if os.path.exists(args.roi):
                with open(args.roi, 'r') as f:
                    roi_points = json.load(f)
            else:
                roi_points = json.loads(args.roi)
        except Exception as e:
            logger.warning(f"Failed to parse ROI input: {e}. Defaulting to default ROI polygon.")

    # Exit zone polygons for ending shopper sessions (Issue #26/#27)
    exit_zones = None
    if args.exit_zones:
        try:
            if os.path.exists(args.exit_zones):
                with open(args.exit_zones, 'r') as f:
                    exit_zones = json.load(f)
            else:
                exit_zones = json.loads(args.exit_zones)
        except Exception as e:
            logger.warning(f"Failed to parse exit zones input: {e}. Running without exit zones.")

    logger.info(f"Starting HeatVision CV Pipeline for video: {video_path}")

    try:
        session_summaries = []
        detections_log = read_video(
            video_path=video_path,
            homography_matrix=homography_matrix,
            show_preview=args.preview,
            debug_video_path=args.debug_video,
            conf_threshold=args.conf,
            roi_points=roi_points,
            exit_zones=exit_zones,
            session_summaries=session_summaries
        )

        if args.output:
            out_dir = os.path.dirname(args.output)
            if out_dir and not os.path.exists(out_dir):
                os.makedirs(out_dir, exist_ok=True)

            with open(args.output, 'w') as f:
                json.dump({
                    "video": video_path,
                    "camera_id": args.camera or "default",
                    "total_processed_frames": len(detections_log),
                    "frames": detections_log
                }, f, indent=2)
            logger.info(f"Detections payload successfully saved to {args.output}")

        # Export finished shopper trajectories to data/processed (Issue #27)
        try:
            result = export_trajectories(session_summaries, video_path, camera_id=args.camera or "default")
            logger.info(f"Trajectory export: {result['exported']} saved, {result['rejected']} rejected -> {result['file']}")
        except Exception as export_err:
            logger.error(f"Trajectory export failed: {export_err}")

    except Exception as pipeline_err:
        logger.critical(f"Unhandled pipeline failure: {pipeline_err}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()