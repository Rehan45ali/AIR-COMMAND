"""
Voice Command Controller for GestureMouse AI
Provides non-blocking speech recognition, command parsing, allowlist safety,
and multi-language phrase mapping (English, Hindi, Hinglish).
"""

import queue
import re
import threading
import time
import webbrowser
import subprocess
import os
import platform
from typing import Callable, Optional, Dict, Any, List
from .config import VoiceConfig


class VoiceController:
    def __init__(self, config: Optional[VoiceConfig] = None, command_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None):
        self.config = config or VoiceConfig()
        self.command_callback = command_callback
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.command_queue: queue.Queue = queue.Queue()
        self.last_command_time: float = 0.0
        self.last_recognized_text: str = ""

        # Command patterns and multi-language dictionary
        self.command_patterns: Dict[str, List[str]] = {
            "ACTIVATE": [
                "activate virtual mouse", "activate mouse", "start mouse", "enable mouse",
                "mouse chalao", "mouse start karo"
            ],
            "DISABLE": [
                "disable virtual mouse", "disable mouse", "stop mouse", "turn off mouse",
                "mouse band karo"
            ],
            "PAUSE": [
                "pause tracking", "pause mouse", "pause", "roko", "ruk jao"
            ],
            "RESUME": [
                "resume tracking", "resume mouse", "resume", "chalu karo", "aage badho"
            ],
            "LEFT_CLICK": [
                "left click", "click", "single click", "dabao", "left dabao"
            ],
            "DOUBLE_CLICK": [
                "double click", "do baar click"
            ],
            "RIGHT_CLICK": [
                "right click", "right dabao"
            ],
            "START_SCROLL": [
                "start scrolling", "scroll down", "scroll karo"
            ],
            "STOP_SCROLL": [
                "stop scrolling", "scroll roko"
            ],
            "CENTER_CURSOR": [
                "move cursor to the center", "center cursor", "cursor center", "beech me lao"
            ],
            "OPEN_ALL_APPS": [
                "open all apps", "launch all apps", "open everything", "open all",
                "open all windows", "all apps", "saare apps kholo", "sab apps kholo",
                "sabhi apps start karo"
            ],
            "OPEN_TASKS": [
                "open task manager", "open tasks", "task manager", "system monitor", "task manager kholo"
            ],
            "OPEN_BROWSER": [
                "open browser", "launch browser", "browser kholo", "open web"
            ],
            "OPEN_CHROME": [
                "open chrome", "launch chrome", "chrome kholo"
            ],
            "OPEN_YOUTUBE": [
                "open youtube", "launch youtube", "youtube kholo", "play youtube"
            ],
            "OPEN_NOTEPAD": [
                "open notepad", "launch notepad", "notepad kholo", "open text editor", "open editor"
            ],
            "OPEN_CALCULATOR": [
                "open calculator", "launch calculator", "calculator kholo", "open calc", "calc kholo"
            ],
            "OPEN_TERMINAL": [
                "open terminal", "launch terminal", "open command prompt", "open cmd", "terminal kholo"
            ],
            "OPEN_EXPLORER": [
                "open explorer", "open files", "open file explorer", "files kholo", "file manager"
            ],
            "OPEN_PAINT": [
                "open paint", "launch paint", "paint kholo", "drawing tool", "open mspaint"
            ],
            "OPEN_VSCODE": [
                "open vscode", "open code", "launch vscode", "open vs code"
            ],
            "OPEN_SPOTIFY": [
                "open spotify", "launch spotify", "spotify kholo", "music kholo"
            ],
            "OPEN_CAMERA": [
                "open camera", "launch camera", "camera kholo", "webcam kholo"
            ],
            "OPEN_SETTINGS": [
                "open settings", "system settings", "settings kholo"
            ],
            "TAKE_SCREENSHOT": [
                "take screenshot", "capture screen", "screenshot lo"
            ],
            "INCREASE_SENSITIVITY": [
                "increase sensitivity", "speed up", "faster cursor", "speed badhao"
            ],
            "DECREASE_SENSITIVITY": [
                "decrease sensitivity", "slow down", "slower cursor", "speed kam karo"
            ],
            "SHOW_STATUS": [
                "show tracking status", "status", "show status", "system status"
            ],
            "EXIT": [
                "exit application", "quit application", "close app", "band karo"
            ]
        }

    def start(self):
        """Starts background speech recognition worker."""
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._worker_loop, daemon=True, name="VoiceControllerThread")
        self.thread.start()

    def stop(self):
        """Stops background speech recognition gracefully."""
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)

    def parse_command(self, text: str) -> Optional[str]:
        """Matches normalized speech transcription against allowed command phrases, prioritizing longest matches."""
        clean = text.lower().strip()
        clean = re.sub(r'[^\w\s]', '', clean)

        # Collect all phrases with their command, sorted by phrase length descending
        all_candidates = []
        for command_id, phrases in self.command_patterns.items():
            for phrase in phrases:
                all_candidates.append((phrase, command_id))

        all_candidates.sort(key=lambda item: len(item[0]), reverse=True)

        for phrase, command_id in all_candidates:
            # Check for word boundary or phrase match
            pattern = r'\b' + re.escape(phrase) + r'\b'
            if re.search(pattern, clean) or phrase in clean:
                return command_id
        return None

    def execute_system_allowlist_command(self, cmd: str) -> bool:
        """Safely executes authorized system actions (no arbitrary shell injection)."""
        system = platform.system().lower()
        try:
            if cmd == "OPEN_ALL_APPS":
                self.execute_system_allowlist_command("OPEN_BROWSER")
                self.execute_system_allowlist_command("OPEN_NOTEPAD")
                self.execute_system_allowlist_command("OPEN_CALCULATOR")
                self.execute_system_allowlist_command("OPEN_TERMINAL")
                self.execute_system_allowlist_command("OPEN_EXPLORER")
                return True
            elif cmd == "OPEN_TASKS":
                if "windows" in system:
                    subprocess.Popen("taskmgr", shell=True)
                    return True
                elif "darwin" in system:
                    subprocess.Popen(["open", "-a", "Activity Monitor"])
                    return True
                else:
                    for mon in ["gnome-system-monitor", "ksysguard", "htop"]:
                        if subprocess.run(["which", mon], capture_output=True).returncode == 0:
                            subprocess.Popen([mon])
                            return True
            elif cmd in ["OPEN_BROWSER", "OPEN_CHROME"]:
                webbrowser.open("https://www.google.com")
                return True
            elif cmd == "OPEN_YOUTUBE":
                webbrowser.open("https://www.youtube.com")
                return True
            elif cmd == "OPEN_NOTEPAD":
                if "windows" in system:
                    subprocess.Popen(["notepad.exe"])
                    return True
                elif "darwin" in system:
                    subprocess.Popen(["open", "-a", "TextEdit"])
                    return True
                else:
                    for editor in ["gedit", "kate", "mousepad", "nano"]:
                        if subprocess.run(["which", editor], capture_output=True).returncode == 0:
                            subprocess.Popen([editor])
                            return True
            elif cmd == "OPEN_CALCULATOR":
                if "windows" in system:
                    subprocess.Popen(["calc.exe"])
                    return True
                elif "darwin" in system:
                    subprocess.Popen(["open", "-a", "Calculator"])
                    return True
                else:
                    for calc in ["gnome-calculator", "kcalc", "xcalc", "qalculate"]:
                        if subprocess.run(["which", calc], capture_output=True).returncode == 0:
                            subprocess.Popen([calc])
                            return True
            elif cmd == "OPEN_TERMINAL":
                if "windows" in system:
                    subprocess.Popen("start cmd.exe", shell=True)
                    return True
                elif "darwin" in system:
                    subprocess.Popen(["open", "-a", "Terminal"])
                    return True
                else:
                    for term in ["x-terminal-emulator", "gnome-terminal", "konsole", "xterm"]:
                        if subprocess.run(["which", term], capture_output=True).returncode == 0:
                            subprocess.Popen([term])
                            return True
            elif cmd == "OPEN_EXPLORER":
                if "windows" in system:
                    subprocess.Popen(["explorer.exe"])
                    return True
                elif "darwin" in system:
                    subprocess.Popen(["open", "."])
                    return True
                else:
                    subprocess.Popen(["xdg-open", "."])
                    return True
            elif cmd == "OPEN_PAINT":
                if "windows" in system:
                    subprocess.Popen(["mspaint.exe"])
                    return True
                else:
                    webbrowser.open("https://jspaint.app")
                    return True
            elif cmd == "OPEN_VSCODE":
                subprocess.Popen(["code"])
                return True
            elif cmd == "OPEN_SPOTIFY":
                if "windows" in system:
                    webbrowser.open("spotify:")
                    return True
                elif "darwin" in system:
                    subprocess.Popen(["open", "-a", "Spotify"])
                    return True
                else:
                    subprocess.Popen(["spotify"])
                    return True
            elif cmd == "OPEN_CAMERA":
                if "windows" in system:
                    subprocess.Popen("start microsoft.windows.camera:", shell=True)
                    return True
                elif "darwin" in system:
                    subprocess.Popen(["open", "-a", "Photo Booth"])
                    return True
                else:
                    subprocess.Popen(["cheese"])
                    return True
            elif cmd == "OPEN_SETTINGS":
                if "windows" in system:
                    subprocess.Popen("start ms-settings:", shell=True)
                    return True
                elif "darwin" in system:
                    subprocess.Popen(["open", "-a", "System Settings"])
                    return True
        except Exception as e:
            print(f"[Voice] Error launching app for {cmd}: {e}")
        return False

    def process_recognized_speech(self, text: str) -> Optional[str]:
        """Processes recognized text, checks cooldown, and invokes callback."""
        now = time.time()
        self.last_recognized_text = text

        cmd = self.parse_command(text)
        if not cmd:
            return None

        # Check command cooldown
        if (now - self.last_command_time) * 1000 < self.config.command_cooldown_ms:
            return None

        self.last_command_time = now

        # Execute system allowlist actions if applicable
        if cmd.startswith("OPEN_"):
            self.execute_system_allowlist_command(cmd)

        payload = {"command": cmd, "raw_text": text, "timestamp": now}
        self.command_queue.put(payload)

        if self.command_callback:
            try:
                self.command_callback(cmd, payload)
            except Exception as e:
                print(f"[Voice] Error in callback: {e}")

        return cmd

    def _worker_loop(self):
        """
        Background audio listener loop.
        Can interface with SpeechRecognition or Vosk if installed, or simulates
        non-blocking queue processing.
        """
        # Try importing speech_recognition or vosk
        has_sr = False
        recognizer = None
        microphone = None

        try:
            import speech_recognition as sr
            recognizer = sr.Recognizer()
            microphone = sr.Microphone()
            with microphone as source:
                recognizer.adjust_for_ambient_noise(source, duration=0.5)
            has_sr = True
        except Exception:
            has_sr = False

        while self.running:
            if has_sr and recognizer and microphone:
                try:
                    with microphone as source:
                        audio = recognizer.listen(source, timeout=1.0, phrase_time_limit=3.0)
                    text = recognizer.recognize_google(audio)
                    if text:
                        self.process_recognized_speech(text)
                except Exception:
                    pass
            else:
                # Sleep briefly in fallback/headless mode
                time.sleep(0.1)
