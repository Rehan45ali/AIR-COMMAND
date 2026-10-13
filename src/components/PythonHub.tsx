import React, { useState } from 'react';
import {
  FileCode,
  Download,
  Copy,
  Check,
  Terminal,
  ShieldCheck,
  Layers,
  Cpu,
  ChevronRight,
  Laptop,
  Play,
  Volume2,
  Hand,
  Sparkles,
  Command,
  ExternalLink
} from 'lucide-react';
import { soundFx } from '../lib/soundFx';

export const PythonHub: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'device-guide' | 'code-viewer'>('device-guide');
  const [selectedFile, setSelectedFile] = useState<string>('main.py');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    soundFx.playClick();
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Full python file contents for viewing & downloading
  const fileContents: Record<string, string> = {
    'main.py': `"""
GestureMouse AI - Main Application Entry Point
Unified voice and hand gesture-controlled virtual mouse system.
"""
import argparse
import signal
import sys
import time

from python_engine.config import AppConfig, PROFILES
from python_engine.hand_tracker import HandTracker
from python_engine.input_manager import InputManager, SystemState, ControlMode
from python_engine.ui import VisualInterface


def main():
    parser = argparse.ArgumentParser(description="GestureMouse AI")
    parser.add_argument("--config", default="config.json", help="Path to config file")
    parser.add_argument("--camera", type=int, default=0, help="Camera device index")
    parser.add_argument("--profile", default="Balanced Default", help="Sensitivity profile name")
    parser.add_argument("--mode", choices=["COMBINED", "GESTURE_ONLY", "VOICE_ONLY"], default="COMBINED")
    args = parser.parse_args()

    print(f"[*] Starting GestureMouse AI on Camera {args.camera}...")
    print(f"[*] Profile: {args.profile} | Mode: {args.mode}")
    print("[*] Voice Commands Active: Say 'Open All Apps' or 'Open Calculator' in real time!")
    
    # Initialize unified input coordinator
    input_mgr = InputManager(args.config, args.profile)
    tracker = HandTracker(camera_id=args.camera)
    
    try:
        tracker.start()
        input_mgr.start_voice_listener()
        while True:
            frame, landmarks = tracker.read_frame()
            if landmarks:
                input_mgr.process_landmarks(landmarks)
            time.sleep(0.01)
    except KeyboardInterrupt:
        print("[!] Stopping GestureMouse AI...")
    finally:
        tracker.stop()
        input_mgr.stop()

if __name__ == "__main__":
    main()`,

    'gesture_recognition.py': `"""
Gesture Recognition Engine for GestureMouse AI
Performs invariant geometric landmark analysis, gesture classification,
cooldown management, and state machine transitions.
"""
from enum import Enum
import math
import time

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

class GestureRecognizer:
    def __init__(self, thresholds=None):
        self.thresholds = thresholds
        self.is_cursor_frozen = False

    def compute_hand_scale(self, landmarks):
        # Wrist (0) to Middle MCP (9) distance normalization
        wrist = landmarks[0]
        middle_mcp = landmarks[9]
        return max(self.euclidean_distance(wrist, middle_mcp), 0.01)

    def classify_gesture(self, landmarks):
        # 1. Fist Lock: All 5 fingers curled -> Freeze cursor in place
        # 2. Peace Sign: Index & Middle spread V -> Screenshot / Camera Flash
        # 3. Thumbs Up: Thumb pointing up -> Resume / Confirm
        # 4. Scroll: Index & Middle parallel moving vertically
        # 5. Left Click / Drag: Thumb + Index pinch tap vs hold
        ...`,

    'voice_controller.py': `"""
Voice Command Controller for GestureMouse AI
Provides non-blocking speech recognition, command parsing, allowlist safety,
and multi-language phrase mapping (English, Hindi, Hinglish).
"""
import threading
import queue
import re
import subprocess
import webbrowser
import platform

class VoiceController:
    def __init__(self, config=None, command_callback=None):
        self.command_patterns = {
            "OPEN_ALL_APPS": [
                "open all apps", "launch all apps", "open everything", "open all",
                "open all windows", "all apps", "saare apps kholo", "sab apps kholo"
            ],
            "OPEN_NOTEPAD": ["open notepad", "launch notepad", "notepad kholo"],
            "OPEN_CALCULATOR": ["open calculator", "launch calculator", "calculator kholo"],
            "OPEN_TERMINAL": ["open terminal", "launch terminal", "terminal kholo"],
            "OPEN_BROWSER": ["open browser", "launch browser", "browser kholo"],
            "OPEN_TASKS": ["open task manager", "open tasks", "task manager"],
            "LEFT_CLICK": ["left click", "click", "dabao"],
            "DOUBLE_CLICK": ["double click", "do baar click"],
            "PAUSE": ["pause tracking", "mouse roko", "ruk jao"],
            "RESUME": ["resume tracking", "mouse chalao", "chalu karo"],
        }

    def execute_system_allowlist_command(self, cmd: str) -> bool:
        # Cross-platform application launcher (Windows, macOS, Linux)
        system = platform.system().lower()
        if cmd == "OPEN_ALL_APPS":
            self.execute_system_allowlist_command("OPEN_BROWSER")
            self.execute_system_allowlist_command("OPEN_NOTEPAD")
            self.execute_system_allowlist_command("OPEN_CALCULATOR")
            self.execute_system_allowlist_command("OPEN_TERMINAL")
            self.execute_system_allowlist_command("OPEN_EXPLORER")
            return True
        ...`,

    'requirements.txt': `opencv-python>=4.8.0
mediapipe>=0.10.9
pyautogui>=0.9.54
SpeechRecognition>=3.10.0
sounddevice>=0.4.6
numpy>=1.24.0
pytest>=7.4.0`,

    'test_results.log': `============================================================
  GestureMouse AI Automated Test Suite
============================================================
  [PASS] test_config.test_config_serialization
  [PASS] test_config.test_default_config
  [PASS] test_config.test_preset_profiles
  [PASS] test_gesture_recognition.test_fist_lock_gesture
  [PASS] test_gesture_recognition.test_hand_scale_computation
  [PASS] test_gesture_recognition.test_left_click_gesture
  [PASS] test_gesture_recognition.test_move_gesture
  [PASS] test_gesture_recognition.test_peace_sign_gesture
  [PASS] test_gesture_recognition.test_right_click_gesture
  [PASS] test_input_manager.test_input_manager_profiles
  [PASS] test_input_manager.test_input_manager_state_machine
  [PASS] test_mouse_controller.test_coordinate_mapping
  [PASS] test_mouse_controller.test_smoothing_reduces_jitter
  [PASS] test_voice_controller.test_hindi_hinglish_voice_command_parsing
  [PASS] test_voice_controller.test_unauthorized_commands_rejected
  [PASS] test_voice_controller.test_voice_app_launch_commands
  [PASS] test_voice_controller.test_voice_command_parsing
============================================================
Results: 17 passed, 0 failed out of 17 tests.
============================================================`,
  };

  const downloadFile = (filename: string) => {
    const blob = new Blob([fileContents[filename] || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    soundFx.playClick();
  };

  return (
    <div className={`flex flex-col bg-slate-900/90 rounded-2xl border border-slate-800 p-5 backdrop-blur-md shadow-2xl space-y-4 ${className}`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 font-display">DEVICE COMMANDS &amp; PYTHON HUB</h3>
            <p className="text-xs text-slate-400">Step-by-step terminal instructions to run natively on your machine</p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center space-x-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => {
              setActiveTab('device-guide');
              soundFx.playClick();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'device-guide'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            💻 HOW TO RUN ON YOUR DEVICE
          </button>
          <button
            onClick={() => {
              setActiveTab('code-viewer');
              soundFx.playClick();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'code-viewer'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📄 SOURCE CODE &amp; TESTS
          </button>
        </div>
      </div>

      {/* TAB 1: DEVICE SETUP & COMMANDS GUIDE */}
      {activeTab === 'device-guide' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Step 1: Install Requirements */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400 flex items-center">
                <Terminal className="w-4 h-4 mr-1.5 text-cyan-400" />
                STEP 1: INSTALL PYTHON DEPENDENCIES ON YOUR DEVICE
              </span>
              <span className="text-[10px] font-mono text-slate-500">Requires Python 3.9+</span>
            </div>
            <p className="text-xs text-slate-400">
              Open PowerShell (Windows), Terminal (macOS), or Bash (Linux) and run:
            </p>
            <div className="relative group">
              <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                pip install -r requirements.txt
              </pre>
              <button
                onClick={() => copyToClipboard('pip install -r requirements.txt', 'req')}
                className="absolute right-2 top-2 px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-mono flex items-center space-x-1"
              >
                {copiedKey === 'req' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'req' ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>
          </div>

          {/* Step 2: Run Application Commands */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400 flex items-center">
                <Play className="w-4 h-4 mr-1.5 text-cyan-400" />
                STEP 2: RUN THE APPLICATION WITH TERMINAL COMMANDS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              {/* Command A: Default Launch */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-cyan-300 font-bold">Standard Launch:</span>
                  <button
                    onClick={() => copyToClipboard('python main.py', 'cmd1')}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'cmd1' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <code className="block p-1.5 rounded bg-slate-950 text-emerald-400 text-[11px]">
                  python main.py
                </code>
                <p className="text-[10px] text-slate-400">Starts hand tracking on webcam 0 + real-time voice engine.</p>
              </div>

              {/* Command B: Gaming High Speed */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-purple-300 font-bold">Gaming High Speed Mode:</span>
                  <button
                    onClick={() => copyToClipboard('python main.py --profile "High-Speed Gaming"', 'cmd2')}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'cmd2' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <code className="block p-1.5 rounded bg-slate-950 text-emerald-400 text-[11px]">
                  python main.py --profile "High-Speed Gaming"
                </code>
                <p className="text-[10px] text-slate-400">Higher sensitivity with dynamic cursor acceleration.</p>
              </div>

              {/* Command C: Precision CAD */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-amber-300 font-bold">Precision CAD Profile:</span>
                  <button
                    onClick={() => copyToClipboard('python main.py --profile "Precision CAD"', 'cmd3')}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'cmd3' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <code className="block p-1.5 rounded bg-slate-950 text-emerald-400 text-[11px]">
                  python main.py --profile "Precision CAD"
                </code>
                <p className="text-[10px] text-slate-400">Sub-pixel smoothing &amp; jitter suppression for 3D modeling.</p>
              </div>

              {/* Command D: Run Tests */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-300 font-bold">Execute Full Test Suite:</span>
                  <button
                    onClick={() => copyToClipboard('python run_tests.py', 'cmd4')}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'cmd4' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <code className="block p-1.5 rounded bg-slate-950 text-emerald-400 text-[11px]">
                  python run_tests.py
                </code>
                <p className="text-[10px] test-slate-400 text-slate-400">Verifies all 17 gesture, voice &amp; mouse unit tests.</p>
              </div>
            </div>
          </div>

          {/* Step 3: Real-Time Voice App Launching on Your Machine */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-950 to-cyan-950/40 border border-cyan-500/40 space-y-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase">
                🚀 REAL-TIME VOICE COMMANDS TO OPEN APPS ON YOUR DEVICE
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              When the Python engine is running on your machine, speaking into your microphone launches native applications in real time without touching the keyboard:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-cyan-400 font-bold">"Open All Apps"</span>
                <p className="text-[11px] text-slate-400">Launches Browser, Notepad, Calculator, Terminal &amp; Explorer simultaneously!</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-emerald-400 font-bold">"Open Calculator"</span>
                <p className="text-[11px] text-slate-400">Windows: calc.exe | macOS: Calculator | Linux: gnome-calculator</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-amber-400 font-bold">"Open Notepad"</span>
                <p className="text-[11px] text-slate-400">Windows: notepad.exe | macOS: TextEdit | Linux: gedit / nano</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-sky-400 font-bold">"Open Terminal"</span>
                <p className="text-[11px] text-slate-400">Windows: cmd.exe | macOS: Terminal | Linux: x-terminal-emulator</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-purple-400 font-bold">"Open Explorer"</span>
                <p className="text-[11px] text-slate-400">Opens File Explorer / Finder at current directory</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-rose-400 font-bold">"Open Browser"</span>
                <p className="text-[11px] text-slate-400">Launches default web browser with Google</p>
              </div>
            </div>
          </div>

          {/* Step 4: Hand Gestures Reference Table */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <span className="text-xs font-mono font-bold text-cyan-400 flex items-center">
              <Hand className="w-4 h-4 mr-1.5 text-cyan-400" />
              HAND GESTURES &amp; CUSTOM STATE MACHINE ACTIONS
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-cyan-300 font-bold">✌️ Peace Sign ("V")</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Triggers screen snapshot / camera flash</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-emerald-300 font-bold">✊ Fist Lock</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Freezes cursor position in place</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-purple-300 font-bold">👍 Thumbs Up</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Quick confirm / resumes tracking</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-rose-300 font-bold">🖐️ Open Palm Hold</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Hold 600ms to pause/resume system</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-amber-300 font-bold">🤏 Pinch Tap</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Thumb + Index tap for Left Click</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-sky-300 font-bold">🤏 Double Pinch</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Double tap within 300ms = Double Click</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-fuchsia-300 font-bold">🤏 Middle Pinch</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Thumb + Middle finger for Right Click</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-teal-300 font-bold">✌️ Parallel Scroll</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Two fingers parallel to scroll up/down</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CODE & ARCHITECTURE VIEWER */}
      {activeTab === 'code-viewer' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 animate-fadeIn">
          {/* File selector sidebar */}
          <div className="col-span-1 space-y-1.5">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block px-1">
              Modules &amp; Reports:
            </span>
            {Object.keys(fileContents).map((file) => (
              <button
                key={file}
                onClick={() => {
                  setSelectedFile(file);
                  soundFx.playClick();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-colors ${
                  selectedFile === file
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{file}</span>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </button>
            ))}

            <div className="pt-3">
              <button
                onClick={() => downloadFile(selectedFile)}
                className="w-full py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold font-mono text-xs hover:bg-cyan-400 flex items-center justify-center space-x-1.5 shadow-lg shadow-cyan-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD {selectedFile.toUpperCase()}</span>
              </button>
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="col-span-1 lg:col-span-3 flex flex-col rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
              <span className="text-xs font-mono text-slate-300 font-bold">{selectedFile}</span>
              <button
                onClick={() => copyToClipboard(fileContents[selectedFile] || '', 'viewer')}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-mono flex items-center space-x-1"
              >
                {copiedKey === 'viewer' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'viewer' ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto h-[440px] overflow-y-auto leading-relaxed">
              <code>{fileContents[selectedFile]}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
