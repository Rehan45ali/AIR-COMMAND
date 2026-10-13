"""
Gesture Recognition Engine for GestureMouse AI
Performs invariant geometric landmark analysis, gesture classification,
cooldown management, and state machine transitions.
"""

from enum import Enum, auto
import math
import time
from typing import List, Dict, Tuple, Optional, Any
from .config import GestureThresholds


class GestureType(Enum):
    NONE = "NONE"
    MOVE = "MOVE"
    LEFT_CLICK = "LEFT_CLICK"
    RIGHT_CLICK = "RIGHT_CLICK"
    DOUBLE_CLICK = "DOUBLE_CLICK"
    DRAG_START = "DRAG_START"
    DRAGGING = "DRAGGING"
    DRAG_RELEASE = "DRAG_RELEASE"
    SCROLL = "SCROLL"
    PAUSE = "PAUSE"
    RESUME = "RESUME"
    PEACE_SIGN = "PEACE_SIGN"
    FIST_LOCK = "FIST_LOCK"
    THUMBS_UP = "THUMBS_UP"
    ROCK_ON = "ROCK_ON"


class LandmarkIndex:
    WRIST = 0
    THUMB_CMC = 1
    THUMB_MCP = 2
    THUMB_IP = 3
    THUMB_TIP = 4
    INDEX_MCP = 5
    INDEX_PIP = 6
    INDEX_DIP = 7
    INDEX_TIP = 8
    MIDDLE_MCP = 9
    MIDDLE_PIP = 10
    MIDDLE_DIP = 11
    MIDDLE_TIP = 12
    RING_MCP = 13
    RING_PIP = 14
    RING_DIP = 15
    RING_TIP = 16
    PINKY_MCP = 17
    PINKY_PIP = 18
    PINKY_DIP = 19
    PINKY_TIP = 20


