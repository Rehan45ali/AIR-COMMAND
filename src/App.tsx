/**
 * GestureMouse AI - AI-Powered Voice & 3D Hand Tracking Virtual Mouse
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MousePointer2,
  Sliders,
  Box,
  Code2,
  Eye,
  EyeOff,
  Power,
  RotateCcw,
  Sparkles,
  Layers,
  Activity,
  Compass,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

import {
  GestureProfile,
  SensitivitySettings,
  GestureThresholds,
  TelemetryData,
  GestureType,
  SystemState,
  ControlMode,
  HandData,
} from './types';
import { BUILT_IN_PROFILES, loadSavedProfiles, saveProfilesToStorage } from './lib/profiles';
import { WebGestureEngine } from './lib/webGestureEngine';
import { ThreeHandScene } from './components/ThreeHandScene';
import { VirtualCursorOverlay } from './components/VirtualCursorOverlay';
import { CameraTracker } from './components/CameraTracker';
import { InteractiveSandbox } from './components/InteractiveSandbox';
import { Dashboard } from './components/Dashboard';
import { VoiceAssistantBar } from './components/VoiceAssistantBar';
import { PythonHub } from './components/PythonHub';
import { soundFx } from './lib/soundFx';

export default function App() {
  // Profiles state
  const [profiles, setProfiles] = useState<GestureProfile[]>(() => loadSavedProfiles());
  const [activeProfile, setActiveProfile] = useState<GestureProfile>(() => {
    const list = loadSavedProfiles();
    return list[0] || BUILT_IN_PROFILES[0];
  });

  // Navigation tab state
  const [currentTab, setCurrentTab] = useState<'sandbox' | 'dashboard' | '3d' | 'python'>('sandbox');

  // System status & mode
  const [systemState, setSystemState] = useState<SystemState>('ACTIVE');
  const [controlMode, setControlMode] = useState<ControlMode>('COMBINED');
  const [showCursorOverlay, setShowCursorOverlay] = useState<boolean>(true);

  // Live Hand Tracking and Engine state
  const [currentHand, setCurrentHand] = useState<HandData | null>(null);
  const [activeGesture, setActiveGesture] = useState<GestureType>('NONE');
  const [virtualCursorPos, setVirtualCursorPos] = useState<{ x: number; y: number }>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
  });

  const [telemetry, setTelemetry] = useState<TelemetryData>({
    fps: 30,
    latencyMs: 12,
    handDetected: false,
    handScale: 1.0,
    pinchDistance: 99,
    rightPinchDistance: 99,
    scrollDelta: 0,
    isDragging: false,
    isCursorFrozen: false,
    activeGesture: 'NONE',
    cursorScreenPos: { x: 500, y: 400 },
    fingerStates: { thumb: false, index: false, middle: false, ring: false, pinky: false },
  });

  const [isShutterFlashing, setIsShutterFlashing] = useState<boolean>(false);
  const [voiceAppTrigger, setVoiceAppTrigger] = useState<string | null>(null);

  // Action log feed
  const [actionNotifications, setActionNotifications] = useState<{ id: string; text: string; time: number }[]>([]);

  // Engine instance reference
  const engineRef = useRef<WebGestureEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new WebGestureEngine(activeProfile.thresholds, activeProfile.sensitivity);
  }

  // Update engine when active profile changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateConfig(activeProfile.thresholds, activeProfile.sensitivity);
    }
  }, [activeProfile]);

  const addActionNotification = useCallback((text: string) => {
    const item = { id: `${Date.now()}-${Math.random()}`, text, time: Date.now() };
    setActionNotifications((prev) => [item, ...prev.slice(0, 3)]);
    setTimeout(() => {
      setActionNotifications((prev) => prev.filter((n) => n.id !== item.id));
    }, 2800);
  }, []);

  // Frame processing loop when hand landmarks arrive
  const handleHandDetected = useCallback(
    (handData: HandData | null) => {
      setCurrentHand(handData);
      if (!engineRef.current) return;

      if (!handData || !handData.landmarks || handData.landmarks.length < 21) {
        setActiveGesture('NONE');
        setTelemetry((prev) => ({
          ...prev,
          handDetected: false,
          activeGesture: 'NONE',
        }));
        return;
      }

      const screenW = typeof window !== 'undefined' ? window.innerWidth : 1280;
      const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;

      const result = engineRef.current.processFrame(handData.landmarks, screenW, screenH);

      setActiveGesture(result.gesture);
      setVirtualCursorPos(result.telemetry.cursorScreenPos);
      setTelemetry(result.telemetry);

      if (result.actionEvent) {
        addActionNotification(`${result.actionEvent.type}: ${result.actionEvent.details || ''}`);

        // Custom action for Peace Sign: Shutter Flash & Confetti
        if (result.actionEvent.type === 'PEACE_SIGN') {
          setIsShutterFlashing(true);
          setTimeout(() => setIsShutterFlashing(false), 240);
          try {
            import('canvas-confetti').then((confettiModule) => {
              confettiModule.default({
                particleCount: 35,
                spread: 60,
                origin: { y: 0.7 },
                colors: ['#06b6d4', '#d946ef', '#3b82f6'],
              });
            }).catch(() => {});
          } catch {}
        } else if (result.actionEvent.type === 'OPEN_ALL_APPS') {
          setCurrentTab('sandbox');
          setVoiceAppTrigger('OPEN_ALL_APPS');
          setTimeout(() => setVoiceAppTrigger(null), 150);
        } else if (result.actionEvent.type === 'TOGGLE_MUSIC') {
          setCurrentTab('sandbox');
          setVoiceAppTrigger('OPEN_MUSIC');
          setTimeout(() => setVoiceAppTrigger(null), 150);
        }
      }
    },
    [addActionNotification]
  );

  // Handle voice commands (hands-free navigation & actions)
  const handleVoiceCommand = useCallback(
    (cmd: string, transcript: string) => {
      addActionNotification(`Voice: ${transcript}`);

      switch (cmd) {
        case 'NAV_SANDBOX':
          setCurrentTab('sandbox');
          break;
        case 'NAV_DASHBOARD':
          setCurrentTab('dashboard');
          break;
        case 'NAV_3D':
          setCurrentTab('3d');
          break;
        case 'NAV_PYTHON':
          setCurrentTab('python');
          break;
        case 'OPEN_NOTEPAD':
        case 'OPEN_CALCULATOR':
        case 'OPEN_TERMINAL':
        case 'OPEN_BROWSER':
        case 'OPEN_PAINT':
        case 'OPEN_FILES':
        case 'OPEN_ALL_APPS':
        case 'CLOSE_ALL_APPS':
        case 'TILE_WINDOWS':
        case 'OPEN_TASKS':
        case 'OPEN_MUSIC':
        case 'OPEN_CAMERA':
        case 'OPEN_SETTINGS':
        case 'CLOSE_WINDOW':
        case 'OPEN_YOUTUBE':
        case 'OPEN_GOOGLE':
        case 'OPEN_GITHUB':
          setCurrentTab('sandbox');
          setVoiceAppTrigger(cmd);
          setTimeout(() => setVoiceAppTrigger(null), 150);
          soundFx.playVoiceRecognized();
          break;
        case 'PAUSE':
          setSystemState('PAUSED');
          if (engineRef.current) engineRef.current.isPaused = true;
          break;
        case 'RESUME':
        case 'ACTIVATE':
          setSystemState('ACTIVE');
          if (engineRef.current) engineRef.current.isPaused = false;
          break;
        case 'CENTER_CURSOR':
          if (typeof window !== 'undefined') {
            setVirtualCursorPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
          }
          break;
        case 'LEFT_CLICK':
          setActiveGesture('LEFT_CLICK');
          soundFx.playClick();
          setTimeout(() => setActiveGesture('NONE'), 150);
          break;
        case 'RIGHT_CLICK':
          setActiveGesture('RIGHT_CLICK');
          soundFx.playRightClick();
          setTimeout(() => setActiveGesture('NONE'), 150);
          break;
        case 'DOUBLE_CLICK':
          setActiveGesture('DOUBLE_CLICK');
          soundFx.playDoubleClick();
          setTimeout(() => setActiveGesture('NONE'), 200);
          break;
        case 'INCREASE_SENSITIVITY': {
          const updated: SensitivitySettings = {
            ...activeProfile.sensitivity,
            xSensitivity: Math.min(3.0, activeProfile.sensitivity.xSensitivity + 0.25),
            ySensitivity: Math.min(3.0, activeProfile.sensitivity.ySensitivity + 0.25),
          };
          setActiveProfile((prev) => ({ ...prev, sensitivity: updated }));
          break;
        }
        case 'DECREASE_SENSITIVITY': {
          const updated: SensitivitySettings = {
            ...activeProfile.sensitivity,
            xSensitivity: Math.max(0.5, activeProfile.sensitivity.xSensitivity - 0.25),
            ySensitivity: Math.max(0.5, activeProfile.sensitivity.ySensitivity - 0.25),
          };
          setActiveProfile((prev) => ({ ...prev, sensitivity: updated }));
          break;
        }
        case 'PROFILE_DEFAULT':
          setActiveProfile(BUILT_IN_PROFILES[0]);
          break;
        case 'PROFILE_CAD':
          setActiveProfile(BUILT_IN_PROFILES[1]);
          break;
        case 'PROFILE_GAMING':
          setActiveProfile(BUILT_IN_PROFILES[2]);
          break;
        case 'TOGGLE_SOUND':
          soundFx.enabled = !soundFx.enabled;
          break;
        default:
          if (cmd.startsWith('OPEN_')) {
            setCurrentTab('sandbox');
            setVoiceAppTrigger(cmd);
            setTimeout(() => setVoiceAppTrigger(null), 150);
            soundFx.playVoiceRecognized();
          }
          break;
      }
    },
    [activeProfile, addActionNotification]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 relative overflow-x-hidden">
      {/* Screen Shutter Flash for Peace Sign Screenshot */}
      {isShutterFlashing && (
        <div className="fixed inset-0 z-50 bg-white/80 pointer-events-none transition-opacity duration-150 animate-pulse" />
      )}

      {/* Position Freeze Indicator when Fist Lock is Active */}
      {telemetry.isCursorFrozen && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-amber-950/90 border border-amber-500 text-amber-300 text-xs font-mono font-bold flex items-center space-x-2 shadow-2xl backdrop-blur-md animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>FIST LOCK ENGAGED • CURSOR POSITION LOCKED</span>
        </div>
      )}

      {/* 3D Virtual Cyber Reticle Cursor Overlay */}
      <VirtualCursorOverlay
        x={virtualCursorPos.x}
        y={virtualCursorPos.y}
        gesture={activeGesture}
        isDragging={telemetry.isDragging}
        isPaused={systemState === 'PAUSED'}
        enabled={showCursorOverlay}
      />

      {/* TOP CYBER HUD NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 w-full bg-slate-950/85 backdrop-blur-md border-b border-cyan-500/20 px-4 py-2.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Status Badge */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
              <MousePointer2 className="w-5 h-5 text-cyan-400 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm sm:text-base font-bold font-display tracking-wider bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                  GESTUREMOUSE AI
                </h1>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold">
                  v2.4 SPATIAL
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 hidden sm:block">
                MediaPipe 3D Hand Tracking &amp; Voice Virtual Mouse
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setCurrentTab('sandbox');
                soundFx.playClick();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition-colors ${
                currentTab === 'sandbox'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Workspace</span>
            </button>
            <button
              onClick={() => {
                setCurrentTab('dashboard');
                soundFx.playClick();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition-colors ${
                currentTab === 'dashboard'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Sensitivity</span>
            </button>
            <button
              onClick={() => {
                setCurrentTab('3d');
                soundFx.playClick();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition-colors ${
                currentTab === '3d'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Hologram</span>
            </button>
            <button
              onClick={() => {
                setCurrentTab('python');
                soundFx.playClick();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition-colors ${
                currentTab === 'python'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Python Core</span>
            </button>
          </div>

          {/* Quick System Status Controls */}
          <div className="flex items-center space-x-2">
            {/* Active profile badge */}
            <div className="hidden lg:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
              <span className="text-slate-500">PROFILE:</span>
              <span className="text-cyan-400 font-bold truncate max-w-[110px]">
                {activeProfile.name}
              </span>
            </div>

            {/* State Toggle Button */}
            <button
              onClick={() => {
                const next = systemState === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
                setSystemState(next);
                if (engineRef.current) engineRef.current.isPaused = next === 'PAUSED';
                if (next === 'ACTIVE') soundFx.playClick();
                else soundFx.playRightClick();
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 border transition-colors ${
                systemState === 'ACTIVE'
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-500/60 text-amber-300'
              }`}
              title="Click to toggle Pause / Resume"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  systemState === 'ACTIVE' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`}
              />
              <span>{systemState}</span>
            </button>

            {/* Toggle Virtual Reticle Visibility */}
            <button
              onClick={() => setShowCursorOverlay(!showCursorOverlay)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
              title={showCursorOverlay ? 'Hide 3D Virtual Reticle' : 'Show 3D Virtual Reticle'}
            >
              {showCursorOverlay ? <Eye className="w-4 h-4 text-cyan-400" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Floating Action Event Toast Notification */}
      <div className="fixed top-16 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
        {actionNotifications.map((notif) => (
          <div
            key={notif.id}
            className="px-3 py-1.5 rounded-xl bg-slate-900/95 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-right-4"
          >
            {notif.text}
          </div>
        ))}
      </div>

      {/* MAIN VIEWPORT CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Voice Assistant Control Banner */}
        <VoiceAssistantBar
          onCommand={handleVoiceCommand}
          isPaused={systemState === 'PAUSED'}
        />

        {/* WORKSPACE SANDBOX TAB */}
        {currentTab === 'sandbox' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Interactive Sandbox */}
            <div className="lg:col-span-2 space-y-4">
              <InteractiveSandbox
                virtualCursorPos={virtualCursorPos}
                activeGesture={activeGesture}
                isDragging={telemetry.isDragging}
                appToOpen={voiceAppTrigger}
              />
            </div>

            {/* Right 1 Col: Live Camera Vision Tracker + 3D Mini Hologram */}
            <div className="space-y-4 flex flex-col">
              <CameraTracker
                onHandDetected={handleHandDetected}
                isPaused={systemState === 'PAUSED'}
              />

              {/* Mini 3D Rig Viewport */}
              <div className="flex-1 min-h-[220px]">
                <ThreeHandScene
                  landmarks={currentHand?.landmarks || []}
                  activeGesture={activeGesture}
                  isPaused={systemState === 'PAUSED'}
                  className="h-full min-h-[220px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* SENSITIVITY & SAVED PROFILES DASHBOARD TAB */}
        {currentTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Dashboard
                activeProfile={activeProfile}
                profiles={profiles}
                telemetry={telemetry}
                onProfileChange={(prof) => setActiveProfile(prof)}
                onProfilesUpdate={(pList) => setProfiles(pList)}
                onSensitivityChange={(sens) => {
                  const updated: GestureProfile = { ...activeProfile, sensitivity: sens };
                  setActiveProfile(updated);
                  const pList = profiles.map((p) => (p.id === updated.id ? updated : p));
                  setProfiles(pList);
                  saveProfilesToStorage(pList);
                }}
                onThresholdsChange={(thresh) => {
                  const updated: GestureProfile = { ...activeProfile, thresholds: thresh };
                  setActiveProfile(updated);
                  const pList = profiles.map((p) => (p.id === updated.id ? updated : p));
                  setProfiles(pList);
                  saveProfilesToStorage(pList);
                }}
              />
            </div>

            <div className="space-y-4 flex flex-col">
              <CameraTracker
                onHandDetected={handleHandDetected}
                isPaused={systemState === 'PAUSED'}
              />
              <div className="flex-1 min-h-[220px]">
                <ThreeHandScene
                  landmarks={currentHand?.landmarks || []}
                  activeGesture={activeGesture}
                  isPaused={systemState === 'PAUSED'}
                  className="h-full min-h-[220px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3D HOLOGRAPHIC HAND VIEW TAB */}
        {currentTab === '3d' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-[540px]">
              <ThreeHandScene
                landmarks={currentHand?.landmarks || []}
                activeGesture={activeGesture}
                isPaused={systemState === 'PAUSED'}
                className="w-full h-full"
              />
            </div>
            <div className="space-y-4 flex flex-col">
              <CameraTracker
                onHandDetected={handleHandDetected}
                isPaused={systemState === 'PAUSED'}
              />
              {/* Spatial Telemetry Card */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono text-xs">
                <span className="text-cyan-400 font-bold block uppercase tracking-wider">
                  SPATIAL METRICS &amp; DEPTH
                </span>
                <div className="flex justify-between text-slate-300">
                  <span>Anatomical Scale:</span>
                  <span className="text-cyan-300 font-bold">{telemetry.handScale.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Index Z Depth:</span>
                  <span className="text-cyan-300 font-bold">
                    {currentHand?.landmarks?.[8]?.z ? currentHand.landmarks[8].z.toFixed(3) : '0.000'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Active Finger State:</span>
                  <span className="text-emerald-400 font-bold">
                    {Object.entries(telemetry.fingerStates)
                      .filter(([_, v]) => v)
                      .map(([k]) => k)
                      .join(', ') || 'Fist'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Cursor Coords:</span>
                  <span className="text-cyan-300 font-bold">
                    {virtualCursorPos.x}px, {virtualCursorPos.y}px
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PYTHON CORE REPO & ARCHITECTURE TAB */}
        {currentTab === 'python' && <PythonHub />}
      </main>

      {/* FOOTER BAR */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/80 px-4 py-3 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>GestureMouse AI • Computer Vision &amp; Speech Virtual HCI</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>MediaPipe Hands</span>
            <span>•</span>
            <span>Three.js Spatial Graphics</span>
            <span>•</span>
            <span>Web Speech API</span>
            <span>•</span>
            <span>PyAutoGUI Desktop Backend</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
