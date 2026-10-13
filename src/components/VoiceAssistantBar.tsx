import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  HelpCircle,
  CheckCircle,
  Terminal,
  Send,
  Zap,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { soundFx } from '../lib/soundFx';

interface VoiceAssistantBarProps {
  onCommand: (command: string, transcript: string) => void;
  isPaused: boolean;
  className?: string;
}

export const VoiceAssistantBar: React.FC<VoiceAssistantBarProps> = ({
  onCommand,
  isPaused,
  className = '',
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [lastTriggeredPhrase, setLastTriggeredPhrase] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showCheatsheet, setShowCheatsheet] = useState<boolean>(false);
  const [customVoiceInput, setCustomVoiceInput] = useState<string>('');
  const [showQuickPills, setShowQuickPills] = useState<boolean>(true);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);
  const lastTriggerTimeRef = useRef<number>(0);
  const lastMatchedCmdRef = useRef<string>('');

  // Command dictionary mapping for real-time natural language
  const COMMANDS: Record<string, string[]> = {
    // Real-Time All Apps Launch
    OPEN_ALL_APPS: [
      'open all apps',
      'launch all apps',
      'open everything',
      'open all windows',
      'open all',
      'show all apps',
      'all apps',
      'saare apps kholo',
      'sab apps kholo',
      'sabhi apps start karo',
      'open every app',
    ],
    CLOSE_ALL_APPS: [
      'close all apps',
      'close all windows',
      'minimize all',
      'hide all apps',
      'saare apps band karo',
      'sab band karo',
    ],
    TILE_WINDOWS: [
      'tile windows',
      'tile apps',
      'arrange windows',
      'arrange apps',
    ],
    // Individual Real-Time App Launchers
    OPEN_NOTEPAD: [
      'open notepad',
      'launch notepad',
      'notepad kholo',
      'open editor',
      'open notes',
      'notes kholo',
      'open text editor',
    ],
    OPEN_CALCULATOR: [
      'open calculator',
      'launch calculator',
      'calculator kholo',
      'open calc',
      'calc kholo',
      'calculator',
    ],
    OPEN_BROWSER: [
      'open browser',
      'launch browser',
      'browser kholo',
      'open web',
      'open chrome',
      'chrome kholo',
    ],
    OPEN_PAINT: [
      'open paint',
      'launch paint',
      'open canvas',
      'paint kholo',
      'open drawing',
      'neon paint',
    ],
    OPEN_TERMINAL: [
      'open terminal',
      'launch terminal',
      'open cmd',
      'open command prompt',
      'terminal kholo',
      'open shell',
    ],
    OPEN_FILES: [
      'open files',
      'open file explorer',
      'open explorer',
      'files kholo',
      'file manager',
      'open documents',
    ],
    OPEN_TASKS: [
      'open tasks',
      'open task manager',
      'task manager',
      'system monitor',
      'open monitor',
      'tasks kholo',
      'performance monitor',
    ],
    OPEN_MUSIC: [
      'open music',
      'open spotify',
      'play music',
      'music kholo',
      'spotify kholo',
      'cyber audio',
      'open player',
    ],
    OPEN_CAMERA: [
      'open camera',
      'launch camera',
      'camera kholo',
      'open webcam',
      'webcam kholo',
    ],
    OPEN_SETTINGS: [
      'open settings',
      'system settings',
      'settings kholo',
      'open calibration',
    ],
    CLOSE_WINDOW: [
      'close window',
      'close app',
      'band karo app',
      'close active window',
      'window band karo',
    ],
    OPEN_YOUTUBE: ['open youtube', 'launch youtube', 'youtube kholo', 'play youtube'],
    OPEN_GOOGLE: ['open google', 'launch google', 'google kholo', 'search google'],
    OPEN_GITHUB: ['open github', 'launch github', 'github kholo'],
    TAKE_SCREENSHOT: ['take screenshot', 'capture screen', 'screenshot lo', 'screen shot'],
    // System & Mouse Controls
    ACTIVATE: ['activate virtual mouse', 'activate mouse', 'start mouse', 'mouse chalao'],
    PAUSE: ['pause tracking', 'pause mouse', 'pause', 'mouse roko', 'ruk jao'],
    RESUME: ['resume tracking', 'resume mouse', 'resume', 'chalu karo', 'aage badho'],
    LEFT_CLICK: ['left click', 'single click', 'click', 'dabao', 'left dabao'],
    DOUBLE_CLICK: ['double click', 'do baar click', 'double tap'],
    RIGHT_CLICK: ['right click', 'right dabao', 'context menu'],
    START_SCROLL: ['start scrolling', 'scroll down', 'scroll karo'],
    STOP_SCROLL: ['stop scrolling', 'scroll roko'],
    CENTER_CURSOR: ['move cursor to the center', 'center cursor', 'cursor center', 'beech me lao'],
    NAV_SANDBOX: ['go to sandbox', 'open sandbox', 'sandbox', 'desktop'],
    NAV_DASHBOARD: ['go to dashboard', 'open dashboard', 'settings view'],
    NAV_PYTHON: ['go to python', 'python code', 'show code', 'device guide', 'run on device'],
    NAV_3D: ['go to 3d view', '3d hand', 'hologram view'],
    INCREASE_SENSITIVITY: ['increase sensitivity', 'speed up', 'speed badhao', 'faster cursor'],
    DECREASE_SENSITIVITY: ['decrease sensitivity', 'slow down', 'speed kam karo', 'slower cursor'],
    PROFILE_DEFAULT: ['switch profile default', 'default profile', 'balanced profile'],
    PROFILE_CAD: ['switch profile cad', 'cad profile', 'precision profile'],
    PROFILE_GAMING: ['switch profile gaming', 'gaming profile', 'fast profile'],
    TOGGLE_SOUND: ['toggle sound', 'mute sound', 'unmute sound'],
  };

  const parseCommand = useCallback((text: string): { cmdId: string; matchedPhrase: string } | null => {
    const clean = text.toLowerCase().trim().replace(/[^\w\s]/g, '');
    if (!clean) return null;

    // Check longest matching candidates first to prevent substring collisions
    const list: [string, string][] = [];
    Object.entries(COMMANDS).forEach(([cmdId, phrases]) => {
      phrases.forEach((phrase) => list.push([phrase, cmdId]));
    });
    list.sort((a, b) => b[0].length - a[0].length);

    for (const [phrase, cmdId] of list) {
      if (clean.includes(phrase)) {
        return { cmdId, matchedPhrase: phrase };
      }
    }
    return null;
  }, []);

  const executeVoiceCommand = useCallback(
    (cmd: string, spokenText: string) => {
      const now = performance.now();
      // Debounce trigger by 850ms if identical command to prevent double firing during speaking
      if (cmd === lastMatchedCmdRef.current && now - lastTriggerTimeRef.current < 850) {
        return;
      }

      lastTriggerTimeRef.current = now;
      lastMatchedCmdRef.current = cmd;

      setLastCommand(cmd);
      setLastTriggeredPhrase(spokenText);
      soundFx.playVoiceRecognized();
      onCommand(cmd, spokenText);

      setTimeout(() => {
        setLastCommand(null);
      }, 2400);
    },
    [onCommand]
  );

  const handleRecognizedText = useCallback(
    (text: string) => {
      setTranscript(text);
      const match = parseCommand(text);
      if (match) {
        executeVoiceCommand(match.cmdId, text);
      }
    },
    [parseCommand, executeVoiceCommand]
  );

  // Setup Web Speech API for real-time continuous listening
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let liveTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const piece = event.results[i][0].transcript;
          liveTranscript += piece;
          // Immediately match live speech in real time!
          handleRecognizedText(piece);
        }
        if (liveTranscript) {
          setTranscript(liveTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (isListening && recognitionRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscript('');
  };

  // Audio level animation for listening indicator
  useEffect(() => {
    if (!isListening) {
      setAudioLevel((prev) => (prev !== 0 ? 0 : prev));
      return;
    }
    const interval = setInterval(() => {
      setAudioLevel(Math.random() * 0.7 + 0.3);
    }, 120);
    return () => clearInterval(interval);
  }, [isListening]);

  // Handle typed voice command submission
  const handleManualVoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customVoiceInput.trim()) return;
    const phrase = customVoiceInput.trim();
    const match = parseCommand(phrase);
    if (match) {
      executeVoiceCommand(match.cmdId, phrase);
    } else {
      // Dynamic fallback for any app name
      const lower = phrase.toLowerCase();
      if (lower.startsWith('open ') || lower.startsWith('launch ')) {
        const appName = lower.replace(/^(open|launch)\s+/, '').trim();
        executeVoiceCommand(`OPEN_${appName.toUpperCase()}`, phrase);
      } else {
        executeVoiceCommand('CUSTOM', phrase);
      }
    }
    setCustomVoiceInput('');
  };

  const quickLaunchPills = [
    { label: '🚀 Open All Apps', cmd: 'OPEN_ALL_APPS', text: 'open all apps', color: 'from-cyan-500 to-blue-600' },
    { label: '📝 Notepad', cmd: 'OPEN_NOTEPAD', text: 'open notepad', color: 'from-amber-500 to-orange-600' },
    { label: '🧮 Calculator', cmd: 'OPEN_CALCULATOR', text: 'open calculator', color: 'from-emerald-500 to-teal-600' },
    { label: '🌐 Browser', cmd: 'OPEN_BROWSER', text: 'open browser', color: 'from-sky-500 to-indigo-600' },
    { label: '⚡ Terminal', cmd: 'OPEN_TERMINAL', text: 'open terminal', color: 'from-violet-500 to-purple-600' },
    { label: '🎨 Neon Paint', cmd: 'OPEN_PAINT', text: 'open paint', color: 'from-fuchsia-500 to-pink-600' },
    { label: '📁 Files', cmd: 'OPEN_FILES', text: 'open files', color: 'from-blue-500 to-cyan-600' },
    { label: '📊 System Tasks', cmd: 'OPEN_TASKS', text: 'open tasks', color: 'from-rose-500 to-pink-600' },
    { label: '🎵 Cyber Music', cmd: 'OPEN_MUSIC', text: 'open music', color: 'from-purple-500 to-cyan-600' },
    { label: '📷 Camera HUD', cmd: 'OPEN_CAMERA', text: 'open camera', color: 'from-emerald-500 to-cyan-600' },
    { label: '⚙️ Settings', cmd: 'OPEN_SETTINGS', text: 'open settings', color: 'from-slate-600 to-slate-800' },
  ];

  return (
    <>
      <div className={`flex flex-col rounded-2xl bg-slate-900/95 border border-slate-800 backdrop-blur-md shadow-2xl p-2.5 space-y-2 ${className}`}>
        {/* Top Control Bar */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Mic toggle & Voice status */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (isListening) stopListening();
                else startListening();
              }}
              title={isListening ? 'Stop Voice Listening' : 'Start Continuous Speech Recognition'}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold text-xs font-mono transition-all duration-200 ${
                isListening
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-lg shadow-rose-500/20 animate-pulse'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
              }`}
            >
              {isListening ? (
                <>
                  <Mic className="w-4 h-4 text-rose-400" />
                  <span>MIC LISTENING</span>
                </>
              ) : (
                <>
                  <MicOff className="w-4 h-4 text-slate-400" />
                  <span>START VOICE</span>
                </>
              )}
            </button>

            {/* Audio Wave Bars */}
            {isListening && (
              <div className="hidden sm:flex items-center space-x-1 h-5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-1 bg-cyan-400 rounded-full transition-all duration-100"
                    style={{
                      height: `${Math.max(4, audioLevel * (i % 2 === 0 ? 20 : 14))}px`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Live Transcript / Prompt */}
            <div className="flex items-center space-x-2 text-xs font-mono truncate max-w-xs md:max-w-md">
              {transcript ? (
                <div className="flex items-center space-x-1.5 text-cyan-300 bg-cyan-950/60 border border-cyan-800 px-2.5 py-1 rounded-lg">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  <span className="truncate">"{transcript}"</span>
                </div>
              ) : (
                <span className="text-slate-400 text-xs hidden md:inline">
                  Say <span className="text-cyan-400 font-bold">"Open All Apps"</span>, <span className="text-cyan-400 font-bold">"Open Calculator"</span>, or <span className="text-cyan-400 font-bold">"Notepad kholo"</span>
                </span>
              )}
            </div>
          </div>

          {/* Right: Detected action badge & controls */}
          <div className="flex items-center space-x-2">
            {lastCommand && (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-xs font-mono font-bold animate-bounce shadow-lg shadow-emerald-500/20">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lastCommand}</span>
              </div>
            )}

            {/* Quick Pill toggle */}
            <button
              onClick={() => setShowQuickPills(!showQuickPills)}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-mono flex items-center space-x-1"
              title="Toggle Quick Launcher Pills"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Pills</span>
              {showQuickPills ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Sound toggle */}
            <button
              onClick={() => {
                soundFx.enabled = !soundFx.enabled;
                setSoundEnabled(soundFx.enabled);
              }}
              title={soundEnabled ? 'Mute Audio Cues' : 'Unmute Audio Cues'}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Cheatsheet toggle */}
            <button
              onClick={() => setShowCheatsheet(!showCheatsheet)}
              title="Voice Commands Reference"
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center space-x-1 text-xs font-mono"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Commands</span>
            </button>
          </div>
        </div>

        {/* Real-time Quick Voice Launcher Pills & Instant Input */}
        {showQuickPills && (
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider mr-1 flex items-center">
              <Zap className="w-3 h-3 text-cyan-400 mr-1" /> Real-Time Voice Pills:
            </span>

            {quickLaunchPills.map((pill) => (
              <button
                key={pill.cmd}
                onClick={() => executeVoiceCommand(pill.cmd, pill.text)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-gradient-to-r ${pill.color} text-white shadow-sm hover:brightness-110 active:scale-95 transition-all duration-150 flex items-center space-x-1`}
                title={`Trigger command: "${pill.text}"`}
              >
                <span>{pill.label}</span>
              </button>
            ))}

            {/* Instant Voice Input Simulator for testing without mic */}
            <form onSubmit={handleManualVoiceSubmit} className="flex-1 min-w-[200px] flex items-center ml-auto">
              <div className="relative w-full flex items-center">
                <input
                  type="text"
                  value={customVoiceInput}
                  onChange={(e) => setCustomVoiceInput(e.target.value)}
                  placeholder='Speak or type (e.g. "open all apps", "calc kholo")'
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="absolute right-1 px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-mono text-[10px] font-bold hover:bg-cyan-400 flex items-center space-x-1"
                >
                  <Send className="w-2.5 h-2.5" />
                  <span>RUN</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Cheatsheet Modal */}
      {showCheatsheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Mic className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100 font-display">
                  VOICE COMMANDS CHEATSHEET
                </h3>
              </div>
              <button
                onClick={() => setShowCheatsheet(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-mono px-2 py-1 rounded hover:bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Speak any of the following natural commands into your microphone to control the interface in real time hands-free.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className="col-span-1 md:col-span-2 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/50 space-y-1.5">
                <span className="text-cyan-300 font-bold block flex items-center">
                  <Sparkles className="w-4 h-4 mr-1.5 text-cyan-400" />
                  🚀 Real-Time Application Launchers
                </span>
                <p className="text-slate-200">
                  <b>"Open All Apps"</b> • <b>"Launch All Apps"</b> • <b>"Open Everything"</b> (Launches all 10 apps simultaneously!)
                </p>
                <p className="text-slate-300">
                  <b>"Open Notepad"</b> (Notes Editor) • <b>"Open Calculator"</b> (Cyber Calculator) • <b>"Open Browser"</b> (Web Explorer)
                </p>
                <p className="text-slate-300">
                  <b>"Open Terminal"</b> (Cyber Shell) • <b>"Open Paint"</b> (Neon Laser Canvas) • <b>"Open Files"</b> (File Explorer)
                </p>
                <p className="text-slate-300">
                  <b>"Open Tasks"</b> (System Monitor) • <b>"Open Music"</b> (Audio Deck) • <b>"Open Camera"</b> (Vision HUD)
                </p>
                <p className="text-slate-300">
                  <b>"Close All Apps"</b> • <b>"Tile Windows"</b> • <b>"Close Window"</b>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-cyan-400 font-bold block">Dashboard Navigation</span>
                <p className="text-slate-300">"Go to sandbox" / "Go to dashboard"</p>
                <p className="text-slate-300">"Go to python" / "Go to 3D view"</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-emerald-400 font-bold block">Mouse Actions</span>
                <p className="text-slate-300">"Left click" / "Click" / "Double click"</p>
                <p className="text-slate-300">"Right click" / "Center cursor"</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-purple-400 font-bold block">Tracking &amp; Scrolling</span>
                <p className="text-slate-300">"Pause tracking" / "Resume tracking"</p>
                <p className="text-slate-300">"Start scrolling" / "Stop scrolling"</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-amber-400 font-bold block">Sensitivity &amp; Profiles</span>
                <p className="text-slate-300">"Increase sensitivity" / "Decrease sensitivity"</p>
                <p className="text-slate-300">"Switch profile CAD" / "Switch profile gaming"</p>
              </div>

              <div className="col-span-1 md:col-span-2 p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-1">
                <span className="text-rose-400 font-bold block">Hindi / Hinglish Phrases</span>
                <p className="text-slate-300">
                  "Saare apps kholo" • "Sab apps kholo" • "Calculator kholo" • "Notepad kholo" • "Terminal kholo" • "Browser kholo" • "Paint kholo" • "Files kholo" • "Music kholo" • "Mouse roko" • "Mouse chalao" • "Speed badhao" • "Dabao"
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowCheatsheet(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs font-mono hover:bg-cyan-400"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
