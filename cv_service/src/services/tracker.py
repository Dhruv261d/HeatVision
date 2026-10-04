import logging
from ultralytics.trackers.byte_tracker import BYTETracker
from ultralytics.utils import IterableSimpleNamespace

logger = logging.getLogger("HeatVision.Tracker")

# ByteTrack hyperparameters (Issue #23)
BASE_FPS = 30.0          # frame rate the buffer value below is defined for
TRACK_HIGH_THRESH = 0.25 # first-stage association threshold
TRACK_LOW_THRESH = 0.1   # second-stage (low-confidence) threshold
NEW_TRACK_THRESH = 0.25  # min confidence to start a new track
TRACK_BUFFER = 30        # frames a lost track is kept alive (at BASE_FPS)
MATCH_THRESH = 0.8       # association similarity threshold


class PersonTracker:
    """Wraps ByteTrack. Feed it detections each frame, get persistent track IDs back."""

    def __init__(self, frame_rate=BASE_FPS, track_buffer=TRACK_BUFFER, match_thresh=MATCH_THRESH):
        # Scale the buffer to the real frame rate so a lost track survives
        # the same number of seconds regardless of video FPS.
        buffer_frames = max(1, int(round(frame_rate / BASE_FPS * track_buffer)))
        args = IterableSimpleNamespace(
            tracker_type="bytetrack",
            track_high_thresh=TRACK_HIGH_THRESH,
            track_low_thresh=TRACK_LOW_THRESH,
            new_track_thresh=NEW_TRACK_THRESH,
            track_buffer=buffer_frames,
            match_thresh=match_thresh,
            fuse_score=True,
        )
        self.tracker = BYTETracker(args)
        logger.info(f"ByteTrack ready (track_buffer={buffer_frames} frames, match_thresh={match_thresh})")

    def update(self, boxes, frame):
        """
        boxes: the `.boxes` object from a YOLO result for this frame.
        Returns a list of {'track_id', 'bbox', 'confidence'} dicts.
        """
        if boxes is None or len(boxes) == 0:
            return []
        det = boxes.cpu().numpy()
        tracked = self.tracker.update(det, frame)
        results = []
        # Each row: x1, y1, x2, y2, track_id, confidence, class, detection_index
        for row in tracked:
            results.append({
                "track_id": int(row[4]),
                "bbox": [float(row[0]), float(row[1]), float(row[2]), float(row[3])],
                "confidence": float(row[5]),
            })
        return results