import cv2
import mediapipe as mp
import math
import numpy as np
import time
import os

# Import Tasks API
try:
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
except ImportError:
    pass

class OneEuroFilter:
    def __init__(self, t0, x0, dx0=0.0, min_cutoff=1.0, beta=0.0, d_cutoff=1.0):
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.d_cutoff = d_cutoff
        self.x_prev = x0
        self.dx_prev = dx0
        self.t_prev = t0

    def smoothing_factor(self, t_e, cutoff):
        r = 2 * math.pi * cutoff * t_e
        return r / (r + 1)

    def exponential_smoothing(self, a, x, x_prev):
        return a * x + (1 - a) * x_prev

    def filter(self, t, x):
        t_e = t - self.t_prev
        self.t_prev = t
        if t_e <= 0: return self.x_prev

        a_d = self.smoothing_factor(t_e, self.d_cutoff)
        dx = (x - self.x_prev) / t_e
        dx_hat = self.exponential_smoothing(a_d, dx, self.dx_prev)

        cutoff = self.min_cutoff + self.beta * abs(dx_hat)
        a = self.smoothing_factor(t_e, cutoff)
        x_hat = self.exponential_smoothing(a, x, self.x_prev)

        self.x_prev = x_hat
        self.dx_prev = dx_hat
        return x_hat

class GestureController:
    def __init__(self, min_detection_confidence=0.7, min_tracking_confidence=0.7):
        # Setup Tasks API
        base_options = python.BaseOptions(model_asset_path=os.path.join("data", "hand_landmarker.task"))
        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.VIDEO,
            num_hands=1,
            min_hand_detection_confidence=min_detection_confidence,
            min_hand_presence_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence
        )
        self.landmarker = vision.HandLandmarker.create_from_options(options)
        
        # Connections for manual drawing
        self.connections = [
            (0, 1), (1, 2), (2, 3), (3, 4),           # Thumb
            (0, 5), (5, 6), (6, 7), (7, 8),           # Index
            (5, 9), (9, 10), (10, 11), (11, 12),      # Middle
            (9, 13), (13, 14), (14, 15), (15, 16),    # Ring
            (13, 17), (17, 18), (18, 19), (19, 20),   # Pinky
            (0, 17)                                   # Wrist to Pinky base
        ]
        
        t = time.perf_counter()
        # Adjusted for responsiveness vs smoothness
        self.filter_x = OneEuroFilter(t, 0, min_cutoff=0.01, beta=20.0) 
        self.filter_y = OneEuroFilter(t, 0, min_cutoff=0.01, beta=20.0)
        self.filter_z = OneEuroFilter(t, 0, min_cutoff=0.5, beta=1.0)
        self.filter_pinch = OneEuroFilter(t, 0, min_cutoff=0.01, beta=10.0) # New filter for pinch
        
        self.current_state = "HOVER"
        
    def draw_skeleton(self, frame, landmarks):
        h, w, _ = frame.shape
        
        # Draw connections
        for start_idx, end_idx in self.connections:
            start = landmarks[start_idx]
            end = landmarks[end_idx]
            cv2.line(frame, 
                     (int(start.x * w), int(start.y * h)), 
                     (int(end.x * w), int(end.y * h)), 
                     (0, 255, 0), 2) # Green lines
                     
        # Draw keypoints
        for lm in landmarks:
            cv2.circle(frame, (int(lm.x * w), int(lm.y * h)), 4, (0, 0, 255), -1) # Red dots
            
    def process_frame(self, frame):
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        timestamp_ms = int(time.perf_counter() * 1000)
        
        try:
            detection_result = self.landmarker.detect_for_video(mp_image, timestamp_ms)
        except Exception as e:
            return None, frame
        
        gesture_data = None
        annotated_frame = frame.copy()

        # Defaults
        gesture_name = "HOVER"
        
        if detection_result.hand_landmarks:
            landmarks = detection_result.hand_landmarks[0]
            
            # Draw Skeleton (Professional Green Style)
            self.draw_skeleton(annotated_frame, landmarks)
            
            wrist = landmarks[0]
            thumb_tip = landmarks[4]
            index_tip = landmarks[8]
            
            # --- SPATIAL COORDINATES ---
            # Center X/Y (0.5 becomes 0)
            raw_x = (wrist.x - 0.5) * 2
            raw_y = (wrist.y - 0.5) * 2
            
            t = time.perf_counter()
            smooth_x = self.filter_x.filter(t, raw_x)
            smooth_y = self.filter_y.filter(t, raw_y)

            # --- GESTURE CLASSIFICATION ---
            
            # Helper: Check if finger is curled using Distance to Wrist logic
            def is_curled(tip_idx, pip_idx):
                d_tip = math.hypot(landmarks[tip_idx].x - landmarks[0].x, landmarks[tip_idx].y - landmarks[0].y)
                d_pip = math.hypot(landmarks[pip_idx].x - landmarks[0].x, landmarks[pip_idx].y - landmarks[0].y)
                # If tip is closer to wrist than PIP, it's definitively curled
                return d_tip < d_pip

            index_curled = is_curled(8, 6)
            middle_curled = is_curled(12, 10)
            ring_curled = is_curled(16, 14)
            pinky_curled = is_curled(20, 18)
            
            # FIST: All 4 fingers curled
            is_fist = index_curled and middle_curled and ring_curled and pinky_curled
            
            # POINT: Index extended, others curled
            is_pointing = (not index_curled) and middle_curled and ring_curled and pinky_curled
            
            gesture_name = "IDLE"
            if is_fist:
                gesture_name = "GRAB"
            elif is_pointing:
                gesture_name = "POINT"
            
            self.current_state = gesture_name
            
            # Distance between Thumb Tip (4) and Index Tip (8)
            raw_pinch = math.hypot(thumb_tip.x - index_tip.x, thumb_tip.y - index_tip.y)
            smooth_pinch = self.filter_pinch.filter(t, raw_pinch)
            
            # Visual Debug
            color = (0, 255, 0) # Green (Idle/Zoom Ready)
            if gesture_name == "GRAB": color = (0, 165, 255) # Orange

            cv2.putText(annotated_frame, f"State: {gesture_name}", (10, 50), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
            cv2.putText(annotated_frame, f"Pinch: {smooth_pinch:.3f}", (10, 90), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)

            # Draw Pinch Line
            if not is_fist:
                h, w, _ = frame.shape
                cv2.line(annotated_frame, 
                         (int(thumb_tip.x * w), int(thumb_tip.y * h)),
                         (int(index_tip.x * w), int(index_tip.y * h)),
                         (255, 255, 0), 2)

            gesture_data = {
                "is_tracking": True,
                "gesture": gesture_name,
                "x": round(smooth_x, 4),
                "y": round(smooth_y, 4),
                "pinch_dist": round(smooth_pinch, 4)
            }
            
        return gesture_data, annotated_frame
