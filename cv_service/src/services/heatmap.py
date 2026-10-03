import numpy as np
import cv2
import json
import logging

logger = logging.getLogger("HeatVision.Heatmap")

def generate_density_matrix(points, width=1920, height=1080, grid_scale=0.5, sigma=25):
    """
    Computes a 2D Gaussian Kernel Density Estimation (KDE) spatial heatmap matrix. (Issue #28)
    
    :param points: List of (x, y) or (u, v) floorplan coordinates [(x1, y1), ...]
    :param width: Target floorplan width in pixels
    :param height: Target floorplan height in pixels
    :param grid_scale: Scaling factor for downscaled grid computation (e.g. 0.5 = 2x speedup)
    :param sigma: Gaussian blur kernel radius / spatial bandwidth
    :return: 2D numpy array of shape (grid_height, grid_width) with normalized density values [0.0, 1.0]
    """
    grid_w = max(1, int(width * grid_scale))
    grid_h = max(1, int(height * grid_scale))
    
    # Initialize accumulator grid
    density_grid = np.zeros((grid_h, grid_w), dtype=np.float32)
    
    if not points:
        return density_grid

    valid_points_count = 0
    for pt in points:
        if pt is None or len(pt) < 2:
            continue
        try:
            x, y = float(pt[0]), float(pt[1])
            gx = int(x * grid_scale)
            gy = int(y * grid_scale)

            # Bounds check
            if 0 <= gx < grid_w and 0 <= gy < grid_h:
                density_grid[gy, gx] += 1.0
                valid_points_count += 1
        except (ValueError, TypeError):
            continue

    if valid_points_count == 0:
        return density_grid

    # Apply 2D Gaussian Kernel Smoothing
    scaled_sigma = max(1.0, float(sigma * grid_scale))
    kernel_size = int(scaled_sigma * 6)
    if kernel_size % 2 == 0:
        kernel_size += 1

    smoothed_grid = cv2.GaussianBlur(density_grid, (kernel_size, kernel_size), scaled_sigma)

    # Normalize density values between 0.0 and 1.0
    max_val = np.max(smoothed_grid)
    if max_val > 0:
        normalized_grid = smoothed_grid / max_val
    else:
        normalized_grid = smoothed_grid

    return normalized_grid


def render_heatmap_overlay(density_grid, colormap=cv2.COLORMAP_JET, alpha=0.6):
    """
    Renders a colored thermal heatmap image with transparency from a 2D density grid matrix.
    
    :param density_grid: 2D numpy array of normalized density values [0.0, 1.0]
    :param colormap: OpenCV colormap enum (default cv2.COLORMAP_JET)
    :param alpha: Alpha transparency factor [0.0, 1.0]
    :return: RGBA image array (height, width, 4) with color-coded heatmap and alpha channel
    """
    # Scale normalized grid [0, 1] to uint8 [0, 255]
    grid_uint8 = np.uint8(np.clip(density_grid * 255.0, 0, 255))
    
    # Apply thermal colormap
    color_map = cv2.applyColorMap(grid_uint8, colormap)
    
    # Generate alpha channel mask based on density intensity
    alpha_channel = np.uint8(np.clip(density_grid * alpha * 255.0, 0, 255))
    
    # Combine BGR color channels with Alpha channel
    bgra = cv2.merge([color_map[:, :, 0], color_map[:, :, 1], color_map[:, :, 2], alpha_channel])
    return bgra


def export_heatmap_json(density_grid):
    """
    Serializes a 2D density grid matrix to an exportable JSON payload.
    """
    h, w = density_grid.shape
    return {
        "dimensions": {"width": w, "height": h},
        "max_density": float(np.max(density_grid)),
        "mean_density": float(np.mean(density_grid)),
        "matrix": np.round(density_grid, 4).tolist()
    }
