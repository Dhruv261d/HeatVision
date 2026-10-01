import numpy as np
import cv2
import logging

logger = logging.getLogger("HeatVision.Homography")

def get_default_homography_matrix():
    """
    Returns a default 3x3 identity matrix for homography mapping.
    """
    return np.eye(3, dtype=np.float32)

def parse_homography_matrix(matrix_input):
    """
    Parses a 3x3 matrix from a list, nested list, or numpy array.
    Falls back to identity matrix if invalid.
    """
    if matrix_input is None:
        return get_default_homography_matrix()
    
    try:
        arr = np.array(matrix_input, dtype=np.float32)
        if arr.shape == (3, 3):
            return arr
        elif arr.size == 9:
            return arr.reshape((3, 3))
        else:
            logger.warning(f"Invalid homography matrix shape {arr.shape}. Using identity matrix fallback.")
            return get_default_homography_matrix()
    except Exception as e:
        logger.error(f"Error parsing homography matrix: {e}. Falling back to identity matrix.")
        return get_default_homography_matrix()

def apply_homography(point, H_matrix):
    """
    Applies 3x3 homography perspective transformation to a single 2D point (x, y).
    
    :param point: tuple or list (x, y) in frame pixel coordinates
    :param H_matrix: 3x3 transformation matrix
    :return: tuple (u, v) mapped floorplan coordinates
    """
    try:
        x, y = point
        pts = np.array([[[x, y]]], dtype=np.float32)
        H = parse_homography_matrix(H_matrix)
        
        # Apply perspective transformation using cv2.perspectiveTransform
        transformed_pts = cv2.perspectiveTransform(pts, H)
        u, v = transformed_pts[0][0]
        return float(u), float(v)
    except Exception as e:
        logger.error(f"Exception during homography calculation for point {point}: {e}")
        # Fallback: return original coordinates
        return float(point[0]), float(point[1])

def batch_apply_homography(points, H_matrix):
    """
    Applies 3x3 homography perspective transformation to a list of (x, y) points.
    
    :param points: list of (x, y) tuples
    :param H_matrix: 3x3 transformation matrix
    :return: list of (u, v) floorplan coordinate tuples
    """
    if not points:
        return []
    
    try:
        pts_array = np.array([[pt] for pt in points], dtype=np.float32)
        H = parse_homography_matrix(H_matrix)
        transformed = cv2.perspectiveTransform(pts_array, H)
        return [(float(pt[0][0]), float(pt[0][1])) for pt in transformed]
    except Exception as e:
        logger.error(f"Exception during batch homography calculation: {e}")
        return [(float(pt[0]), float(pt[1])) for pt in points]
