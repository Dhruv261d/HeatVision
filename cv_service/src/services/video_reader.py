import os
import cv2
import json

from .person_detection import detect_people
from .bottom_center import calculate_bottom_center
from .roi import is_point_inside_roi, draw_roi


current_dir = os.path.dirname(os.path.abspath(__file__))

default_path = os.path.join(
    current_dir,
    '..',
    '..',
    '..',
    'footage',
    'cctv footage.mp4'
)


# ---------------------------------------------------------
# OUTPUT DIRECTORY
# ---------------------------------------------------------

output_dir = os.path.join(
    current_dir,
    '..',
    '..',
    '..',
    'output'
)

os.makedirs(output_dir, exist_ok=True)


# Saved debug video
debug_video_path = os.path.join(
    output_dir,
    'debug_output.mp4'
)


# Saved detection JSON
json_output_path = os.path.join(
    output_dir,
    'detections.json'
)


def read_video(video_path=default_path):

    vid_capture = cv2.VideoCapture(video_path)

    if not vid_capture.isOpened():
        print(
            f"[CV Error]: Unable to open video source: "
            f"{video_path}"
        )
        return []

    frame_width = int(
        vid_capture.get(cv2.CAP_PROP_FRAME_WIDTH)
    )

    frame_height = int(
        vid_capture.get(cv2.CAP_PROP_FRAME_HEIGHT)
    )

    fps = vid_capture.get(
        cv2.CAP_PROP_FPS
    )

    total_frames = int(
        vid_capture.get(cv2.CAP_PROP_FRAME_COUNT)
    )

    print(
        f"[Video Metadata]: "
        f"Resolution: {frame_width}x{frame_height} | "
        f"FPS: {fps} | "
        f"Total Frames: {total_frames}"
    )


    # -----------------------------------------------------
    # DEBUG VIDEO WRITER
    # -----------------------------------------------------

    fourcc = cv2.VideoWriter_fourcc(
        *'mp4v'
    )

    debug_writer = cv2.VideoWriter(
        debug_video_path,
        fourcc,
        fps,
        (frame_width, frame_height)
    )


    frame_count = 0

    detections_log = []


    # -----------------------------------------------------
    # VIDEO LOOP
    # -----------------------------------------------------

    while True:

        ret, frame = vid_capture.read()

        if not ret:
            break

        frame_count += 1


        # -------------------------------------------------
        # Skip every other frame
        # -------------------------------------------------

        if frame_count % 2 != 0:
            continue


        # -------------------------------------------------
        # ROI OVERLAY
        # -------------------------------------------------

        draw_roi(frame)


        # -------------------------------------------------
        # PERSON DETECTION
        # -------------------------------------------------

        tracks = detect_people(frame)

        frame_detections = []


        # -------------------------------------------------
        # PROCESS DETECTIONS
        # -------------------------------------------------

        for track in tracks:

            boxes = track.boxes

            for box in boxes:

                # -----------------------------------------
                # CONFIDENCE
                # -----------------------------------------

                confidence = float(
                    box.conf[0].cpu().numpy()
                )


                # -----------------------------------------
                # BOUNDING BOX
                # -----------------------------------------

                x1, y1, x2, y2 = (
                    box.xyxy[0]
                    .cpu()
                    .numpy()
                )


                # -----------------------------------------
                # FOOT POINT
                # -----------------------------------------

                x_feet, y_feet = calculate_bottom_center(
                    x1,
                    x2,
                    y1,
                    y2
                )


                # -----------------------------------------
                # ROI CHECK
                # -----------------------------------------

                inside_roi = is_point_inside_roi(
                    x_feet,
                    y_feet
                )


                # -----------------------------------------
                # IGNORE DETECTION OUTSIDE ROI
                # -----------------------------------------

                if not inside_roi:
                    continue


                # -----------------------------------------
                # DETECTION DATA
                # -----------------------------------------

                detection = {
                    'bbox': [
                        float(x1),
                        float(y1),
                        float(x2),
                        float(y2)
                    ],

                    'feet': [
                        float(x_feet),
                        float(y_feet)
                    ],

                    'confidence': round(
                        confidence,
                        2
                    )
                }


                frame_detections.append(
                    detection
                )


                # -----------------------------------------
                # BOUNDING BOX OVERLAY
                # -----------------------------------------

                cv2.rectangle(
                    img=frame,
                    pt1=(
                        int(x1),
                        int(y1)
                    ),
                    pt2=(
                        int(x2),
                        int(y2)
                    ),
                    color=(0, 255, 0),
                    thickness=2
                )


                # -----------------------------------------
                # CONFIDENCE LABEL
                # -----------------------------------------

                label = (
                    f"Person: "
                    f"{confidence:.2f}"
                )

                cv2.putText(
                    img=frame,
                    text=label,
                    org=(
                        int(x1),
                        int(y1) - 10
                    ),
                    fontFace=cv2.FONT_HERSHEY_SIMPLEX,
                    fontScale=0.5,
                    color=(0, 255, 0),
                    thickness=2
                )


                # -----------------------------------------
                # FOOT POINT OVERLAY
                # -----------------------------------------

                cv2.circle(
                    img=frame,
                    center=(
                        int(x_feet),
                        int(y_feet)
                    ),
                    radius=5,
                    color=(0, 0, 255),
                    thickness=-1
                )


        # -------------------------------------------------
        # FRAME DETECTION LOG
        # -------------------------------------------------

        detections_log.append({
            'frame': frame_count,
            'detections': frame_detections
        })


        # -------------------------------------------------
        # SAVE DEBUG FRAME TO VIDEO
        # -------------------------------------------------

        debug_writer.write(frame)


        # -------------------------------------------------
        # DISPLAY
        # -------------------------------------------------

        cv2.imshow(
            'HeatVision CV Pipeline',
            frame
        )


        if cv2.waitKey(1) & 0xFF == ord('q'):
            break


    # -----------------------------------------------------
    # CLEANUP
    # -----------------------------------------------------

    vid_capture.release()

    debug_writer.release()

    cv2.destroyAllWindows()


    # -----------------------------------------------------
    # SAVE JSON
    # -----------------------------------------------------

    with open(
        json_output_path,
        'w',
        encoding='utf-8'
    ) as json_file:

        json.dump(
            detections_log,
            json_file,
            indent=4
        )


    print(
        f"[CV Output]: Debug video saved to: "
        f"{debug_video_path}"
    )

    print(
        f"[CV Output]: Detection JSON saved to: "
        f"{json_output_path}"
    )


    return detections_log