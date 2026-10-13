"""
Desktop User Interface and Visual Feedback for GestureMouse AI
Provides an OpenCV HUD display and an optional Tkinter/CLI dashboard.
"""

from typing import Dict, Any, Optional
import time

try:
    import cv2
    HAS_CV2 = True
except Exception:
    HAS_CV2 = False


class VisualInterface:
    def __init__(self, title: str = "GestureMouse AI - Control Terminal"):
        self.title = title
        self.log_messages = []
        self.start_time = time.time()

    def add_log(self, msg: str):
        self.log_messages.append(f"[{time.strftime('%H:%M:%S')}] {msg}")
        if len(self.log_messages) > 8:
            self.log_messages.pop(0)

    def render_dashboard_hud(
        self,
        frame,
        state: str,
        mode: str,
        gesture: str,
        voice_cmd: Optional[str],
        cursor_pos: tuple,
        fps: float,
        profile_name: str,
        pinch_dist: float,
        threshold: float
    ):
        """Draws a high-tech cyber HUD directly on the OpenCV preview window."""
        if not HAS_CV2 or frame is None:
            return frame

        h, w, _ = frame.shape

        # 1. Top Bar: System Status and Profile
        cv2.rectangle(frame, (12, 12), (w - 12, 54), (15, 23, 42), -1)
        status_color = (0, 255, 128) if state == "ACTIVE" else (0, 165, 255)
        cv2.rectangle(frame, (12, 12), (w - 12, 54), status_color, 1)

        header = f"AI VIRTUAL MOUSE | STATE: {state} | MODE: {mode} | PROFILE: {profile_name}"
        cv2.putText(frame, header, (22, 38), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        # 2. Bottom Telemetry Bar
        cv2.rectangle(frame, (12, h - 90), (w - 12, h - 12), (15, 23, 42), -1)
        cv2.rectangle(frame, (12, h - 90), (w - 12, h - 12), (56, 189, 248), 1)

        telemetry_line1 = f"GESTURE: {gesture}  |  VOICE: {voice_cmd or 'Listening...'}  |  FPS: {int(fps)}"
        telemetry_line2 = f"CURSOR: {cursor_pos[0]}x{cursor_pos[1]}  |  PINCH METER: {pinch_dist:.2f}/{threshold:.2f}"
        cv2.putText(frame, telemetry_line1, (22, h - 60), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 240, 255), 1)
        cv2.putText(frame, telemetry_line2, (22, h - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (180, 210, 240), 1)

        # 3. Pinch Gauge Progress Bar in HUD
        gauge_w = 120
        gauge_h = 8
        gauge_x = w - 150
        gauge_y = h - 38
        cv2.rectangle(frame, (gauge_x, gauge_y), (gauge_x + gauge_w, gauge_y + gauge_h), (50, 50, 60), -1)
        
        ratio = min(max((threshold - pinch_dist + 0.1) / (threshold + 0.1), 0.0), 1.0)
        filled_w = int(gauge_w * ratio)
        gauge_color = (0, 255, 0) if pinch_dist < threshold else (0, 200, 255)
        cv2.rectangle(frame, (gauge_x, gauge_y), (gauge_x + filled_w, gauge_y + gauge_h), gauge_color, -1)

        return frame

    def show(self, frame) -> bool:
        """Renders the window and waits for ESC key."""
        if not HAS_CV2 or frame is None:
            return True
        cv2.imshow(self.title, frame)
        key = cv2.waitKey(1) & 0xFF
        # Return False if ESC or 'q' pressed
        if key in [27, ord('q')]:
            return False
        return True

    def close(self):
        if HAS_CV2:
            try:
                cv2.destroyAllWindows()
            except Exception:
                pass
