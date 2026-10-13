"""
Unit tests for InputManager state coordination and profile management.
"""

from python_engine.input_manager import InputManager, SystemState, ControlMode
from python_engine.config import AppConfig


def test_input_manager_state_machine():
    manager = InputManager()
    assert manager.state == SystemState.ACTIVE

    # Voice pause command
    manager.on_voice_command("PAUSE", {})
    assert manager.state == SystemState.PAUSED

    # Resume
    manager.on_voice_command("RESUME", {})
    assert manager.state == SystemState.ACTIVE


def test_input_manager_profiles():
    manager = InputManager()
    success = manager.apply_profile("Precision CAD")
    assert success is True
    assert manager.config.active_profile_name == "Precision CAD"
    assert manager.config.sensitivity.smoothing_factor >= 0.8
