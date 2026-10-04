import logging
import math
from .roi import is_point_inside_roi

logger = logging.getLogger("HeatVision.Trajectory")

# 1.0 = no smoothing, lower = smoother but slower to react (Issue #24)
SMOOTHING_ALPHA = 0.5

STATUS_ACTIVE = "ACTIVE"
STATUS_COMPLETED = "COMPLETED"


class TrackHistory:
    """History and current motion state for one shopper."""

    def __init__(self, track_id, frame, timestamp):
        self.track_id = track_id
        self.status = STATUS_ACTIVE
        self.points = []          # each: frame, timestamp, pixel (u,v), floor (X,Y), smoothed (X,Y)
        self.enter_frame = frame
        self.enter_time = timestamp
        self.last_frame = frame
        self.last_time = timestamp
        self.smoothed = None      # last smoothed floor position
        self.velocity = (0.0, 0.0)
        self.path_length = 0.0
        self.seen_outside = False  # seen outside every exit zone (Issue #26)
        self.start_floor = None
        self.end_floor = None


class TrajectoryManager:
    """Keeps trajectory state for every tracked shopper and ends their sessions (Issues #24, #26)."""

    def __init__(self, fps, exit_zones=None, timeout_frames=None, alpha=SMOOTHING_ALPHA):
        self.fps = fps if fps > 0 else 30.0
        self.alpha = alpha
        self.exit_zones = exit_zones or []      # list of polygons on the floorplan
        self.timeout_frames = timeout_frames    # missing longer than this = session over
        self.tracks = {}                        # active shoppers only
        self.completed = []                     # summaries of finished sessions
        self.finished_ids = set()               # IDs whose session is over, ignored from now on

    def update(self, frame_number, observations):
        """
        observations: list of dicts with 'track_id', 'pixel' (u,v) and 'floor' (X,Y).
        Returns {track_id: {'smoothed_floor', 'velocity', 'displacement'}} for visible shoppers.
        """
        timestamp = frame_number / self.fps
        seen = set()
        motion = {}
        to_complete = []

        for obs in observations:
            track_id = obs['track_id']
            if track_id in self.finished_ids:
                continue   # session already ended, don't start a new one (Issue #26)
            floor = obs['floor']
            history = self.tracks.get(track_id)
            if history is None:
                history = TrackHistory(track_id, frame_number, timestamp)
                history.start_floor = [float(floor[0]), float(floor[1])]
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
            history.path_length += displacement
            history.last_frame = frame_number
            history.last_time = timestamp
            history.end_floor = [float(floor[0]), float(floor[1])]
            seen.add(track_id)

            motion[track_id] = {
                'smoothed_floor': [float(smoothed[0]), float(smoothed[1])],
                'velocity': [float(velocity[0]), float(velocity[1])],
                'displacement': float(displacement),
            }

            # Exit zone check: only counts after the shopper was seen outside the zones
            if self.exit_zones:
                in_zone = any(is_point_inside_roi(floor[0], floor[1], z) for z in self.exit_zones)
                if in_zone and history.seen_outside:
                    to_complete.append((track_id, 'exit_zone'))
                elif not in_zone:
                    history.seen_outside = True

        # Shoppers missing for longer than the buffer are finished (Issue #26)
        if self.timeout_frames is not None:
            for track_id, history in self.tracks.items():
                if track_id not in seen and frame_number - history.last_frame > self.timeout_frames:
                    to_complete.append((track_id, 'timeout'))

        done = set()
        for track_id, reason in to_complete:
            if track_id not in done:
                done.add(track_id)
                self._complete(track_id, reason)

        return motion

    def finalize(self, reason='video_end'):
        """End every remaining session, e.g. when the video finishes."""
        for track_id in list(self.tracks.keys()):
            self._complete(track_id, reason)

    def _complete(self, track_id, reason):
        history = self.tracks.pop(track_id, None)   # purge from active memory
        if history is None:
            return
        self.finished_ids.add(track_id)
        history.status = STATUS_COMPLETED
        summary = {
            'track_id': track_id,
            'status': STATUS_COMPLETED,
            'exit_reason': reason,
            'enter_time': round(history.enter_time, 3),
            'exit_time': round(history.last_time, 3),
            'dwell_time': round(history.last_time - history.enter_time, 3),
            'frames_tracked': len(history.points),
            'path_length': round(history.path_length, 2),
            'start_floor': history.start_floor,
            'end_floor': history.end_floor,
            'path': [{'t': p['timestamp'], 'x': p['smoothed'][0], 'y': p['smoothed'][1]} for p in history.points],
        }
        self.completed.append(summary)
        logger.info(f"Session completed: ID {track_id} ({reason}), dwell {summary['dwell_time']}s")