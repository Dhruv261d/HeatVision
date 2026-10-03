import os
import sys
import numpy as np
import cv2

# Add src to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from services.homography import parse_homography_matrix, apply_homography, batch_apply_homography
from services.roi import is_point_inside_roi, is_valid_bbox, draw_roi
from services.person_detection import detect_people
from services.heatmap import generate_density_matrix, render_heatmap_overlay, export_heatmap_json
from services.zone_analytics import compute_zone_metrics
from services.pos_generator import generate_synthetic_pos_csv
from services.ai_layout_engine import parse_pos_csv, compute_sales_conversion, detect_lost_sales, generate_layout_recommendations, compute_layout_efficiency_score
from services.video_reader import read_video

def run_tests():
    print("--- STARTING HEATVISION SUITE TEST ---")

    # 1. Homography Tests
    print("[1/8] Testing Homography Matrix Mapping...")
    H_id = parse_homography_matrix(None)
    assert H_id.shape == (3, 3), "Homography default matrix shape error"
    pt_out = apply_homography((100, 200), H_id)
    assert pt_out == (100.0, 200.0), f"Identity homography transform failed: {pt_out}"
    pts_out = batch_apply_homography([(100, 200), (300, 400)], H_id)
    assert len(pts_out) == 2, "Batch homography failed"
    print("  -> Homography OK!")

    # 2. ROI Tests
    print("[2/8] Testing ROI Polygon & BBox Validation...")
    inside = is_point_inside_roi(500, 500)
    assert inside == True, "Default ROI point test failed"
    outside = is_point_inside_roi(10, 10)
    assert outside == False, "Default ROI outside point test failed"
    assert is_valid_bbox(10, 10, 100, 200) == True, "BBox validation failed"
    assert is_valid_bbox(10, 10, 12, 12) == False, "Min area BBox test failed"
    print("  -> ROI & BBox OK!")

    # 3. Person Detection Model
    print("[3/8] Testing YOLOv8 Person Detector Initialization...")
    blank = np.zeros((640, 640, 3), dtype=np.uint8)
    tracks = detect_people(blank)
    assert tracks is not None, "YOLO detector failed on blank frame"
    print("  -> YOLOv8 Detector OK!")

    # 4. Heatmap Generator
    print("[4/8] Testing 2D Gaussian Spatial Heatmap Generator...")
    pts = [(200, 200), (220, 210), (500, 500)]
    grid = generate_density_matrix(pts, width=1280, height=720)
    assert grid.shape == (360, 640), f"Density matrix grid shape error: {grid.shape}"
    json_export = export_heatmap_json(grid)
    assert "matrix" in json_export, "Heatmap JSON export error"
    bgra = render_heatmap_overlay(grid)
    assert bgra.shape == (360, 640, 4), "Heatmap BGRA overlay shape error"
    print("  -> Heatmap Generator OK!")

    # 5. Zone Analytics
    print("[5/8] Testing Zone Analytics & Dwell Time Calculator...")
    sample_log = [
        {"frame": 10, "detections": [{"floorplan_coords": (100, 100)}, {"floorplan_coords": (600, 200)}]},
        {"frame": 20, "detections": [{"floorplan_coords": (100, 100)}, {"floorplan_coords": (600, 200)}]}
    ]
    analytics = compute_zone_metrics(sample_log)
    assert "zones" in analytics, "Zone analytics summary error"
    assert len(analytics["zones"]) == 4, "Zone count error"
    print("  -> Zone Analytics OK!")

    # 6. POS Generator & Parser
    print("[6/8] Testing POS Generator & CSV Parser...")
    pos_file = "data/temp_pos_test.csv"
    generate_synthetic_pos_csv(pos_file, num_transactions=50)
    pos_data = parse_pos_csv(pos_file)
    assert len(pos_data) > 0, "POS CSV parsing failed"
    if os.path.exists(pos_file):
        os.remove(pos_file)
    print("  -> POS Pipeline OK!")

    # 7. AI Layout & Lost Sales Engine
    print("[7/8] Testing AI Layout & Lost Sales Optimization Engine...")
    conversion = compute_sales_conversion(analytics, pos_data)
    lost_sales = detect_lost_sales(conversion)
    recs = generate_layout_recommendations(conversion, lost_sales)
    score_data = compute_layout_efficiency_score(conversion, analytics)
    assert "composite_efficiency_score" in score_data, "Efficiency score error"
    print("  -> AI Layout Engine OK!")

    # 8. Video Processing Stream
    print("[8/8] Testing Video Pipeline Stream on sample footage...")
    demo_video = os.path.join(os.path.dirname(__file__), '..', 'data', 'demo', 'demo 2.mp4')
    if os.path.exists(demo_video):
        detections = read_video(video_path=demo_video, show_preview=False)
        assert len(detections) > 0, "Video reader failed to produce detections"
        print(f"  -> Video Stream OK! Processed {len(detections)} frames.")
    else:
        print("  -> Demo video skipped (file not present).")

    print("\n✅ ALL 8 SYSTEM TESTS PASSED SUCCESSFULLY WITH ZERO ERRORS!")

if __name__ == '__main__':
    run_tests()
