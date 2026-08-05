import cv2
import numpy as np

def check_cv_setup():
    print(f"[CV Module]: OpenCV Version: {cv2.__version__}")
    print(f"[CV Module]: NumPy Version: {np.__version__}")
    
    # Create a simple test black image
    blank_image = np.zeros((100, 100, 3), np.uint8)
    print(f"[CV Module]: Test array created with shape: {blank_image.shape}")

if __name__ == "__main__":
    check_cv_setup()