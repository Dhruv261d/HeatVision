import logging
import math

logger = logging.getLogger("HeatVision.Trajectory")

# 1.0 = no smoothing, lower = smoother but slower to react (Issue #24)
SMOOTHING_ALPHA = 0.5


class TrackHistory:
    """History and current motion state for one shopper."""

    def __init__(self, track_id):
        self.track_id = track_id
        self.points = []        # each: frame, timestamp, pixel (u,v), floor (X,Y), smoothed (X,Y)
        self.active = True
        self.last_frame = None
        self.smoothed = None    # last smoothed floor position
        self.velocity = (0.0, 0.0)


class TrajectoryManager:
    """Keeps trajectory state for every tracked shopper across frames."""

    def __init__(self, fps, alpha=SMOOTHING_ALPHA):
        self.fps = fps if fps > 0 else 30.0
        self.alpha = alpha
        self.tracks = {}

    def update(self, frame_number, observations):
        """
        observations: list of dicts with 'track_id', 'pixel' (u,v) and 'floor' (X,Y).
        Returns {track_id: {'smoothed_floor', 'velocity', 'displacement'}} for visible shoppers.
        """
        timestamp = frame_number / self.fps
        seen = set()
        motion = {}

        for obs in observations:
            track_id = obs['track_id']
            floor = obs['floor']
            history = self.tracks.get(track_id)
            if history is None:
                history = TrackHistory(track_id)
                self.tracks[track_id] = history

            if history.smoothed is None:
                smoothed = (floor[0], floor[1])
                velocity = (0.0, 0.0)
                displacement = 0.0
            else:
                dt = (frame_number - history.last_frame) / self.fps
                smoothed = (
                    self.alpha * floor[0] + (1 - self.alpha) * history.smoothed[0],
                    self.alpha * floor[1] + (1 - self.alpha) * history.smoothed[1],
                )
                dx = smoothed[0] - history.smoothed[0]
                dy = smoothed[1] - history.smoothed[1]
                displacement = math.hypot(dx, dy)
                velocity = (dx / dt, dy / dt) if dt > 0 else (0.0, 0.0)

            history.points.append({
                'frame': frame_number,
                'timestamp': round(timestamp, 3),
                'pixel': [float(obs['pixel'][0]), float(obs['pixel'][1])],
                'floor': [float(floor[0]), float(floor[1])],
                'smoothed': [float(smoothed[0]), float(smoothed[1])],
            })
            history.smoothed = smoothed
            history.velocity = velocity
            history.last_frame = frame_number
            history.active = True
            seen.add(track_id)

            motion[track_id] = {
                'smoothed_floor': [float(smoothed[0]), float(smoothed[1])],
                'velocity': [float(velocity[0]), float(velocity[1])],
                'displacement': float(displacement),
            }

        # Shoppers not visible in this frame become inactive (cleanup is Issue #26)
        for track_id, history in self.tracks.items():
            if track_id not in seen:
                history.active = False

        return motion