"""
Mouse Controller for GestureMouse AI
Coordinates mapping, smoothing, jitter suppression, and cross-platform automation.
Includes headless/safe fallback when PyAutoGUI or DISPLAY is unavailable.
"""

import math
import time
from typing import Tuple, Optional
from .config import SensitivityConfig

# Attempt to import pyautogui safely with failsafe check
try:
    import pyautogui
    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.001
    HAS_PYAUTOGUI = True
except Exception:
    HAS_PYAUTOGUI = False


class MouseController:
    def __init__(self, sensitivity: Optional[SensitivityConfig] = None, screen_size: Optional[Tuple[int, int]] = None):
        self.sensitivity = sensitivity or SensitivityConfig()
        
        # Screen resolution detection
        if screen_size:
            self.screen_width, self.screen_height = screen_size
        elif HAS_PYAUTOGUI:
            try:
                self.screen_width, self.screen_height = pyautogui.size()
            except Exception:
                self.screen_width, self.screen_height = 1920, 1080
        else:
            self.screen_width, self.screen_height = 1920, 1080

        # State tracking for smoothing & velocity calculation
        self.current_x: float = self.screen_width / 2.0
        self.current_y: float = self.screen_height / 2.0
        self.prev_raw_x: float = 0.5
        self.prev_raw_y: float = 0.5
        self.last_update_time: float = time.time()
        self.is_mouse_down: bool = False
        self.action_history = []

    def update_sensitivity(self, config: SensitivityConfig):
        self.sensitivity = config

    def map_coordinates(self, norm_x: float, norm_y: float) -> Tuple[float, float]:
        """
        Maps normalized camera coordinates (0.0 to 1.0) to screen pixel coordinates,
        taking dead zones and inversion into account.
        """
        # Apply mirror inversion if enabled
        target_norm_x = 1.0 - norm_x if self.sensitivity.invert_x else norm_x
        target_norm_y = 1.0 - norm_y if self.sensitivity.invert_y else norm_y

        # Deadzone clamping / scaling
        dz = self.sensitivity.deadzone_ratio
        clamped_x = (target_norm_x - dz) / max(1.0 - 2 * dz, 0.01)
        clamped_y = (target_norm_y - dz) / max(1.0 - 2 * dz, 0.01)

        clamped_x = max(0.0, min(1.0, clamped_x))
        clamped_y = max(0.0, min(1.0, clamped_y))

        # Center relative scaling for sensitivity
        center_x = 0.5
        center_y = 0.5
        offset_x = (clamped_x - center_x) * self.sensitivity.x_sensitivity
        offset_y = (clamped_y - center_y) * self.sensitivity.y_sensitivity

        mapped_x = (center_x + offset_x) * self.screen_width
        mapped_y = (center_y + offset_y) * self.screen_height

        # Clamp strictly to screen bounds
        screen_x = max(0.0, min(float(self.screen_width - 1), mapped_x))
        screen_y = max(0.0, min(float(self.screen_height - 1), mapped_y))

        return screen_x, screen_y

    def smooth_position(self, target_x: float, target_y: float) -> Tuple[int, int]:
        """
        Applies dynamic Exponential Moving Average (EMA) smoothing with tremor suppression.
        """
        dx = target_x - self.current_x
        dy = target_y - self.current_y
        dist = math.sqrt(dx * dx + dy * dy)

        # Micro-tremor suppression: do not move if variation is negligible (< 2.5px)
        if dist < 2.5:
            return int(self.current_x), int(self.current_y)

        # Dynamic smoothing factor: faster motion -> lower smoothing (more responsive)
        base_smoothing = self.sensitivity.smoothing_factor
        adaptive_alpha = 1.0 - base_smoothing
        if self.sensitivity.acceleration_enabled and dist > 40:
            adaptive_alpha = min(1.0, adaptive_alpha * self.sensitivity.acceleration_factor)

        self.current_x = (adaptive_alpha * target_x) + ((1.0 - adaptive_alpha) * self.current_x)
        self.current_y = (adaptive_alpha * target_y) + ((1.0 - adaptive_alpha) * self.current_y)

        return int(round(self.current_x)), int(round(self.current_y))

    def move_to(self, norm_x: float, norm_y: float) -> Tuple[int, int]:
        """Maps, smooths, and executes cursor movement."""
        raw_screen_x, raw_screen_y = self.map_coordinates(norm_x, norm_y)
        final_x, final_y = self.smooth_position(raw_screen_x, raw_screen_y)

        if HAS_PYAUTOGUI:
            try:
                pyautogui.moveTo(final_x, final_y)
            except Exception as e:
                # E.g. FailSafeException if cursor moved to corner
                pass

        self._log_action("MOVE", {"x": final_x, "y": final_y})
        return final_x, final_y

    def left_click(self):
        if HAS_PYAUTOGUI:
            try:
                pyautogui.click(button="left")
            except Exception:
                pass
        self._log_action("LEFT_CLICK", {"x": int(self.current_x), "y": int(self.current_y)})

    def right_click(self):
        if HAS_PYAUTOGUI:
            try:
                pyautogui.click(button="right")
            except Exception:
                pass
        self._log_action("RIGHT_CLICK", {"x": int(self.current_x), "y": int(self.current_y)})

    def double_click(self):
        if HAS_PYAUTOGUI:
            try:
                pyautogui.doubleClick(button="left")
            except Exception:
                pass
        self._log_action("DOUBLE_CLICK", {"x": int(self.current_x), "y": int(self.current_y)})

    def mouse_down(self):
        if not self.is_mouse_down:
            self.is_mouse_down = True
            if HAS_PYAUTOGUI:
                try:
                    pyautogui.mouseDown(button="left")
                except Exception:
                    pass
            self._log_action("MOUSE_DOWN", {})

    def mouse_up(self):
        if self.is_mouse_down:
            self.is_mouse_down = False
            if HAS_PYAUTOGUI:
                try:
                    pyautogui.mouseUp(button="left")
                except Exception:
                    pass
            self._log_action("MOUSE_UP", {})

    def scroll(self, delta: float):
        steps = int(round(delta))
        if steps != 0 and HAS_PYAUTOGUI:
            try:
                # Negative delta scrolls down, positive scrolls up
                pyautogui.scroll(steps)
            except Exception:
                pass
        self._log_action("SCROLL", {"steps": steps})

    def center_cursor(self):
        self.current_x = self.screen_width / 2.0
        self.current_y = self.screen_height / 2.0
        if HAS_PYAUTOGUI:
            try:
                pyautogui.moveTo(int(self.current_x), int(self.current_y))
            except Exception:
                pass
        self._log_action("CENTER", {})

    def _log_action(self, action: str, details: dict):
        entry = {"action": action, "timestamp": time.time(), "details": details}
        self.action_history.append(entry)
        if len(self.action_history) > 50:
            self.action_history.pop(0)
