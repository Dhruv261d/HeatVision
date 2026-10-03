import cv2
import numpy as np
import logging

logger = logging.getLogger("HeatVision.ZoneAnalytics")

# Default Sample Store Zones
DEFAULT_ZONES = [
    {
        "zone_id": "zone_entrance",
        "name": "Entrance & Foyer",
        "category": "Entrance",
        "polygon": [(50, 50), (450, 50), (450, 300), (50, 300)],
        "target_dwell_seconds": 15
    },
    {
        "zone_id": "zone_apparel",
        "name": "Apparel & Fashion Aisle",
        "category": "Retail",
        "polygon": [(500, 50), (1050, 50), (1050, 450), (500, 450)],
        "target_dwell_seconds": 90
    },
    {
        "zone_id": "zone_electronics",
        "name": "Electronics & Displays",
        "category": "High-Value",
        "polygon": [(50, 350), (450, 350), (450, 700), (50, 700)],
        "target_dwell_seconds": 120
    },
    {
        "zone_id": "zone_checkout",
        "name": "Checkout Counters",
        "category": "POS",
        "polygon": [(500, 500), (1050, 500), (1050, 700), (500, 700)],
        "target_dwell_seconds": 45
    }
]


def is_point_in_zone(point, polygon_pts):
    """
    Checks whether a 2D point (x, y) falls inside a zone polygon. (Issue #29)
    """
    if not polygon_pts or len(polygon_pts) < 3:
        return False
    poly_arr = np.array(polygon_pts, dtype=np.int32)
    res = cv2.pointPolygonTest(poly_arr, (float(point[0]), float(point[1])), False)
    return res >= 0


def compute_zone_metrics(detections_log, zones=None, fps=30.0, sample_interval=2):
    """
    Computes zone dwell duration, engagement metrics, hourly traffic distributions (Issues #30, #31),
    and evaluates dead zones and congestion bottleneck heuristics (Issue #32).
    
    :param detections_log: List of frame objects [{'frame': N, 'detections': [{...}]}]
    :param zones: List of zone configurations
    :param fps: Video frames per second
    :param sample_interval: Frame sampling interval
    :return: Analytics summary payload dictionary
    """
    if zones is None:
        zones = DEFAULT_ZONES

    seconds_per_sample = sample_interval / max(1.0, fps)
    total_store_detections = 0
    zone_stats = {}

    for zone in zones:
        zid = zone["zone_id"]
        zone_stats[zid] = {
            "zone_id": zid,
            "name": zone.get("name", zid),
            "category": zone.get("category", "General"),
            "polygon": zone.get("polygon", []),
            "footfall_count": 0,
            "total_dwell_seconds": 0.0,
            "hourly_traffic": [0] * 24,
            "target_dwell_seconds": zone.get("target_dwell_seconds", 30)
        }

    # Process all frame detections
    for frame_data in detections_log:
        frame_idx = frame_data.get("frame", 0)
        # Approximate hour of day assuming video timeline or timestamp
        estimated_hour = int((frame_idx / max(1.0, fps) / 3600)) % 24

        detections = frame_data.get("detections", [])
        for det in detections:
            pt = det.get("floorplan_coords") or det.get("feet")
            if not pt:
                continue
            
            total_store_detections += 1

            for zone in zones:
                zid = zone["zone_id"]
                poly = zone.get("polygon", [])
                if is_point_in_zone(pt, poly):
                    zone_stats[zid]["footfall_count"] += 1
                    zone_stats[zid]["total_dwell_seconds"] += seconds_per_sample
                    zone_stats[zid]["hourly_traffic"][estimated_hour] += 1

    # Calculate Engagement Metrics & Heuristics (Issues #30, #31, #32)
    analyzed_zones = []
    dead_zones = []
    bottlenecks = []

    for zid, stat in zone_stats.items():
        footfall = stat["footfall_count"]
        dwell = stat["total_dwell_seconds"]
        avg_dwell = round(dwell / max(1, footfall), 1) if footfall > 0 else 0.0
        traffic_share = round((footfall / max(1, total_store_detections)) * 100, 1)

        # Engagement score (ratio of actual dwell to target dwell)
        target = stat["target_dwell_seconds"]
        engagement_score = round(min(100.0, (avg_dwell / max(1.0, target)) * 100), 1)

        zone_summary = {
            "zone_id": zid,
            "name": stat["name"],
            "category": stat["category"],
            "footfall_count": footfall,
            "traffic_share_pct": traffic_share,
            "total_dwell_seconds": round(dwell, 1),
            "avg_dwell_seconds": avg_dwell,
            "engagement_score": engagement_score,
            "hourly_traffic": stat["hourly_traffic"]
        }

        # Dead Zone Heuristic (#32): Traffic share < 5% or low avg dwell
        if traffic_share < 5.0 and total_store_detections > 50:
            dead_zones.append({
                "zone_id": zid,
                "name": stat["name"],
                "traffic_share_pct": traffic_share,
                "reason": "Very low footfall traffic density (< 5% of store total)."
            })

        # Bottleneck Heuristic (#32): High traffic share (> 35%) or excessive queuing dwell
        if traffic_share > 35.0 or (stat["category"] == "POS" and avg_dwell > 60.0):
            bottlenecks.append({
                "zone_id": zid,
                "name": stat["name"],
                "traffic_share_pct": traffic_share,
                "avg_dwell_seconds": avg_dwell,
                "reason": "High congestion density causing potential shopper flow bottlenecks."
            })

        analyzed_zones.append(zone_summary)

    return {
        "total_store_footfall": total_store_detections,
        "total_zones": len(analyzed_zones),
        "zones": analyzed_zones,
        "heuristics": {
            "dead_zones": dead_zones,
            "congestion_bottlenecks": bottlenecks
        }
    }
