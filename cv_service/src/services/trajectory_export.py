import os
import re
import json
import math
import logging

logger = logging.getLogger("HeatVision.TrajectoryExport")

current_dir = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUTPUT_DIR = os.path.join(current_dir, '..', '..', '..', 'data', 'processed')


def _is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def build_trajectory_documents(session_summaries, camera_id):
    """Turn completed session summaries into schema documents (Issue #27)."""
    documents = []
    for s in session_summaries:
        documents.append({
            'track_id': int(s['track_id']),
            'camera_id': str(camera_id),
            'start_time': float(s['enter_time']),
            'end_time': float(s['exit_time']),
            'path': [
                {'t': float(p['t']), 'x': float(p['x']), 'y': float(p['y'])}
                for p in s.get('path', [])
            ],
        })
    return documents


def validate_trajectory_document(doc):
    """Return a list of problems with a trajectory document. Empty list means it is valid."""
    errors = []
    if not isinstance(doc, dict):
        return ['document is not an object']

    for field in ('track_id', 'camera_id', 'start_time', 'end_time', 'path'):
        if field not in doc:
            errors.append(f"missing field '{field}'")
    if errors:
        return errors

    if not isinstance(doc['track_id'], int) or isinstance(doc['track_id'], bool):
        errors.append('track_id must be an integer')
    if not isinstance(doc['camera_id'], str) or not doc['camera_id']:
        errors.append('camera_id must be a non-empty string')
    if not _is_number(doc['start_time']) or not _is_number(doc['end_time']):
        errors.append('start_time and end_time must be numbers')
    elif doc['end_time'] < doc['start_time']:
        errors.append('end_time is before start_time')

    path = doc['path']
    if not isinstance(path, list) or len(path) == 0:
        errors.append('path must be a non-empty list')
        return errors

    last_t = None
    for i, point in enumerate(path):
        if not isinstance(point, dict) or not all(k in point for k in ('t', 'x', 'y')):
            errors.append(f'path[{i}] must have t, x and y')
            break
        if not all(_is_number(point[k]) for k in ('t', 'x', 'y')):
            errors.append(f'path[{i}] has a non-numeric value')
            break
        if last_t is not None and point['t'] < last_t:
            errors.append(f'path[{i}] goes back in time')
            break
        last_t = point['t']
    return errors


def export_trajectories(session_summaries, video_path, camera_id=None, output_dir=None):
    """
    Validate and save every shopper trajectory to <output_dir>/<video_id>_trajectories.json.
    Returns {'file', 'exported', 'rejected'}.
    """
    video_id = re.sub(r'[^A-Za-z0-9_-]+', '_', os.path.splitext(os.path.basename(str(video_path)))[0]).strip('_') or 'video'
    camera_id = camera_id or 'unknown'
    output_dir = output_dir or DEFAULT_OUTPUT_DIR
    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.normpath(os.path.join(output_dir, f"{video_id}_trajectories.json"))

    valid, rejected = [], 0
    for doc in build_trajectory_documents(session_summaries, camera_id):
        problems = validate_trajectory_document(doc)
        if problems:
            rejected += 1
            logger.warning(f"Rejected trajectory for ID {doc.get('track_id')}: {'; '.join(problems)}")
        else:
            valid.append(doc)

    with open(out_path, 'w') as f:
        json.dump(valid, f, indent=2)

    logger.info(f"Exported {len(valid)} trajectories to {out_path} ({rejected} rejected)")
    return {'file': out_path, 'exported': len(valid), 'rejected': rejected}