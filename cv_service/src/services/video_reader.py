import os
import cv2
from .person_detection import detect_people
from .bottom_center import calculate_bottom_center

current_dir = os.path.dirname(os.path.abspath(__file__))
path = os.path.join(current_dir, '..', '..', '..', 'data', 'dummy', 'dummy video 2.mp4')

def read_video(path=path):
    vid_capture=cv2.VideoCapture(path)
    if vid_capture.isOpened():
        frame_width=int(vid_capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height=int(vid_capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps=vid_capture.get(cv2.CAP_PROP_FPS)
        frame_count=int(vid_capture.get(cv2.CAP_PROP_FRAME_COUNT))
    
        print("Width: ",frame_width)
        print("Height: ",frame_height)
        print("FPS: ",fps)
        print("Frame Count: ",frame_count)
        frame_count=0

    else:
        print('Error')


    while True:
        ret,frame = vid_capture.read()

        if ret==False:
            break

        frame_count += 1

        # Skip every other frame (play video at 2x speed)
        if frame_count % 2 != 0:
            continue

        tracks = detect_people(frame)
        
        for track in tracks:
            boxes=track.boxes
            for box in boxes:
                # get confidence score
                confidence=box.conf[0].cpu().numpy()
                # get bbox
                x1,y1,x2,y2=box.xyxy[0].cpu().numpy()
                # calculate feet point
                x_feet,y_feet=calculate_bottom_center(x1,x2,y1,y2)
                # draw person tracking box
                cv2.rectangle(img=frame,pt1=(int(x1),int(y1)),pt2=(int(x2),int(y2)),color=(0,255,0),thickness=2)

                # draw confidence score
                label = f"Person\n Confidence : {confidence:.2f}"
                cv2.putText(
                    img=frame,
                    text=label,
                    org=(int(x1), int(y1) - 10),
                    fontFace=cv2.FONT_HERSHEY_SIMPLEX,
                    fontScale=0.4,
                    color=(0, 255, 0),
                    thickness=2
                )
                # draw feet point
                cv2.circle(img=frame,center=(int(x_feet),int(y_feet)),radius=5,color=(0,0,255),thickness=5)

        cv2.imshow('Frame',frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
        

    vid_capture.release()
    cv2.destroyAllWindows()