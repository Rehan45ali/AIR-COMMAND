"""
GestureMouse AI - Main Application Entry Point
Unified voice and hand gesture-controlled virtual mouse system.
"""

import argparse
import signal
import sys
import time

from .config import AppConfig, PROFILES
from .hand_tracker import HandTracker
from .input_manager import InputManager, SystemState, ControlMode
from .ui import VisualInterface


class GestureMouseApp:
    def __init__(self, config_file: str = "config.json", camera_id: int = 0, profile_name: str = "Balanced Default"):
        self.config = AppConfig.load_from_file(config_file)
        self.config.camera_id = camera_id
        
        self.input_manager = InputManager(self.config, event_callback=self._on_event)
        if profile_name in PROFILES:
            self.input_manager.apply_profile(profile_name)

        self.hand_tracker = HandTracker(self.config)
        self.ui = VisualInterface("GestureMouse AI - Hand & Voice Controller")
        self.running = False

    def _on_event(self, event_type: str, data: any):
        # Log to UI
        if event_type == "GESTURE_ACTION":
            self.ui.add_log(f"Gesture: {data.get('action')}")
        elif event_type == "VOICE_ACTION":
            self.ui.add_log(f"Voice: {data.get('action')}")
        elif event_type == "STATE_CHANGED":
            self.ui.add_log(f"State: {data.get('state')}")

    def run(self, headless: bool = False):
        self.running = True

        # Register signals
        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGTERM, self._handle_signal)

        # Start voice controller
        self.input_manager.voice_controller.start()

        # Start camera
        cam_started = self.hand_tracker.start_camera(self.config.camera_id)
        if not cam_started and not headless:
            print("[Warning] Physical webcam could not be opened. Running in background/fallback mode.")

        print(f"==================================================")
        print(f"  GestureMouse AI System Started")
        print(f"  Mode: {self.input_manager.mode.value}")
        print(f"  Profile: {self.config.active_profile_name}")
        print(f"  Press 'q' or ESC in preview window to exit.")
        print(f"==================================================")

        try:
            while self.running:
                if self.input_manager.state == SystemState.STOPPED:
                    break

                success, frame, landmarks = self.hand_tracker.process_frame()

                # Process input coordinates
                result = self.input_manager.process_hand_landmarks(landmarks)
                active_gesture = result.get("gesture", "NONE")
                cursor_pos = result.get("cursor", (0, 0))
                telemetry = result.get("telemetry", {})

                if not headless and frame is not None:
                    # Draw HUD
                    hud_frame = self.ui.render_dashboard_hud(
                        frame=frame,
                        state=self.input_manager.state.value,
                        mode=self.input_manager.mode.value,
                        gesture=active_gesture,
                        voice_cmd=self.input_manager.last_voice_command,
                        cursor_pos=cursor_pos,
                        fps=self.hand_tracker.fps,
                        profile_name=self.config.active_profile_name,
                        pinch_dist=telemetry.get("pinch_distance", 1.0),
                        threshold=self.config.thresholds.pinch_threshold
                    )
                    
                    if not self.ui.show(hud_frame):
                        break
                else:
                    time.sleep(1.0 / self.config.target_fps)

        finally:
            self.shutdown()

    def _handle_signal(self, signum, frame):
        print("\n[Shutdown] Received termination signal, closing gracefully...")
        self.running = False

    def shutdown(self):
        self.running = False
        print("[Shutdown] Stopping voice listener...")
        self.input_manager.voice_controller.stop()
        print("[Shutdown] Stopping camera...")
        self.hand_tracker.stop_camera()
        print("[Shutdown] Closing UI windows...")
        self.ui.close()
        print("[Shutdown] GestureMouse AI exited cleanly.")


def main():
    parser = argparse.ArgumentParser(description="GestureMouse AI - Voice & Hand Gesture Virtual Mouse")
    parser.add_argument("--config", default="config.json", help="Path to configuration file")
    parser.add_argument("--camera", type=int, default=0, help="Camera device index")
    parser.add_argument("--profile", default="Balanced Default", help="Initial profile name")
    parser.add_argument("--mode", choices=["COMBINED", "GESTURE_ONLY", "VOICE_ONLY"], default="COMBINED")
    parser.add_argument("--headless", action="store_true", help="Run without OpenCV GUI window")

    args = parser.parse_args()

    app = GestureMouseApp(
        config_file=args.config,
        camera_id=args.camera,
        profile_name=args.profile
    )
    if args.mode:
        app.input_manager.set_mode(ControlMode(args.mode))

    app.run(headless=args.headless)


if __name__ == "__main__":
    main()
