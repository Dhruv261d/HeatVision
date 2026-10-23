"""
Module wrapper to allow Python import with underscore:
from services.heatmap_generator import generate_dual_heatmaps, compute_zone_analytics_from_trajectories
"""
import importlib.util
import os

_script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "heatmap-generator.py")
_spec = importlib.util.spec_from_file_location("heatmap_generator_internal", _script_path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

# Export all public attributes and functions
transform_point = _mod.transform_point
add_heat_segment = _mod.add_heat_segment
create_heatmap_overlay = _mod.create_heatmap_overlay
compute_zone_analytics_from_trajectories = _mod.compute_zone_analytics_from_trajectories
generate_dual_heatmaps = _mod.generate_dual_heatmaps
DEFAULT_ZONES = _mod.DEFAULT_ZONES
find_default_blueprint = _mod.find_default_blueprint
find_default_video_frame = _mod.find_default_video_frame

if __name__ == "__main__":
    import sys
    # Delegate to internal main
    _mod.__name__ = "__main__"
