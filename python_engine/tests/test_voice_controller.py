"""
Unit tests for voice commands parsing and safety.
"""

from python_engine.voice_controller import VoiceController
from python_engine.config import VoiceConfig


def test_voice_command_parsing():
    vc = VoiceController(VoiceConfig())

    assert vc.parse_command("please left click now") == "LEFT_CLICK"
    assert vc.parse_command("pause tracking") == "PAUSE"
    assert vc.parse_command("resume tracking") == "RESUME"
    assert vc.parse_command("double click") == "DOUBLE_CLICK"
    assert vc.parse_command("increase sensitivity please") == "INCREASE_SENSITIVITY"
    assert vc.parse_command("move cursor to the center") == "CENTER_CURSOR"


def test_hindi_hinglish_voice_command_parsing():
    vc = VoiceController(VoiceConfig())

    assert vc.parse_command("mouse roko") == "PAUSE"
    assert vc.parse_command("mouse chalao") == "ACTIVATE"
    assert vc.parse_command("speed badhao") == "INCREASE_SENSITIVITY"
    assert vc.parse_command("cursor beech me lao") == "CENTER_CURSOR"


def test_unauthorized_commands_rejected():
    vc = VoiceController(VoiceConfig())
    # Random text or malicious commands must return None
    assert vc.parse_command("format c drive") is None
    assert vc.parse_command("delete all files") is None
    assert vc.parse_command("rm -rf /") is None


def test_voice_app_launch_commands():
    vc = VoiceController(VoiceConfig())
    assert vc.parse_command("open calculator please") == "OPEN_CALCULATOR"
    assert vc.parse_command("calc kholo") == "OPEN_CALCULATOR"
    assert vc.parse_command("launch notepad") == "OPEN_NOTEPAD"
    assert vc.parse_command("open terminal") == "OPEN_TERMINAL"
    assert vc.parse_command("open files") == "OPEN_EXPLORER"
    assert vc.parse_command("open chrome") == "OPEN_CHROME"
    assert vc.parse_command("open youtube") == "OPEN_YOUTUBE"
    assert vc.parse_command("open all apps") == "OPEN_ALL_APPS"
    assert vc.parse_command("saare apps kholo") == "OPEN_ALL_APPS"
    assert vc.parse_command("launch all apps") == "OPEN_ALL_APPS"
    assert vc.parse_command("open task manager") == "OPEN_TASKS"
    assert vc.parse_command("open paint") == "OPEN_PAINT"
