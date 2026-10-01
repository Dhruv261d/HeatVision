import os
import sys
import json
import logging
import argparse
import cv2
import numpy as np

from services.video_reader import read_video

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
    parser.add_argument("--check-setup", action="store_true", help="Run environment diagnostic check")

    args = parser.parse_args()

    if args.check_setup:
        check_cv_setup()
        return

    video_path = args.video
    if not video_path:
        # Default sample video path for testing
        current_dir = os.path.dirname(os.path.abspath(__file__))
        video_path = os.path.normpath(os.path.join(current_dir, '..', '..', 'data', 'demo', 'demo 2.mp4'))

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

    logger.info(f"Starting HeatVision CV Pipeline for video: {video_path}")
    
    try:
        detections_log = read_video(
            video_path=video_path,
            homography_matrix=homography_matrix,
            show_preview=args.preview
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

    except Exception as pipeline_err:
        logger.critical(f"Unhandled pipeline failure: {pipeline_err}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()