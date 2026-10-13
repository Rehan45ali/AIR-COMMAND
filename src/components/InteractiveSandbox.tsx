import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  Trash2,
  Globe,
  PenTool,
  RotateCcw,
  Sparkles,
  Calculator as CalcIcon,
  Terminal as TermIcon,
  Activity,
  Music,
  Camera,
  Settings,
  Layers,
  Check,
  X,
  Minus,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  Volume2,
  Play,
  Pause,
  Download,
  Cpu,
  Monitor
} from 'lucide-react';
import { GestureType } from '../types';
import { soundFx } from '../lib/soundFx';

interface InteractiveSandboxProps {
  virtualCursorPos: { x: number; y: number };
  activeGesture: GestureType;
  isDragging: boolean;
  appToOpen?: string | null;
  className?: string;
  onVoiceTrigger?: (action: string) => void;
}

interface DesktopItem {
  id: string;
  title: string;
  icon: string;
  x: number;
  y: number;
  type: 'folder' | 'doc' | 'image' | 'trash';
}

export const InteractiveSandbox: React.FC<InteractiveSandboxProps> = ({
  virtualCursorPos,
  activeGesture,
  isDragging,
  appToOpen,
  className = '',
}) => {
  const sandboxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Desktop items for drag-and-drop
  const [items, setItems] = useState<DesktopItem[]>([
    { id: '1', title: 'Projects_2026', icon: 'folder', x: 20, y: 25, type: 'folder' },
    { id: '2', title: 'AI_Mouse_Guide.txt', icon: 'doc', x: 20, y: 120, type: 'doc' },
    { id: '3', title: 'Hand_Landmarks.png', icon: 'image', x: 20, y: 215, type: 'image' },
    { id: '4', title: 'Cyber_Recycle_Bin', icon: 'trash', x: 20, y: 310, type: 'trash' },
  ]);

  // Open windows list - default to notepad & calculator
  const [openWindows, setOpenWindows] = useState<string[]>(['notepad', 'calculator']);
  const [activeWindow, setActiveWindow] = useState<string>('notepad');
  const [windowPositions, setWindowPositions] = useState<Record<string, { x: number; y: number }>>({
    notepad: { x: 120, y: 40 },
    calculator: { x: 580, y: 60 },
    browser: { x: 200, y: 100 },
    terminal: { x: 260, y: 140 },
    paint: { x: 320, y: 80 },
    files: { x: 160, y: 120 },
    tasks: { x: 400, y: 150 },
    music: { x: 220, y: 180 },
    camera: { x: 350, y: 90 },
    settings: { x: 280, y: 110 },
  });

  // App 1: Notepad state
  const [notepadText, setNotepadText] = useState<string>(
    '# GestureMouse AI Session Log\n\n- System: 21-Landmark Hand Tracking + Voice Engine\n- Status: Real-Time Voice App Launcher Active\n\nSpeak into your mic: "Open All Apps", "Open Terminal", "Open Calculator", or "Open Paint"!\n\nAll apps launch in real time without lag!'
  );

  // App 2: Calculator state
  const [calcDisplay, setCalcDisplay] = useState<string>('0');
  const [calcPrev, setCalcPrev] = useState<number | null>(null);
  const [calcOp, setCalcOp] = useState<string | null>(null);

  // App 3: Browser state
  const [browserUrl, setBrowserUrl] = useState<string>('https://gesturemouse.ai/home');
  const [searchQuery, setSearchQuery] = useState<string>('MediaPipe Hand Tracking');
  const [searchResults, setSearchResults] = useState<string[]>([
    'Google MediaPipe Hands: Real-time 21 3D landmark detection running at 60 FPS in WebGL.',
    'Speech Recognition: Native Web Speech API with sub-100ms interim phrase matching.',
    'Cyberpunk Spatial UI: Three.js holographic skeletal mesh rendering.',
    'Python Engine: PyAutoGUI & OpenCV unified cross-platform input automation.',
  ]);

  // App 4: Terminal state
  const [terminalLines, setTerminalLines] = useState<string[]>([
    'GestureMouse AI Cyber Core v2.4 initialized.',
    'Voice App Engine: READY [Listening for real-time commands]',
    'Type "help", "apps", or speak "Open <app>" to launch in real time.',
  ]);
  const [terminalInput, setTerminalInput] = useState<string>('');

  // App 5: Paint state
  const [brushColor, setBrushColor] = useState<string>('#38bdf8');
  const [brushSize, setBrushSize] = useState<number>(3);
  const isPaintingRef = useRef<boolean>(false);

  // App 6: Music state (Web Audio API synth)
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  // App 7: Task Manager state
  const [cpuUsage, setCpuUsage] = useState<number>(24);
  const [ramUsage, setRamUsage] = useState<number>(41);

  // Dragging desktop items
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [celebrationBanner, setCelebrationBanner] = useState<string | null>(null);

  // Launch single app
  const openApp = useCallback((appId: string) => {
    setOpenWindows((prev) => (prev.includes(appId) ? prev : [...prev, appId]));
    setActiveWindow(appId);
    soundFx.playClick();
  }, []);

  const closeApp = useCallback((appId: string) => {
    setOpenWindows((prev) => prev.filter((id) => id !== appId));
    setActiveWindow((curr) => (curr === appId ? '' : curr));
    soundFx.playRightClick();
  }, []);

  // Launch ALL apps in real time
  const openAllApps = useCallback(() => {
    const all = ['notepad', 'calculator', 'browser', 'terminal', 'paint', 'files', 'tasks', 'music', 'camera', 'settings'];
    setOpenWindows(all);
    setActiveWindow('tasks');
    soundFx.playDoubleClick();

    // Trigger visual confetti burst
    try {
      import('canvas-confetti').then((confettiModule) => {
        confettiModule.default({
          particleCount: 50,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#d946ef', '#10b981', '#f59e0b'],
        });
      }).catch(() => {});
    } catch {}

    setCelebrationBanner('🚀 ALL 10 APPS LAUNCHED IN REAL TIME VIA VOICE!');
    setTimeout(() => setCelebrationBanner(null), 4000);
  }, []);

  // Close ALL apps
  const closeAllApps = useCallback(() => {
    setOpenWindows([]);
    setActiveWindow('');
    soundFx.playRightClick();
  }, []);

  // Tile Windows nicely
  const tileWindows = useCallback(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const appIds = ['notepad', 'calculator', 'browser', 'terminal', 'paint', 'files', 'tasks', 'music', 'camera', 'settings'];
    appIds.forEach((id, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      positions[id] = { x: 100 + col * 260, y: 30 + row * 190 };
    });
    setWindowPositions((prev) => ({ ...prev, ...positions }));
    soundFx.playClick();
  }, []);

  // Real-time app launcher trigger from voice commands
  useEffect(() => {
    if (!appToOpen) return;

    if (appToOpen === 'OPEN_ALL_APPS') {
      openAllApps();
    } else if (appToOpen === 'CLOSE_ALL_APPS') {
      closeAllApps();
    } else if (appToOpen === 'TILE_WINDOWS') {
      tileWindows();
    } else if (appToOpen === 'OPEN_NOTEPAD') {
      openApp('notepad');
    } else if (appToOpen === 'OPEN_CALCULATOR') {
      openApp('calculator');
    } else if (appToOpen === 'OPEN_BROWSER') {
      openApp('browser');
    } else if (appToOpen === 'OPEN_PAINT') {
      openApp('paint');
    } else if (appToOpen === 'OPEN_TERMINAL') {
      openApp('terminal');
    } else if (appToOpen === 'OPEN_FILES') {
      openApp('files');
    } else if (appToOpen === 'OPEN_TASKS') {
      openApp('tasks');
    } else if (appToOpen === 'OPEN_MUSIC') {
      openApp('music');
      toggleMusicSynth();
    } else if (appToOpen === 'OPEN_CAMERA') {
      openApp('camera');
    } else if (appToOpen === 'OPEN_SETTINGS') {
      openApp('settings');
    } else if (appToOpen === 'CLOSE_WINDOW') {
      if (activeWindow) closeApp(activeWindow);
    } else if (appToOpen.startsWith('OPEN_')) {
      // Dynamic fallback for any app name
      const appName = appToOpen.replace('OPEN_', '').toLowerCase();
      if (['notes', 'text', 'doc'].includes(appName)) openApp('notepad');
      else if (['calc', 'math'].includes(appName)) openApp('calculator');
      else if (['chrome', 'web', 'google', 'search'].includes(appName)) openApp('browser');
      else if (['cmd', 'shell', 'bash'].includes(appName)) openApp('terminal');
      else if (['drawing', 'canvas', 'sketch'].includes(appName)) openApp('paint');
      else if (['explorer', 'folder', 'docs'].includes(appName)) openApp('files');
      else if (['monitor', 'perf', 'cpu'].includes(appName)) openApp('tasks');
      else if (['audio', 'spotify', 'song'].includes(appName)) {
        openApp('music');
        toggleMusicSynth();
      } else {
        openApp('browser');
      }
    }
  }, [appToOpen, openApp, closeApp, openAllApps, closeAllApps, tileWindows]);

  // Audio synthesizer for cyber music deck
  const toggleMusicSynth = () => {
    try {
      if (isPlayingMusic) {
        if (oscRef.current) {
          oscRef.current.stop();
          oscRef.current.disconnect();
          oscRef.current = null;
        }
        setIsPlayingMusic(false);
      } else {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = audioCtxRef.current || new AudioCtx();
        audioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);

        // Filter for cyber warmth
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);

        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        oscRef.current = osc;
        setIsPlayingMusic(true);
      }
    } catch {
      setIsPlayingMusic(!isPlayingMusic);
    }
  };

  // Calculator button press
  const handleCalcBtn = (val: string) => {
    soundFx.playClick();
    if (val === 'C') {
      setCalcDisplay('0');
      setCalcPrev(null);
      setCalcOp(null);
    } else if (['+', '-', '*', '/'].includes(val)) {
      setCalcPrev(parseFloat(calcDisplay));
      setCalcOp(val);
      setCalcDisplay('0');
    } else if (val === '=') {
      if (calcPrev !== null && calcOp) {
        const cur = parseFloat(calcDisplay);
        let res = cur;
        if (calcOp === '+') res = calcPrev + cur;
        if (calcOp === '-') res = calcPrev - cur;
        if (calcOp === '*') res = calcPrev * cur;
        if (calcOp === '/') res = cur !== 0 ? calcPrev / cur : 0;
        setCalcDisplay(String(Math.round(res * 10000) / 10000));
        setCalcPrev(null);
        setCalcOp(null);
      }
    } else {
      setCalcDisplay((prev) => (prev === '0' ? val : prev + val));
    }
  };

  // Terminal command execution
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    const cmd = terminalInput.trim().toLowerCase();
    const newLines = [...terminalLines, `$ ${terminalInput}`];

    if (cmd === 'help') {
      newLines.push('Available commands:');
      newLines.push('  open <app>   - Launch app (notepad, calc, browser, paint, terminal, files, tasks, music, camera, all)');
      newLines.push('  apps         - List all available desktop applications');
      newLines.push('  clear        - Clear console output');
      newLines.push('  matrix       - Stream cyber matrix telemetry');
      newLines.push('  status       - Virtual mouse state & camera FPS');
    } else if (cmd === 'apps') {
      newLines.push('Apps: notepad, calculator, browser, paint, terminal, files, tasks, music, camera, settings');
    } else if (cmd === 'clear') {
      setTerminalLines(['Terminal cleared. Type "help" for options.']);
      setTerminalInput('');
      return;
    } else if (cmd === 'matrix') {
      newLines.push('SYSTEM: 01001001 01001110 01010000 01010101 01010100 00100000 01001111 01001011');
      newLines.push('Hand tracker: ACTIVE | Sub-pixel jitter: 0.002 | Gestures: 8 Mapped');
    } else if (cmd === 'open all') {
      openAllApps();
      newLines.push('Launching all 10 applications in real time...');
    } else if (cmd.startsWith('open ')) {
      const app = cmd.replace('open ', '').trim();
      openApp(app);
      newLines.push(`Launching ${app} in real time...`);
    } else {
      newLines.push(`Command not recognized: "${cmd}". Type "help" or "apps".`);
    }

    setTerminalLines(newLines);
    setTerminalInput('');
    soundFx.playClick();
  };

  // Paint canvas drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    isPaintingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPaintingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 8;
    ctx.shadowColor = brushColor;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isPaintingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    soundFx.playClick();
  };

  // Real-time animation for Task Manager CPU/RAM
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(Math.floor(20 + Math.random() * 25));
      setRamUsage(Math.floor(40 + Math.random() * 8));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={sandboxRef}
      className={`relative w-full h-[620px] rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/40 border border-slate-800 overflow-hidden shadow-2xl select-none ${className}`}
    >
      {/* Cyber Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#082f4915_1px,transparent_1px),linear-gradient(to_bottom,#082f4915_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Celebration Banner for "Open All Apps" */}
      {celebrationBanner && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-6 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-emerald-500 text-slate-950 font-bold font-mono text-xs shadow-2xl flex items-center space-x-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-slate-950" />
          <span>{celebrationBanner}</span>
        </div>
      )}

      {/* Desktop Top Taskbar */}
      <div className="relative z-30 flex items-center justify-between px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="font-bold text-cyan-400 flex items-center">
            <Monitor className="w-3.5 h-3.5 mr-1 text-cyan-400" />
            CYBER DESKTOP OS
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            Active: <span className="text-cyan-300 font-bold">{openWindows.length} apps open</span>
          </span>
        </div>

        {/* Global window action buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={openAllApps}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-[11px] font-mono font-bold flex items-center space-x-1 shadow-sm"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Open All Apps</span>
          </button>
          <button
            onClick={tileWindows}
            className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[11px] font-mono"
            title="Arrange all windows in a grid"
          >
            Tile Windows
          </button>
          <button
            onClick={closeAllApps}
            className="px-2 py-1 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-950/50 text-[11px] font-mono"
            title="Close all open windows"
          >
            Close All
          </button>
        </div>
      </div>

      {/* Desktop Drag-and-Drop Icons */}
      <div className="absolute top-12 left-4 z-10 flex flex-col space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            onDoubleClick={() => openApp('notepad')}
            className="flex flex-col items-center justify-center w-20 p-2 rounded-xl hover:bg-white/5 cursor-pointer text-slate-300 transition-colors group"
          >
            {item.type === 'folder' && <Folder className="w-8 h-8 text-amber-400 drop-shadow group-hover:scale-110 transition-transform" />}
            {item.type === 'doc' && <FileText className="w-8 h-8 text-cyan-400 drop-shadow group-hover:scale-110 transition-transform" />}
            {item.type === 'image' && <ImageIcon className="w-8 h-8 text-purple-400 drop-shadow group-hover:scale-110 transition-transform" />}
            {item.type === 'trash' && <Trash2 className="w-8 h-8 text-rose-400 drop-shadow group-hover:scale-110 transition-transform" />}
            <span className="mt-1 text-[10px] font-mono text-center truncate w-full text-slate-300 group-hover:text-cyan-300">
              {item.title}
            </span>
          </div>
        ))}
      </div>

      {/* WINDOW 1: Notepad */}
      {openWindows.includes('notepad') && (
        <div
          onClick={() => setActiveWindow('notepad')}
          style={{
            left: `${windowPositions.notepad?.x || 120}px`,
            top: `${windowPositions.notepad?.y || 40}px`,
            zIndex: activeWindow === 'notepad' ? 25 : 15,
          }}
          className="absolute w-80 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/90 border-b border-slate-800 text-xs font-mono">
            <span className="flex items-center text-slate-200 font-bold">
              <FileText className="w-3.5 h-3.5 mr-1 text-cyan-400" />
              Notepad Editor
            </span>
            <div className="flex items-center space-x-1">
              <button onClick={() => closeApp('notepad')} className="text-slate-400 hover:text-rose-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={notepadText}
            onChange={(e) => setNotepadText(e.target.value)}
            className="w-full h-40 p-2.5 bg-transparent text-slate-200 text-xs font-mono focus:outline-none resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between px-3 py-1 bg-slate-950/60 border-t border-slate-800 text-[10px] font-mono text-slate-400">
            <span>Chars: {notepadText.length}</span>
            <button
              onClick={() => soundFx.playClick()}
              className="text-cyan-400 hover:underline flex items-center"
            >
              <Download className="w-2.5 h-2.5 mr-1" /> Save
            </button>
          </div>
        </div>
      )}

      {/* WINDOW 2: Calculator */}
      {openWindows.includes('calculator') && (
        <div
          onClick={() => setActiveWindow('calculator')}
          style={{
            left: `${windowPositions.calculator?.x || 580}px`,
            top: `${windowPositions.calculator?.y || 60}px`,
            zIndex: activeWindow === 'calculator' ? 25 : 15,
          }}
          className="absolute w-60 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/90 border-b border-slate-800 text-xs font-mono">
            <span className="flex items-center text-slate-200 font-bold">
              <CalcIcon className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Cyber Calc
            </span>
            <button onClick={() => closeApp('calculator')} className="text-slate-400 hover:text-rose-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3 space-y-2">
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-right text-lg font-mono font-bold text-emerald-400 truncate">
              {calcDisplay}
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
              {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', 'C', '0', '=', '+'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleCalcBtn(btn)}
                  className={`py-2 rounded-lg font-bold transition-colors ${
                    btn === '='
                      ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                      : btn === 'C'
                      ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                      : ['/', '*', '-', '+'].includes(btn)
                      ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WINDOW 3: Web Browser */}
      {openWindows.includes('browser') && (
        <div
          onClick={() => setActiveWindow('browser')}
          style={{
            left: `${windowPositions.browser?.x || 200}px`,
            top: `${windowPositions.browser?.y || 100}px`,
            zIndex: activeWindow === 'browser' ? 25 : 15,
          }}
          className="absolute w-96 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/90 border-b border-slate-800 text-xs font-mono">
            <span className="flex items-center text-slate-200 font-bold truncate">
              <Globe className="w-3.5 h-3.5 mr-1 text-sky-400" />
              Cyber Browser
            </span>
            <button onClick={() => closeApp('browser')} className="text-slate-400 hover:text-rose-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Address Bar */}
          <div className="flex items-center px-2 py-1 bg-slate-950 border-b border-slate-800 space-x-1.5">
            <div className="flex-1 flex items-center bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[11px] font-mono text-slate-300 truncate">
              <Search className="w-3 h-3 text-slate-500 mr-1 shrink-0" />
              <input
                type="text"
                value={browserUrl}
                onChange={(e) => setBrowserUrl(e.target.value)}
                className="bg-transparent w-full focus:outline-none"
              />
            </div>
          </div>
          {/* Search Content */}
          <div className="p-3 space-y-2 h-44 overflow-y-auto text-xs font-mono">
            <div className="text-[11px] text-cyan-400 font-bold">Top Verified Results:</div>
            {searchResults.map((res, i) => (
              <div key={i} className="p-2 rounded bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-300 hover:border-cyan-500/40">
                {res}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WINDOW 4: Neon Paint */}
      {openWindows.includes('paint') && (
        <div
          onClick={() => setActiveWindow('paint')}
          style={{
            left: `${windowPositions.paint?.x || 320}px`,
            top: `${windowPositions.paint?.y || 80}px`,
            zIndex: activeWindow === 'paint' ? 25 : 15,
          }}
          className="absolute w-80 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/90 border-b border-slate-800 text-xs font-mono">
            <span className="flex items-center text-slate-200 font-bold">
              <PenTool className="w-3.5 h-3.5 mr-1 text-fuchsia-400" />
              Neon Paint Studio
            </span>
            <button onClick={() => closeApp('paint')} className="text-slate-400 hover:text-rose-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between px-2 py-1 bg-slate-950 border-b border-slate-800">
            <div className="flex items-center space-x-1.5">
              {['#38bdf8', '#f43f5e', '#a855f7', '#10b981', '#facc15'].map((c) => (
                <button
                  key={c}
                  onClick={() => setBrushColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-4 h-4 rounded-full border ${brushColor === c ? 'border-white scale-110 ring-2 ring-white/50' : 'border-transparent'}`}
                />
              ))}
            </div>
            <button onClick={clearCanvas} className="text-[10px] font-mono text-slate-400 hover:text-white">
              Clear
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={320}
            height={160}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="bg-slate-950 cursor-crosshair"
          />
        </div>
      )}

      {/* WINDOW 5: Terminal */}
      {openWindows.includes('terminal') && (
        <div
          onClick={() => setActiveWindow('terminal')}
          style={{
            left: `${windowPositions.terminal?.x || 260}px`,
            top: `${windowPositions.terminal?.y || 140}px`,
            zIndex: activeWindow === 'terminal' ? 25 : 15,
          }}
          className="absolute w-88 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col font-mono"
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs">
            <span className="flex items-center text-slate-200 font-bold">
              <TermIcon className="w-3.5 h-3.5 mr-1 text-purple-400" />
              Cyber Shell v2.4
            </span>
            <button onClick={() => closeApp('terminal')} className="text-slate-400 hover:text-rose-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3 h-40 overflow-y-auto space-y-1 text-xs text-slate-300">
            {terminalLines.map((line, i) => (
              <div key={i} className="leading-snug">
                {line}
              </div>
            ))}
          </div>
          <form onSubmit={handleTerminalSubmit} className="flex items-center px-3 py-1.5 bg-slate-900/80 border-t border-slate-800 text-xs">
            <span className="text-purple-400 mr-1.5">$</span>
            <input
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              placeholder="type 'help' or 'open calc'..."
              className="w-full bg-transparent text-slate-200 focus:outline-none"
            />
          </form>
        </div>
      )}

      {/* WINDOW 6: Task Manager */}
      {openWindows.includes('tasks') && (
        <div
          onClick={() => setActiveWindow('tasks')}
          style={{
            left: `${windowPositions.tasks?.x || 400}px`,
            top: `${windowPositions.tasks?.y || 150}px`,
            zIndex: activeWindow === 'tasks' ? 25 : 15,
          }}
          className="absolute w-72 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col font-mono"
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-xs">
            <span className="flex items-center text-slate-200 font-bold">
              <Activity className="w-3.5 h-3.5 mr-1 text-rose-400" />
              System Task Manager
            </span>
            <button onClick={() => closeApp('tasks')} className="text-slate-400 hover:text-rose-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3 space-y-2 text-xs">
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>CPU Load</span>
                <span className="text-cyan-400 font-bold">{cpuUsage}%</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full transition-all duration-300" style={{ width: `${cpuUsage}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Memory (RAM)</span>
                <span className="text-fuchsia-400 font-bold">{ramUsage}%</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div className="bg-fuchsia-500 h-full rounded-full transition-all duration-300" style={{ width: `${ramUsage}%` }} />
              </div>
            </div>
            <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Vision Pipeline</span>
                <span className="text-emerald-400">MediaPipe 60 FPS</span>
              </div>
              <div className="flex justify-between">
                <span>Voice Recognizer</span>
                <span className="text-emerald-400">Real-Time Sub-100ms</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WINDOW 7: Cyber Music Player */}
      {openWindows.includes('music') && (
        <div
          onClick={() => setActiveWindow('music')}
          style={{
            left: `${windowPositions.music?.x || 220}px`,
            top: `${windowPositions.music?.y || 180}px`,
            zIndex: activeWindow === 'music' ? 25 : 15,
          }}
          className="absolute w-64 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col font-mono"
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-xs">
            <span className="flex items-center text-slate-200 font-bold">
              <Music className="w-3.5 h-3.5 mr-1 text-cyan-400" />
              Cyber Synth Deck
            </span>
            <button onClick={() => closeApp('music')} className="text-slate-400 hover:text-rose-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3 text-center space-y-2">
            <div className="text-xs font-bold text-cyan-300">Retro Synthwave 80s</div>
            <div className="text-[10px] text-slate-400">Ambient Web Audio Generator</div>
            <div className="flex justify-center space-x-2 pt-1">
              <button
                onClick={toggleMusicSynth}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs flex items-center space-x-1 hover:bg-cyan-400"
              >
                {isPlayingMusic ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlayingMusic ? 'MUTE' : 'PLAY'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WINDOW 8: File Explorer */}
      {openWindows.includes('files') && (
        <div
          onClick={() => setActiveWindow('files')}
          style={{
            left: `${windowPositions.files?.x || 160}px`,
            top: `${windowPositions.files?.y || 120}px`,
            zIndex: activeWindow === 'files' ? 25 : 15,
          }}
          className="absolute w-72 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col font-mono"
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-xs">
            <span className="flex items-center text-slate-200 font-bold">
              <Folder className="w-3.5 h-3.5 mr-1 text-amber-400" />
              File Explorer
            </span>
            <button onClick={() => closeApp('files')} className="text-slate-400 hover:text-rose-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-2 space-y-1 text-xs">
            {['📁 Documents', '📁 Python_Engine', '📁 MediaPipe_Assets', '📄 config.json', '📄 profile.xml'].map((f, i) => (
              <div key={i} className="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 cursor-pointer">
                {f}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WINDOW 9: Camera HUD */}
      {openWindows.includes('camera') && (
        <div
          onClick={() => setActiveWindow('camera')}
          style={{
            left: `${windowPositions.camera?.x || 350}px`,
            top: `${windowPositions.camera?.y || 90}px`,
            zIndex: activeWindow === 'camera' ? 25 : 15,
          }}
          className="absolute w-64 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col font-mono"
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-xs">
            <span className="flex items-center text-slate-200 font-bold">
              <Camera className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Vision HUD Monitor
            </span>
            <button onClick={() => closeApp('camera')} className="text-slate-400 hover:text-rose-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3 text-center space-y-1">
            <div className="h-24 bg-slate-950 rounded border border-slate-800 flex items-center justify-center text-cyan-400 text-xs">
              [LIVE VISION PIPELINE]
            </div>
            <div className="text-[10px] text-slate-400">21 Landmark Hand Mesh Active</div>
          </div>
        </div>
      )}

      {/* WINDOW 10: Settings */}
      {openWindows.includes('settings') && (
        <div
          onClick={() => setActiveWindow('settings')}
          style={{
            left: `${windowPositions.settings?.x || 280}px`,
            top: `${windowPositions.settings?.y || 110}px`,
            zIndex: activeWindow === 'settings' ? 25 : 15,
          }}
          className="absolute w-64 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col font-mono"
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-xs">
            <span className="flex items-center text-slate-200 font-bold">
              <Settings className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Quick Settings
            </span>
            <button onClick={() => closeApp('settings')} className="text-slate-400 hover:text-rose-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3 space-y-2 text-xs text-slate-300">
            <div>Tracking Mode: <span className="text-cyan-400 font-bold">COMBINED</span></div>
            <div>Jitter Filter: <span className="text-emerald-400 font-bold">EMA SMOOTHING</span></div>
            <div>Speech Engine: <span className="text-fuchsia-400 font-bold">REAL-TIME</span></div>
          </div>
        </div>
      )}

      {/* Desktop Bottom Status Bar */}
      <div className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-between px-4 py-1.5 bg-slate-950/80 border-t border-slate-800/80 backdrop-blur-md text-[11px] font-mono text-slate-400">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>System: Active</span>
          <span className="text-slate-600">|</span>
          <span>Gesture: <span className="text-cyan-300 font-bold">{activeGesture}</span></span>
        </div>
        <div className="flex items-center space-x-3">
          <span>Cursor: ({Math.round(virtualCursorPos.x)}, {Math.round(virtualCursorPos.y)})</span>
        </div>
      </div>
    </div>
  );
};
