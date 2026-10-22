import cv2
import numpy as np

def get_person_zones(u_floor, v_floor, zone_polygons, x_feet=None, y_feet=None):
    """
    Determines which zone(s) a person belongs to based on floorplan homography coordinates
    (u_floor, v_floor) or video pixel coordinates (x_feet, y_feet).
    """
    if not zone_polygons:
        return []

    matched_zones = []
    floor_pt = (float(u_floor), float(v_floor))
    video_pt = (float(x_feet), float(y_feet)) if (x_feet is not None and y_feet is not None) else None

    for zone in zone_polygons:
        matched = False

        # 1. Test against floorplan polygon using homography projected coordinates
        poly_floor = zone.get("polygon_floor")
        if poly_floor is not None and len(poly_floor) >= 3:
            try:
                poly_arr = np.ascontiguousarray(poly_floor, dtype=np.float32)
                result = cv2.pointPolygonTest(poly_arr, floor_pt, False)
                if result >= 0:
                    matched = True
            except Exception:
                pass

        # 2. Test against video-space polygon if floorplan didn't match and video polygon is available
        if not matched and video_pt is not None:
            poly_video = zone.get("polygon_video")
            if poly_video is not None and len(poly_video) >= 3:
                try:
                    poly_arr = np.ascontiguousarray(poly_video, dtype=np.float32)
                    result = cv2.pointPolygonTest(poly_arr, video_pt, False)
                    if result >= 0:
                        matched = True
                except Exception:
                    pass

        # 3. Fallback test on legacy single polygon field
        if not matched:
            poly_gen = zone.get("polygon")
            if poly_gen is not None and len(poly_gen) >= 3:
                try:
                    poly_arr = np.ascontiguousarray(poly_gen, dtype=np.float32)
                    result = cv2.pointPolygonTest(poly_arr, floor_pt, False)
                    if result >= 0:
                        matched = True
                except Exception:
                    pass

        if matched:
            matched_zones.append({
                "zone_id": zone.get("id"),
                "zone_name": zone.get("name"),
                "zone_type": zone.get("type", "custom")
            })

    return matched_zones