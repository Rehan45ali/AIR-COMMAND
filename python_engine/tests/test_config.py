"""
Unit tests for configuration loading, saving, and profiles.
"""

import os
import tempfile
from python_engine.config import AppConfig, SensitivityConfig, GestureThresholds, PROFILES


def test_default_config():
    cfg = AppConfig()
    assert cfg.camera_id == 0
    assert cfg.sensitivity.x_sensitivity == 1.3
    assert cfg.sensitivity.smoothing_factor == 0.65
    assert cfg.thresholds.pinch_threshold == 0.28


def test_config_serialization():
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        path = tmp.name

    try:
        cfg = AppConfig(active_profile_name="Precision CAD")
        cfg.sensitivity.x_sensitivity = 0.95
        assert cfg.save_to_file(path) is True

        loaded = AppConfig.load_from_file(path)
        assert loaded.active_profile_name == "Precision CAD"
        assert loaded.sensitivity.x_sensitivity == 0.95
    finally:
        if os.path.exists(path):
            os.remove(path)


def test_preset_profiles():
    assert "Balanced Default" in PROFILES
    assert "Precision CAD" in PROFILES
    assert "High-Speed Navigation" in PROFILES
    assert "Accessibility High-Confidence" in PROFILES

    cad = PROFILES["Precision CAD"]
    assert cad.sensitivity.x_sensitivity < 1.0
    assert cad.sensitivity.smoothing_factor > 0.8
