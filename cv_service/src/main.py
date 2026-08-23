import cv2
import numpy as np
from services.video_reader import read_video

def check_cv_setup():
    print(f"[CV Module]: OpenCV Version: {cv2.__version__}")
    print(f"[CV Module]: NumPy Version: {np.__version__}")

    print('reading video...')
    print('press Q to exit from video')
    read_video()

if __name__ == "__main__":
    check_cv_setup()