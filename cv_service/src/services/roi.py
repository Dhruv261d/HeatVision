import cv2
import numpy as np

# Default ROI Polygon coordinates (normalized to 1080p standard view if unspecified)
DEFAULT_ROI_POINTS = np.array([
    (90, 90),
    (1080, 100),
    (1080, 660),
    (100, 660)
], dtype=np.int32)

def parse_roi_points(roi_input):
    """
    Parses ROI points from a list/array of coordinates.
    Returns np.ndarray of shape (N, 2) with int32 dtype, or DEFAULT_ROI_POINTS.
    """
    if roi_input is None:
        return DEFAULT_ROI_POINTS
    try:
        arr = np.array(roi_input, dtype=np.int32)
        if arr.ndim == 2 and arr.shape[1] == 2 and len(arr) >= 3:
            return arr
        return DEFAULT_ROI_POINTS
    except Exception:
        return DEFAULT_ROI_POINTS

def is_point_inside_roi(x, y, roi_points=DEFAULT_ROI_POINTS):
    """
    Checks whether point (x, y) lies inside or on the boundary of the ROI polygon.
    Returns True if inside/on edge, False if outside.
    """
    pts = parse_roi_points(roi_points)
    result = cv2.pointPolygonTest(pts, (float(x), float(y)), False)
    return result >= 0

def is_valid_bbox(x1, y1, x2, y2, min_area=100):
    """
    Filters out unrealistically small bounding boxes or invalid height/width ratios (Issue #20).
    """
    w = max(0, x2 - x1)
    h = max(0, y2 - y1)
    area = w * h
    if area < min_area:
        return False
    if w > 0 and (h / w < 0.2 or h / w > 10.0):
        return False
    return True

def draw_roi(frame, roi_points=DEFAULT_ROI_POINTS, color=(255, 0, 0), thickness=2):
    """
    Draws the ROI polygon overlay on the provided OpenCV frame.
    """
    pts = parse_roi_points(roi_points)
    cv2.polylines(frame, [pts], isClosed=True, color=color, thickness=thickness)
    return frame
