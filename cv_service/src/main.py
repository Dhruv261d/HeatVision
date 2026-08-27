import cv2
import numpy as np
import argparse
import sys
import time


def check_cv_setup():
    print(f"[CV Module]: OpenCV Version: {cv2.__version__}")
    print(f"[CV Module]: NumPy Version: {np.__version__}")

    # Create a simple test black image
    blank_image = np.zeros((100, 100, 3), np.uint8)
    print(f"[CV Module]: Test array created with shape: {blank_image.shape}")


def run_mock_processing(video_path, camera_id, output_path):
    """
    Placeholder for the real CV pipeline (OpenCV + YOLOv8 + ByteTrack).
    Simulates frame-by-frame processing so we can test the Node <-> Python
    bridge (child_process.spawn) before the real pipeline exists.
    """
    print(f"[CV Module]: Starting processing job")
    
    print(f"[CV Module]: video_path={video_path}")
    print(f"[CV Module]: camera_id={camera_id}")
    print(f"[CV Module]: output_path={output_path}")
    sys.stdout.flush()

    total_frames = 100
    for frame in range(0, total_frames + 1, 10):
        percentage = int((frame / total_frames) * 100)
        print(f"[CV Module]: Processing frame {frame}/{total_frames} ({percentage}%)")
        sys.stdout.flush()
        time.sleep(0.5)

    print(f"[CV Module]: Processing complete. Output saved to {output_path}")
    sys.stdout.flush()


def main():
    parser = argparse.ArgumentParser(description="HeatVision CV placeholder script")
    parser.add_argument("--video", required=False, help="Path to input video file")
    parser.add_argument("--camera", required=False, help="Camera ID")
    parser.add_argument("--output", required=False, help="Path to output directory")
    parser.add_argument(
        "--check-setup",
        action="store_true",
        help="Run the OpenCV/NumPy environment check instead of processing",
    )

    args = parser.parse_args()

    if args.check_setup or not (args.video and args.camera and args.output):
        # Fallback: if no processing args are given, just run the setup check
        check_cv_setup()
        return

    run_mock_processing(args.video, args.camera, args.output)


if __name__ == "__main__":
    main()