class GestureRecognizer:
    def __init__(self, thresholds: Optional[GestureThresholds] = None):
        self.thresholds = thresholds or GestureThresholds()
        self.last_click_time: float = 0.0
        self.last_pinch_time: float = 0.0
        self.pinch_start_time: Optional[float] = None
        self.is_dragging: bool = False
        self.was_pinching: bool = False
        self.was_right_pinching: bool = False
        
        # State tracking for scroll
        self.prev_scroll_y: Optional[float] = None
        
        # State tracking for pause
        self.palm_open_start_time: Optional[float] = None
        self.is_paused: bool = False

    def update_thresholds(self, thresholds: GestureThresholds):
        self.thresholds = thresholds

    @staticmethod
    def euclidean_distance(p1: Dict[str, float], p2: Dict[str, float]) -> float:
        """Euclidean distance between two 2D/3D points."""
        dx = p1.get('x', 0.0) - p2.get('x', 0.0)
        dy = p1.get('y', 0.0) - p2.get('y', 0.0)
        dz = p1.get('z', 0.0) - p2.get('z', 0.0)
        return math.sqrt(dx * dx + dy * dy + dz * dz)

    def compute_hand_scale(self, landmarks: List[Dict[str, float]]) -> float:
        """
        Normalize distance using wrist to middle finger MCP.
        Protects against division by zero and varying hand sizes.
        """
        if len(landmarks) < 21:
            return 1.0
        wrist = landmarks[LandmarkIndex.WRIST]
        middle_mcp = landmarks[LandmarkIndex.MIDDLE_MCP]
        scale = self.euclidean_distance(wrist, middle_mcp)
        return max(scale, 0.01)

    def analyze_finger_states(self, landmarks: List[Dict[str, float]]) -> Dict[str, bool]:
        """Check whether each finger is currently extended or curled."""
        if len(landmarks) < 21:
            return {"thumb": False, "index": False, "middle": False, "ring": False, "pinky": False}

        # Fingers are considered extended if tip is higher (lower Y) than PIP joint in normalized image space
        index_extended = landmarks[LandmarkIndex.INDEX_TIP]['y'] < landmarks[LandmarkIndex.INDEX_PIP]['y']
        middle_extended = landmarks[LandmarkIndex.MIDDLE_TIP]['y'] < landmarks[LandmarkIndex.MIDDLE_PIP]['y']
        ring_extended = landmarks[LandmarkIndex.RING_TIP]['y'] < landmarks[LandmarkIndex.RING_PIP]['y']
        pinky_extended = landmarks[LandmarkIndex.PINKY_TIP]['y'] < landmarks[LandmarkIndex.PINKY_PIP]['y']
        
        # Thumb: compare tip to IP distance from wrist
        thumb_wrist_dist = self.euclidean_distance(landmarks[LandmarkIndex.THUMB_TIP], landmarks[LandmarkIndex.WRIST])
        thumb_ip_dist = self.euclidean_distance(landmarks[LandmarkIndex.THUMB_IP], landmarks[LandmarkIndex.WRIST])
        thumb_extended = thumb_wrist_dist > thumb_ip_dist

        return {
            "thumb": thumb_extended,
            "index": index_extended,
            "middle": middle_extended,
            "ring": ring_extended,
            "pinky": pinky_extended
        }

    def classify_gesture(self, landmarks: List[Dict[str, float]]) -> Tuple[GestureType, Dict[str, Any]]:
        """
        Main gesture classifier method.
        Returns (GestureType, telemetry_dict).
        """
        now = time.time()
        telemetry: Dict[str, Any] = {
            "hand_scale": 1.0,
            "pinch_distance": 99.0,
            "right_pinch_distance": 99.0,
            "finger_states": {},
            "scroll_delta": 0.0,
            "is_dragging": self.is_dragging,
            "is_paused": self.is_paused
        }

        if len(landmarks) < 21:
            if self.is_dragging:
                self.is_dragging = False
                return GestureType.DRAG_RELEASE, telemetry
            return GestureType.NONE, telemetry

        scale = self.compute_hand_scale(landmarks)
        telemetry["hand_scale"] = scale

        # Calculate normalized pinch distances
        thumb_tip = landmarks[LandmarkIndex.THUMB_TIP]
        index_tip = landmarks[LandmarkIndex.INDEX_TIP]
        middle_tip = landmarks[LandmarkIndex.MIDDLE_TIP]

        pinch_dist = self.euclidean_distance(thumb_tip, index_tip) / scale
        right_pinch_dist = self.euclidean_distance(thumb_tip, middle_tip) / scale
        
        telemetry["pinch_distance"] = pinch_dist
        telemetry["right_pinch_distance"] = right_pinch_dist

        fingers = self.analyze_finger_states(landmarks)
        telemetry["finger_states"] = fingers

        # 1. Check for Fist Lock (all 5 fingers curled)
        is_fist = not any(fingers.values())
        if is_fist:
            return GestureType.FIST_LOCK, telemetry

        # 2. Check for Thumbs Up (only thumb extended)
        is_thumbs_up = fingers["thumb"] and not fingers["index"] and not fingers["middle"] and not fingers["ring"] and not fingers["pinky"]
        if is_thumbs_up:
            return GestureType.THUMBS_UP, telemetry

        # 3. Check for Pause / Resume gestures (Open flat palm)
        all_extended = all(fingers.values())
        if all_extended:
            if self.palm_open_start_time is None:
                self.palm_open_start_time = now
            elif (now - self.palm_open_start_time) * 1000 >= self.thresholds.pause_hold_ms:
                self.palm_open_start_time = now + 1.0  # cooldown
                self.is_paused = not self.is_paused
                telemetry["is_paused"] = self.is_paused
                return (GestureType.PAUSE if self.is_paused else GestureType.RESUME), telemetry
        else:
            self.palm_open_start_time = None

        if self.is_paused:
            return GestureType.NONE, telemetry

        # 4. Check Two-Finger Gestures: Peace Sign vs Parallel Scroll
        is_two_finger = (
            fingers["index"] and fingers["middle"] and not fingers["ring"] and not fingers["pinky"]
        )
        if is_two_finger:
            spread_dist = self.euclidean_distance(index_tip, middle_tip) / scale
            if spread_dist >= 0.38:
                self.prev_scroll_y = None
                return GestureType.PEACE_SIGN, telemetry
            else:
                avg_y = (index_tip['y'] + middle_tip['y']) / 2.0
                if self.prev_scroll_y is not None:
                    dy = (avg_y - self.prev_scroll_y) * self.thresholds.scroll_sensitivity * 100
                    telemetry["scroll_delta"] = dy
                    self.prev_scroll_y = avg_y
                    return GestureType.SCROLL, telemetry
                self.prev_scroll_y = avg_y
                return GestureType.SCROLL, telemetry
        else:
            self.prev_scroll_y = None

        # 3. Check for Drag & Drop and Left Click (Thumb Tip + Index Tip Pinch)
        is_pinching = pinch_dist < self.thresholds.pinch_threshold

        if is_pinching:
            if not self.was_pinching:
                # Pinch started
                self.pinch_start_time = now
                self.was_pinching = True
            else:
                # Pinch being held
                if not self.is_dragging and self.pinch_start_time:
                    hold_duration_ms = (now - self.pinch_start_time) * 1000
                    if hold_duration_ms >= self.thresholds.drag_hold_ms:
                        self.is_dragging = True
                        telemetry["is_dragging"] = True
                        return GestureType.DRAG_START, telemetry

            if self.is_dragging:
                return GestureType.DRAGGING, telemetry

            return GestureType.MOVE, telemetry  # Waiting to see if it's tap or hold

        else:
            # Pinch released
            if self.is_dragging:
                self.is_dragging = False
                self.was_pinching = False
                self.pinch_start_time = None
                telemetry["is_dragging"] = False
                return GestureType.DRAG_RELEASE, telemetry

            if self.was_pinching:
                # Was a quick pinch tap
                self.was_pinching = False
                pinch_duration_ms = (now - (self.pinch_start_time or now)) * 1000
                self.pinch_start_time = None

                if pinch_duration_ms < self.thresholds.drag_hold_ms:
                    # Check for double click
                    time_since_last_pinch_ms = (now - self.last_pinch_time) * 1000
                    if time_since_last_pinch_ms < self.thresholds.double_click_window_ms:
                        self.last_click_time = now
                        self.last_pinch_time = 0.0  # Reset
                        return GestureType.DOUBLE_CLICK, telemetry
                    else:
                        # Single left click
                        if (now - self.last_click_time) * 1000 >= self.thresholds.click_cooldown_ms:
                            self.last_click_time = now
                            self.last_pinch_time = now
                            return GestureType.LEFT_CLICK, telemetry

        # 4. Check for Right Click (Thumb Tip + Middle Tip Pinch)
        is_right_pinching = right_pinch_dist < self.thresholds.right_pinch_threshold
        if is_right_pinching and not self.was_right_pinching:
            self.was_right_pinching = True
            if (now - self.last_click_time) * 1000 >= self.thresholds.click_cooldown_ms:
                self.last_click_time = now
                return GestureType.RIGHT_CLICK, telemetry
        elif not is_right_pinching:
            self.was_right_pinching = False

        # 5. Default: Cursor Move if index finger extended or pointing
        if fingers["index"]:
            return GestureType.MOVE, telemetry

        return GestureType.NONE, telemetry
