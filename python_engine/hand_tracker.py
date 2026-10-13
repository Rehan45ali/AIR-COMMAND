"""
Hand Tracker Module for GestureMouse AI
Provides webcam video capture, MediaPipe Hands landmark detection,
error recovery, and HUD visual overlay rendering.
"""

import time
from typing import Optional, List, Dict, Tuple, Any

try:
    import cv2
    import mediapipe as mp
    HAS_CV2_MEDIAPIPE = True
except Exception:
    HAS_CV2_MEDIAPIPE = False

from .config import AppConfig


class HandTracker:
    def __init__(self, config: Optional[AppConfig] = None):
        self.config = config or AppConfig()
        self.cap = None
        self.mp_hands = None
        self.hands = None
        self.mp_drawing = None
        
        self.fps: float = 0.0
        self.prev_frame_time: float = time.time()
        self.is_connected: bool = False

        if HAS_CV2_MEDIAPIPE:
            self.mp_hands = mp.solutions.hands
            self.hands = self.mp_hands.Hands(
                static_image_mode=False,
                max_num_hands=1,
                min_detection_confidence=self.config.min_detection_confidence,
                min_tracking_confidence=self.config.min_tracking_confidence
            )
            self.mp_drawing = mp.solutions.drawing_utils

    def start_camera(self, camera_id: Optional[int] = None) -> bool:
        """Initializes OpenCV VideoCapture."""
        if not HAS_CV2_MEDIAPIPE:
            return False

        cam_idx = camera_id if camera_id is not None else self.config.camera_id
        try:
            self.cap = cv2.VideoCapture(cam_idx)
            if not self.cap.isOpened():
                self.is_connected = False
                return False

            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.config.frame_width)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.config.frame_height)
            self.is_connected = True
            return True
        except Exception as e:
            print(f"[HandTracker] Camera init error: {e}")
            self.is_connected = False
            return False

    def stop_camera(self):
        """Releases camera and cleanup."""
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None
        self.is_connected = False

    def process_frame(self, frame=None) -> Tuple[bool, Any, List[Dict[str, float]]]:
        """
        Reads frame (or uses provided), computes MediaPipe landmarks.
        Returns: (success, annotated_frame, landmarks_list)
        """
        now = time.time()
        dt = max(now - self.prev_frame_time, 0.001)
        self.fps = 0.9 * self.fps + 0.1 * (1.0 / dt)
        self.prev_frame_time = now

        if frame is None:
            if not self.is_connected or not self.cap:
                return False, None, []
            ret, frame = self.cap.read()
            if not ret or frame is None:
                return False, None, []

        # Mirror frame horizontally for natural user interaction
        if HAS_CV2_MEDIAPIPE:
            frame = cv2.flip(frame, 1)
            h, w, c = frame.shape

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.hands.process(rgb_frame)

            landmarks_list: List[Dict[str, float]] = []

            if results.multi_hand_landmarks:
                for hand_landmarks in results.multi_hand_landmarks:
                    # Extract 21 landmarks normalized
                    for lm in hand_landmarks.landmark:
                        landmarks_list.append({
                            "x": lm.x,
                            "y": lm.y,
                            "z": lm.z
                        })

                    # Draw standard landmarks if overlay enabled
                    if self.config.show_visual_overlay:
                        self.mp_drawing.draw_landmarks(
                            frame,
                            hand_landmarks,
                            self.mp_hands.HAND_CONNECTIONS,
                            self.mp_drawing.DrawingSpec(color=(0, 255, 200), thickness=2, circle_radius=3),
                            self.mp_drawing.DrawingSpec(color=(255, 120, 0), thickness=2)
                        )
                return True, frame, landmarks_list

            return True, frame, []

        return False, None, []

    def draw_hud_overlay(self, frame, active_gesture: str, cursor_x: int, cursor_y: int, status_str: str = "ACTIVE"):
        """Renders futuristic HUD overlay with telemetry and metrics."""
        if not HAS_CV2_MEDIAPIPE or frame is None:
            return frame

        h, w, _ = frame.shape

        # Top status bar background
        cv2.rectangle(frame, (10, 10), (w - 10, 50), (20, 25, 35), -1)
        cv2.rectangle(frame, (10, 10), (w - 10, 50), (0, 200, 255), 1)

        # Telemetry text
        hud_text = f"STATUS: {status_str} | FPS: {int(self.fps)} | GESTURE: {active_gesture} | POS: ({cursor_x}, {cursor_y})"
        cv2.putText(frame, hud_text, (20, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 230), 2)

        return frame
