"""
Unit tests for mouse coordinate mapping, EMA smoothing, and actions.
"""

from python_engine.mouse_controller import MouseController
from python_engine.config import SensitivityConfig


def test_coordinate_mapping():
    sens = SensitivityConfig(x_sensitivity=1.0, y_sensitivity=1.0, invert_x=True, deadzone_ratio=0.0)
    controller = MouseController(sensitivity=sens, screen_size=(1920, 1080))

    # Center (0.5, 0.5) should map to center of screen (960, 540)
    x, y = controller.map_coordinates(0.5, 0.5)
    assert abs(x - 960) < 5
    assert abs(y - 540) < 5

    # Top-right with inverted X
    x_tr, y_tr = controller.map_coordinates(1.0, 0.0)
    assert abs(x_tr - 0) < 5  # inverted 1.0 becomes 0.0
    assert abs(y_tr - 0) < 5


def test_smoothing_reduces_jitter():
    sens = SensitivityConfig(smoothing_factor=0.8)
    controller = MouseController(sensitivity=sens, screen_size=(1000, 1000))
    controller.current_x = 500
    controller.current_y = 500

    # Small jump to 510
    sx, sy = controller.smooth_position(510, 500)
    # With 0.8 smoothing factor (alpha=0.2), 500 + 0.2*10 = 502
    assert sx < 505
    assert sx > 500
