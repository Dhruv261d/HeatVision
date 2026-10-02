import cv2
import numpy as np


# ROI CONFIGURATION

# Replace these coordinates with the actual ROI coordinates
# for your camera view.

ROI_POINTS = np.array([
    (90, 90),
    (1080, 100),
    (1080, 660),
    (100, 660)
], dtype=np.int32)


def is_point_inside_roi(x, y):
    """
    Check whether a point is inside the ROI polygon.
    """

    result = cv2.pointPolygonTest(
        ROI_POINTS,
        (float(x), float(y)),
        False
    )

    return result >= 0


def draw_roi(frame):
    """
    Draw the ROI polygon on the current frame.
    """

    cv2.polylines(
        frame,
        [ROI_POINTS],
        True,
        (255, 0, 0),
        2
    )

    return frame