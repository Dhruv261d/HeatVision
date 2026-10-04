import logging
import math
from ultralytics.trackers.byte_tracker import BYTETracker
from ultralytics.utils import IterableSimpleNamespace

logger = logging.getLogger("HeatVision.Tracker")

# ByteTrack hyperparameters (Issues #23, #25)
TRACK_HIGH_THRESH = 0.25   # first-stage association threshold
TRACK_LOW_THRESH = 0.1     # second-stage low-confidence matching (Issue #25)
NEW_TRACK_THRESH = 0.25    # min confidence to start a new track
BUFFER_SECONDS = 3.0       # how long a lost track is kept alive (Issue #25)
MATCH_THRESH = 0.8         # association similarity threshold

# Spatial ID recovery settings (Issue #25)
RECOVERY_DISTANCE_RATIO = 1.5  # max reconnect distance, as a multiple of the person's height
MAX_EXTRAPOLATE_FRAMES = 10    # cap on how far ahead we project a lost shopper's path
VELOCITY_ALPHA = 0.5           # smoothing for the velocity estimate


class PersonTracker:
    """
    Wraps ByteTrack and adds ID recovery. If a shopper is hidden (pillar, shelf,
    another person) and comes back under a new ByteTrack ID, the new ID is mapped
    back to the original one when they re-emerge near their last known path.
    """

    def __init__(self, frame_rate=15.0, buffer_seconds=BUFFER_SECONDS,
                 match_thresh=MATCH_THRESH, recovery_distance_ratio=RECOVERY_DISTANCE_RATIO):
        # frame_rate = frames per second that the tracker actually sees
        self.buffer_frames = max(1, int(round(frame_rate * buffer_seconds)))
        self.recovery_distance_ratio = recovery_distance_ratio
        args = IterableSimpleNamespace(
            tracker_type="bytetrack",
            track_high_thresh=TRACK_HIGH_THRESH,
            track_low_thresh=TRACK_LOW_THRESH,
            new_track_thresh=NEW_TRACK_THRESH,
            track_buffer=self.buffer_frames,
            match_thresh=match_thresh,
            fuse_score=True,
        )
        self.tracker = BYTETracker(args)
        self.frame_index = 0
        self.alias = {}   # raw ByteTrack ID -> original shopper ID
        self.state = {}   # original shopper ID -> last position, velocity, frame
        self.recovered = 0
        logger.info(f"ByteTrack ready (buffer={self.buffer_frames} frames, match_thresh={match_thresh})")

    def update(self, boxes, frame):
        """
        boxes: the `.boxes` object from a YOLO result for this frame.
        Returns a list of {'track_id', 'bbox', 'confidence'} dicts.
        """
        self.frame_index += 1
        if boxes is None or len(boxes) == 0:
            return []

        tracked = self.tracker.update(boxes.cpu().numpy(), frame)

        # Each row: x1, y1, x2, y2, track_id, confidence, class, detection_index
        people = []
        for row in tracked:
            people.append({
                "raw_id": int(row[4]),
                "bbox": [float(row[0]), float(row[1]), float(row[2]), float(row[3])],
                "confidence": float(row[5]),
            })

        visible = set()
        new_people = []

        # Pass 1: shoppers ByteTrack already knows keep their mapped ID
        for person in people:
            raw_id = person["raw_id"]
            if raw_id in self.alias:
                person["track_id"] = self.alias[raw_id]
                visible.add(person["track_id"])
            else:
                new_people.append(person)

        # Pass 2: brand-new ByteTrack IDs, try to reconnect them to a lost shopper
        for person in new_people:
            original = self._find_lost_track(person, visible)
            if original is None:
                original = person["raw_id"]
            else:
                self.recovered += 1
                logger.info(f"Recovered ID {person['raw_id']} -> {original} (frame {self.frame_index})")
            self.alias[person["raw_id"]] = original
            person["track_id"] = original
            visible.add(original)

        for person in people:
            self._update_state(person)

        return [
            {"track_id": p["track_id"], "bbox": p["bbox"], "confidence": p["confidence"]}
            for p in people
        ]

    def _find_lost_track(self, person, visible):
        """Return the original ID of a recently lost shopper near this new detection, or None."""
        x1, y1, x2, y2 = person["bbox"]
        foot_x, foot_y = (x1 + x2) / 2, y2
        limit = self.recovery_distance_ratio * (y2 - y1)

        best_id, best_dist = None, None
        for original, s in self.state.items():
            if original in visible:
                continue
            gap = self.frame_index - s["frame"]
            if gap <= 0 or gap > self.buffer_frames:
                continue

            # Where the shopper would be now if they kept walking the same way
            ahead = min(gap, MAX_EXTRAPOLATE_FRAMES)
            pred_x = s["pos"][0] + s["vel"][0] * ahead
            pred_y = s["pos"][1] + s["vel"][1] * ahead
            dist = min(
                math.hypot(foot_x - pred_x, foot_y - pred_y),
                math.hypot(foot_x - s["pos"][0], foot_y - s["pos"][1]),
            )
            if dist <= limit and (best_dist is None or dist < best_dist):
                best_id, best_dist = original, dist
        return best_id

    def _update_state(self, person):
        x1, y1, x2, y2 = person["bbox"]
        pos = ((x1 + x2) / 2, y2)
        s = self.state.get(person["track_id"])
        if s is None:
            self.state[person["track_id"]] = {"pos": pos, "vel": (0.0, 0.0), "frame": self.frame_index}
            return
        dt = self.frame_index - s["frame"]
        if dt > 0:
            vx = (pos[0] - s["pos"][0]) / dt
            vy = (pos[1] - s["pos"][1]) / dt
            s["vel"] = (
                VELOCITY_ALPHA * vx + (1 - VELOCITY_ALPHA) * s["vel"][0],
                VELOCITY_ALPHA * vy + (1 - VELOCITY_ALPHA) * s["vel"][1],
            )
        s["pos"] = pos
        s["frame"] = self.frame_index

    def release_track(self, original_id):
        """Forget a finished shopper so tracker memory is freed (Issue #26)."""
        self.state.pop(original_id, None)
        for raw_id in [r for r, o in self.alias.items() if o == original_id]:
            del self.alias[raw_id]

    def purge_expired(self):
        """Drop shoppers lost for longer than the buffer (Issue #26)."""
        expired = [o for o, s in self.state.items()
                   if self.frame_index - s["frame"] > self.buffer_frames]
        for original_id in expired:
            self.release_track(original_id)