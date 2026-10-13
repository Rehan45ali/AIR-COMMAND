# GestureMouse AI: AI-Powered Voice & 3D Hand Gesture-Controlled Virtual Mouse

A professional, real-time Human-Computer Interaction (HCI) system that empowers users to control computer cursors, clicks, drag-and-drop, and scrolling through natural hand movements, 3D finger tracking, and voice commands.

Built upon an architectural refactoring and modernization of the original concept by [Viral Doshi](https://github.com/Viral-Doshi/Gesture-Controlled-Virtual-Mouse), upgraded with mathematical hand-scale normalization, dynamic Exponential Moving Average (EMA) smoothing, an asynchronous thread-safe voice engine, and an interactive 3D Three.js visual telemetry dashboard.

---

## 🚀 Key Features

1. **Sub-Pixel 21-Landmark Hand Tracking (MediaPipe Hands)**
   - Tracks 21 anatomical landmarks per hand at 30+ FPS.
   - **Hand-Scale Invariance**: Normalizes pinch and finger distance metrics against the anatomical span (Wrist to Middle MCP), ensuring consistent gesture thresholds regardless of distance from webcam or hand size.

2. **Jitter-Free Cursor Motion & Dynamic Smoothing**
   - **Exponential Moving Average (EMA)** with dynamic velocity adaptation: high speed reduces smoothing for instant responsiveness; low speed increases smoothing for pixel-perfect CAD / precision clicking.
   - Micro-tremor suppression dead zone eliminates sensor noise when hovering.
   - Configurable screen border dead zones allowing easy access to screen edges and taskbars.

3. **Robust Gesture Recognition Engine**
   - **Move Cursor:** Smooth pointing vector mapped to screen coordinates.
   - **Left Click:** Index-to-Thumb pinch tap with hysteresis debounce.
   - **Right Click:** Middle-to-Thumb pinch tap.
   - **Double Click:** Fast double pinch within configurable time window (380ms).
   - **Drag & Drop:** Sustained pinch (>320ms) enters `DRAGGING` mode; moving hand drags window/icon; releasing pinch drops item.
   - **Two-Finger Scroll:** Parallel Index + Middle extension with vertical displacement scaling.
   - **Pause / Resume:** Open flat palm hold or thumbs-up / voice command.

4. **Non-Blocking Asynchronous Voice Assistant**
   - Runs in a dedicated background worker thread with thread-safe queues.
   - **Allowlist Security Model:** Prohibits arbitrary shell injection; only permitted actions (browser, notepad, mouse operations) are executable.
   - **Multi-Language Phrases:** Supports standard English commands as well as Hindi / Hinglish phrases (e.g., *"mouse roko"*, *"speed badhao"*, *"cursor center"*).

5. **Profile Management & Web 3D Dashboard**
   - Pre-calibrated profiles: *Balanced Default*, *Precision CAD*, *High-Speed Navigation*, *Accessibility High-Confidence*.
   - Live 3D holographic hand skeleton and cursor reticle powered by Three.js in the browser frontend.
   - Interactive virtual desktop sandbox for immediate testing and calibration.

---

## 🔬 Architectural Analysis: Original vs. Refactored

| Issue / Feature | Original Viral Doshi Codebase | GestureMouse AI Refactored Architecture |
| :--- | :--- | :--- |
| **Platform Compatibility** | Hardcoded Windows COM objects (`pycaw`, `comtypes`) causing crashes on macOS/Linux | Fully cross-platform with clean abstraction layers and safe fallbacks |
| **Voice Processing** | Synchronous recognition blocked main thread; cursor froze for seconds during speech | Asynchronous worker thread using thread-safe queues; 0ms cursor freeze |
| **Distance Invariance** | Raw pixel distance checks; broke whenever hand moved closer/farther from camera | Normalized by wrist-to-middle MCP span; works at any distance |
| **Cursor Smoothing** | Basic averaging causing noticeable lag or violent jitter | Adaptive velocity-sensitive Exponential Moving Average (EMA) |
| **Drag & Drop** | No state machine; repeated clicks fired during pinch hold | Dedicated `DRAG_START`, `DRAGGING`, `DRAG_RELEASE` state machine |
| **Voice Phrase Matching**| Simple substring checks caused "double click" to trigger single "click" | Longest-phrase prioritization with regex word boundary matching |
| **Security & Permissions**| Unsafe execution pathways | Strict action allowlist; local camera and audio processing without recording |
| **User Interface** | Primitive OpenCV window without configuration controls | 3D Three.js holographic visualizer + settings dashboard + interactive sandbox |

---

## 🛠️ Project Structure

```
├── python_engine/
│   ├── config.py              # Configuration schemas, calibration, and saved profiles
│   ├── gesture_recognition.py # 21-landmark geometric analyzer and state machine
│   ├── hand_tracker.py        # OpenCV capture, MediaPipe tracking, HUD overlay
│   ├── input_manager.py       # Unified coordinator, state machine, conflict resolver
│   ├── mouse_controller.py    # Screen mapping, EMA smoothing, PyAutoGUI actions
│   ├── voice_controller.py    # Background speech recognition and allowlist executor
│   ├── ui.py                  # OpenCV HUD visual telemetry renderer
│   ├── main.py                # Application entry point and signal handler
│   └── tests/                 # Comprehensive unit and integration test suite
│       ├── test_config.py
│       ├── test_gesture_recognition.py
│       ├── test_mouse_controller.py
│       ├── test_voice_controller.py
│       └── test_input_manager.py
├── run_tests.py               # Automated test runner script
├── requirements.txt           # Verified dependencies
├── src/                       # Three.js + React web application frontend
│   ├── components/            # 3D hand scene, virtual cursor, sandbox, dashboard
│   ├── lib/                   # Web gesture engine & synthesized sound effects
│   └── types/                 # TypeScript interfaces
└── README.md
```

---

## 📦 Installation & Setup

### Prerequisites
- Python 3.8 to 3.11
- A working webcam and microphone

### Step 1: Clone and Set Up Virtual Environment

```bash
git clone https://github.com/Viral-Doshi/Gesture-Controlled-Virtual-Mouse.git
cd Gesture-Controlled-Virtual-Mouse

# Create virtual environment
python -m venv venv

# Activate on Windows
venv\Scripts\activate

# Activate on Linux / macOS
source venv/bin/activate
```

### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Run Automated Test Suite

```bash
python run_tests.py
```
*(All 14 unit and integration tests pass verifying config, gesture math, mouse smoothing, and voice parsing).*

### Step 4: Launch Desktop Application

```bash
# Launch with default camera and balanced profile
python main.py

# Launch with custom profile and specific camera ID
python main.py --camera 0 --profile "Precision CAD"

# Launch in gesture-only or voice-only mode
python main.py --mode GESTURE_ONLY
```

---

## 🖐️ Gesture Reference Guide

| Gesture | Finger Alignment | Action Triggered |
| :--- | :--- | :--- |
| **Index Point** | Index fingertip extended, others curled | Move Cursor smoothly across screen |
| **Index-Thumb Pinch** | Thumb tip touches Index tip briefly (<300ms) | **Left Click** |
| **Double Pinch** | Two quick Index-Thumb pinches within 380ms | **Double Click** |
| **Pinch Hold** | Hold Index-Thumb pinch (>320ms) and move | **Drag and Drop** (releases on pinch open) |
| **Middle-Thumb Pinch**| Thumb tip touches Middle tip | **Right Click** |
| **Two-Finger Up/Down**| Index + Middle extended together, move vertically | **Scroll Up / Scroll Down** |
| **Open Palm Hold** | All 5 fingers extended flat for 0.7s | **Toggle Pause / Resume Tracking** |

---

## 🎙️ Voice Command Reference

| English Command | Hindi / Hinglish Command | Real-Time Action |
| :--- | :--- | :--- |
| *"Activate virtual mouse"* | *"Mouse chalao"* | Enables virtual mouse tracking |
| *"Pause tracking"* | *"Mouse roko"* / *"Ruk jao"* | Pauses tracking immediately |
| *"Resume tracking"* | *"Chalu karo"* | Resumes active tracking |
| *"Left click"* / *"Click"* | *"Dabao"* / *"Left dabao"* | Executes left click |
| *"Right click"* | *"Right dabao"* | Executes right click |
| *"Double click"* | *"Do baar click"* | Executes double click |
| *"Move cursor to the center"*| *"Beech me lao"* | Moves cursor to screen center |
| *"Start scrolling"* | *"Scroll karo"* | Starts downward page scrolling |
| *"Increase sensitivity"* | *"Speed badhao"* | Increases cursor multiplier (+0.25) |
| *"Decrease sensitivity"* | *"Speed kam karo"* | Decreases cursor multiplier (-0.25) |
| *"Open calculator"* | *"Calculator kholo"* / *"Calc kholo"* | **Launches Calculator in real time** (`calc.exe` / `gnome-calculator` / `open -a Calculator`) |
| *"Open terminal"* / *"Open cmd"* | *"Terminal kholo"* | **Launches Terminal / Command Prompt in real time** |
| *"Open notepad"* | *"Notepad kholo"* | **Launches Notepad / Text editor in real time** |
| *"Open browser"* / *"Open chrome"* | *"Browser kholo"* / *"Chrome kholo"* | **Launches Web Browser in real time** |
| *"Open explorer"* / *"Open files"* | *"Files kholo"* / *"File manager"* | **Opens File Explorer in real time** (`explorer.exe` / `xdg-open .` / Finder) |
| *"Open paint"* | *"Paint kholo"* | **Launches Paint / Drawing app in real time** |
| *"Open YouTube"* | *"YouTube kholo"* | **Opens YouTube in real time** |
| *"Open VS Code"* / *"Open code"* | *"Code editor kholo"* | **Launches Visual Studio Code in real time** |
| *"Open Spotify"* | *"Spotify kholo"* / *"Music chalao"*| **Launches Spotify in real time** |
| *"Open camera"* | *"Camera kholo"* | **Launches Camera / Photo Booth in real time** |
| *"Open settings"* | *"Settings kholo"* | **Opens System Settings in real time** |
| *"Exit application"* | *"Band karo"* | Shuts down background threads & exits |

---

## 🛡️ Safety & Privacy Guarantee
- **Local Processing:** All camera frames and microphone audio streams are computed strictly on-device in real-time memory.
- **Zero Disk Recording:** Video frames and audio waveforms are never saved to disk or broadcasted remotely.
- **Fail-Safe Mechanism:** Moving the cursor into any corner triggers PyAutoGUI failsafe; voice command *"Pause tracking"* or pressing `ESC` provides instantaneous emergency stop.
