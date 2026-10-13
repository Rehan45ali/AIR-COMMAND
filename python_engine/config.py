"""
Configuration and Calibration Settings for GestureMouse AI
Modular configuration with persistence, calibration, and profile management.
"""

from dataclasses import dataclass, field, asdict
import json
import os
from typing import Dict, Any, Optional


@dataclass
class SensitivityConfig:
    x_sensitivity: float = 1.3
    y_sensitivity: float = 1.3
    smoothing_factor: float = 0.65  # Exponential Moving Average weight (0.0: instant/jittery -> 0.95: very smooth/slight lag)
    deadzone_ratio: float = 0.08    # Fractional edge boundary where pointer clips/accelerates
    invert_x: bool = True           # Invert X for mirror webcam view
    invert_y: bool = False
    acceleration_enabled: bool = True
    acceleration_factor: float = 1.25


@dataclass
class GestureThresholds:
    # Normalized Euclidean distance thresholds relative to hand span (wrist to middle MCP)
    pinch_threshold: float = 0.28          # Thumb tip to Index tip for Left Click
    right_pinch_threshold: float = 0.28    # Thumb tip to Middle tip for Right Click
    double_click_window_ms: int = 380      # Max time between pinches for double click
    drag_hold_ms: int = 320                # Hold duration before initiating drag
    scroll_threshold: float = 0.06         # Two finger spacing threshold
    scroll_sensitivity: float = 2.4        # Scroll steps per unit vertical hand motion
    click_cooldown_ms: int = 250           # Debounce period after click action
    pause_hold_ms: int = 700               # Open palm hold to toggle pause


@dataclass
class VoiceConfig:
    enabled: bool = True
    language: str = "en-US"
    vosk_model_path: str = "models/vosk-model-small-en-us-0.15"
    listen_timeout_sec: float = 2.0
    command_cooldown_ms: int = 500
    allowlist_apps: Dict[str, str] = field(default_factory=lambda: {
        "browser": "https://google.com",
        "notepad": "notepad.exe",
        "calculator": "calc.exe"
    })


@dataclass
class AppConfig:
    camera_id: int = 0
    frame_width: int = 640
    frame_height: int = 480
    min_detection_confidence: float = 0.70
    min_tracking_confidence: float = 0.70
    target_fps: int = 30
    show_visual_overlay: bool = True
    active_profile_name: str = "Balanced Default"
    sensitivity: SensitivityConfig = field(default_factory=SensitivityConfig)
    thresholds: GestureThresholds = field(default_factory=GestureThresholds)
    voice: VoiceConfig = field(default_factory=VoiceConfig)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AppConfig":
        sens_data = data.get("sensitivity", {})
        thresh_data = data.get("thresholds", {})
        voice_data = data.get("voice", {})

        return cls(
            camera_id=data.get("camera_id", 0),
            frame_width=data.get("frame_width", 640),
            frame_height=data.get("frame_height", 480),
            min_detection_confidence=data.get("min_detection_confidence", 0.70),
            min_tracking_confidence=data.get("min_tracking_confidence", 0.70),
            target_fps=data.get("target_fps", 30),
            show_visual_overlay=data.get("show_visual_overlay", True),
            active_profile_name=data.get("active_profile_name", "Balanced Default"),
            sensitivity=SensitivityConfig(**sens_data) if sens_data else SensitivityConfig(),
            thresholds=GestureThresholds(**thresh_data) if thresh_data else GestureThresholds(),
            voice=VoiceConfig(**voice_data) if voice_data else VoiceConfig()
        )

    def save_to_file(self, file_path: str = "config.json") -> bool:
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(self.to_dict(), f, indent=2)
            return True
        except Exception as e:
            print(f"[Config] Error saving config: {e}")
            return False

    @classmethod
    def load_from_file(cls, file_path: str = "config.json") -> "AppConfig":
        if os.path.exists(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return cls.from_dict(data)
            except Exception as e:
                print(f"[Config] Error loading config ({e}), falling back to default.")
        return cls()


# Built-in Profiles
PROFILES = {
    "Balanced Default": AppConfig(
        active_profile_name="Balanced Default",
        sensitivity=SensitivityConfig(x_sensitivity=1.3, y_sensitivity=1.3, smoothing_factor=0.65),
        thresholds=GestureThresholds(pinch_threshold=0.28, click_cooldown_ms=250)
    ),
    "Precision CAD": AppConfig(
        active_profile_name="Precision CAD",
        sensitivity=SensitivityConfig(x_sensitivity=0.85, y_sensitivity=0.85, smoothing_factor=0.85, acceleration_enabled=False),
        thresholds=GestureThresholds(pinch_threshold=0.24, click_cooldown_ms=350, drag_hold_ms=400)
    ),
    "High-Speed Navigation": AppConfig(
        active_profile_name="High-Speed Navigation",
        sensitivity=SensitivityConfig(x_sensitivity=2.0, y_sensitivity=2.0, smoothing_factor=0.45, acceleration_factor=1.6),
        thresholds=GestureThresholds(pinch_threshold=0.32, click_cooldown_ms=200)
    ),
    "Accessibility High-Confidence": AppConfig(
        active_profile_name="Accessibility High-Confidence",
        sensitivity=SensitivityConfig(x_sensitivity=1.1, y_sensitivity=1.1, smoothing_factor=0.80),
        thresholds=GestureThresholds(pinch_threshold=0.35, click_cooldown_ms=450, double_click_window_ms=500, drag_hold_ms=500)
    )
}
