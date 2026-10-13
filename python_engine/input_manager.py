"""
Input Manager for GestureMouse AI
Coordinates voice commands and gesture recognizer, maintains system state machine,
resolves input conflicts, and dispatches actions to MouseController.
"""

from enum import Enum, auto
import time
from typing import Optional, Dict, Any, Callable
from .config import AppConfig, PROFILES
from .gesture_recognition import GestureRecognizer, GestureType, LandmarkIndex
from .mouse_controller import MouseController
from .voice_controller import VoiceController


class SystemState(Enum):
    IDLE = "IDLE"
    INITIALIZING = "INITIALIZING"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    STOPPED = "STOPPED"


class ControlMode(Enum):
    COMBINED = "COMBINED"
    GESTURE_ONLY = "GESTURE_ONLY"
    VOICE_ONLY = "VOICE_ONLY"


class InputManager:
    def __init__(self, config: Optional[AppConfig] = None, event_callback: Optional[Callable[[str, Any], None]] = None):
        self.config = config or AppConfig()
        self.state = SystemState.INITIALIZING
        self.mode = ControlMode.COMBINED
        self.event_callback = event_callback

        # Initialize sub-components
        self.gesture_recognizer = GestureRecognizer(self.config.thresholds)
        self.mouse_controller = MouseController(self.config.sensitivity)
        self.voice_controller = VoiceController(self.config.voice, command_callback=self.on_voice_command)

        # Telemetry & metrics
        self.active_gesture: GestureType = GestureType.NONE
        self.last_voice_command: Optional[str] = None
        self.last_action_time: float = time.time()
        self.cursor_pos = (self.mouse_controller.screen_width // 2, self.mouse_controller.screen_height // 2)

        self.state = SystemState.ACTIVE

    def on_voice_command(self, cmd: str, payload: Dict[str, Any]):
        """Dispatches recognized voice command through system state machine and safety rules."""
        self.last_voice_command = cmd

        # Emergency & State management priority
        if cmd == "PAUSE":
            self.set_state(SystemState.PAUSED)
            self._notify_event("STATE_CHANGED", {"state": self.state.value})
            return
        elif cmd == "RESUME" or cmd == "ACTIVATE":
            self.set_state(SystemState.ACTIVE)
            self._notify_event("STATE_CHANGED", {"state": self.state.value})
            return
        elif cmd == "DISABLE" or cmd == "EXIT":
            self.set_state(SystemState.STOPPED)
            self._notify_event("STATE_CHANGED", {"state": self.state.value})
            return

        # Ignore cursor actions if paused or stopped or in GESTURE_ONLY mode
        if self.state != SystemState.ACTIVE or self.mode == ControlMode.GESTURE_ONLY:
            return

        # Execute voice mouse commands
        if cmd == "LEFT_CLICK":
            self.mouse_controller.left_click()
            self._notify_event("VOICE_ACTION", {"action": "LEFT_CLICK"})
        elif cmd == "RIGHT_CLICK":
            self.mouse_controller.right_click()
            self._notify_event("VOICE_ACTION", {"action": "RIGHT_CLICK"})
        elif cmd == "DOUBLE_CLICK":
            self.mouse_controller.double_click()
            self._notify_event("VOICE_ACTION", {"action": "DOUBLE_CLICK"})
        elif cmd == "CENTER_CURSOR":
            self.mouse_controller.center_cursor()
            self.cursor_pos = (int(self.mouse_controller.current_x), int(self.mouse_controller.current_y))
            self._notify_event("VOICE_ACTION", {"action": "CENTER_CURSOR"})
        elif cmd == "START_SCROLL":
            self.mouse_controller.scroll(-5)
            self._notify_event("VOICE_ACTION", {"action": "SCROLL_DOWN"})
        elif cmd == "INCREASE_SENSITIVITY":
            self.config.sensitivity.x_sensitivity = min(3.0, self.config.sensitivity.x_sensitivity + 0.25)
            self.config.sensitivity.y_sensitivity = min(3.0, self.config.sensitivity.y_sensitivity + 0.25)
            self.mouse_controller.update_sensitivity(self.config.sensitivity)
            self._notify_event("CONFIG_UPDATED", {"sensitivity": self.config.sensitivity.x_sensitivity})
        elif cmd == "DECREASE_SENSITIVITY":
            self.config.sensitivity.x_sensitivity = max(0.5, self.config.sensitivity.x_sensitivity - 0.25)
            self.config.sensitivity.y_sensitivity = max(0.5, self.config.sensitivity.y_sensitivity - 0.25)
            self.mouse_controller.update_sensitivity(self.config.sensitivity)
            self._notify_event("CONFIG_UPDATED", {"sensitivity": self.config.sensitivity.x_sensitivity})

    def process_hand_landmarks(self, landmarks: list) -> Dict[str, Any]:
        """
        Coordinates hand landmarks with gesture recognition and mouse control.
        """
        if self.state != SystemState.ACTIVE or self.mode == ControlMode.VOICE_ONLY:
            return {"gesture": "PAUSED" if self.state == SystemState.PAUSED else "INACTIVE", "cursor": self.cursor_pos}

        gesture, telemetry = self.gesture_recognizer.classify_gesture(landmarks)
        self.active_gesture = gesture

        # Handle pause/resume from gesture
        if gesture == GestureType.PAUSE:
            self.set_state(SystemState.PAUSED)
            return {"gesture": "PAUSED", "cursor": self.cursor_pos}
        elif gesture == GestureType.RESUME:
            self.set_state(SystemState.ACTIVE)

        # Move mouse cursor using Index Fingertip (Landmark 8)
        if len(landmarks) > LandmarkIndex.INDEX_TIP:
            idx_tip = landmarks[LandmarkIndex.INDEX_TIP]
            x, y = self.mouse_controller.move_to(idx_tip['x'], idx_tip['y'])
            self.cursor_pos = (x, y)

        # Execute gesture actions
        if gesture == GestureType.LEFT_CLICK:
            self.mouse_controller.left_click()
            self._notify_event("GESTURE_ACTION", {"action": "LEFT_CLICK"})
        elif gesture == GestureType.RIGHT_CLICK:
            self.mouse_controller.right_click()
            self._notify_event("GESTURE_ACTION", {"action": "RIGHT_CLICK"})
        elif gesture == GestureType.DOUBLE_CLICK:
            self.mouse_controller.double_click()
            self._notify_event("GESTURE_ACTION", {"action": "DOUBLE_CLICK"})
        elif gesture == GestureType.DRAG_START:
            self.mouse_controller.mouse_down()
            self._notify_event("GESTURE_ACTION", {"action": "DRAG_START"})
        elif gesture == GestureType.DRAG_RELEASE:
            self.mouse_controller.mouse_up()
            self._notify_event("GESTURE_ACTION", {"action": "DRAG_RELEASE"})
        elif gesture == GestureType.SCROLL:
            delta = telemetry.get("scroll_delta", 0.0)
            if abs(delta) > 0.5:
                self.mouse_controller.scroll(delta)
                self._notify_event("GESTURE_ACTION", {"action": "SCROLL", "delta": delta})

        return {
            "gesture": gesture.value,
            "cursor": self.cursor_pos,
            "telemetry": telemetry
        }

    def set_state(self, new_state: SystemState):
        self.state = new_state
        if new_state == SystemState.PAUSED:
            self.gesture_recognizer.is_paused = True
            if self.mouse_controller.is_mouse_down:
                self.mouse_controller.mouse_up()
        elif new_state == SystemState.ACTIVE:
            self.gesture_recognizer.is_paused = False

    def set_mode(self, new_mode: ControlMode):
        self.mode = new_mode

    def apply_profile(self, profile_name: str) -> bool:
        """Loads and applies a named profile."""
        if profile_name in PROFILES:
            target = PROFILES[profile_name]
            self.config.sensitivity = target.sensitivity
            self.config.thresholds = target.thresholds
            self.config.active_profile_name = profile_name
            self.mouse_controller.update_sensitivity(self.config.sensitivity)
            self.gesture_recognizer.update_thresholds(self.config.thresholds)
            self._notify_event("PROFILE_APPLIED", {"profile": profile_name})
            return True
        return False

    def _notify_event(self, event_type: str, data: Any):
        if self.event_callback:
            try:
                self.event_callback(event_type, data)
            except Exception:
                pass
