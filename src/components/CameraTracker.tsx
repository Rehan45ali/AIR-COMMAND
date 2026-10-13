import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LandmarkPoint, HandData } from '../types';
import { Camera, CameraOff, Video, Sparkles, RefreshCw } from 'lucide-react';

interface CameraTrackerProps {
  onHandDetected: (hand: HandData | null) => void;
  className?: string;
  isPaused: boolean;
}

export const CameraTracker: React.FC<CameraTrackerProps> = ({
  onHandDetected,
  className = '',
  isPaused,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSimulatedMode, setIsSimulatedMode] = useState<boolean>(false);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  // Simulation animation state
  const simAnimRef = useRef<number | null>(null);
  const simClockRef = useRef<number>(0);
  const simActionRef = useRef<string>('MOVE');

  const onHandDetectedRef = useRef(onHandDetected);
  useEffect(() => {
    onHandDetectedRef.current = onHandDetected;
  }, [onHandDetected]);

  // Enumerate video devices safely once on mount
  useEffect(() => {
    let isMounted = true;
    const fetchDevices = async () => {
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devList = await navigator.mediaDevices.enumerateDevices();
          const videoDevs = devList.filter((d) => d.kind === 'videoinput');
          if (isMounted) {
            setDevices(videoDevs);
            if (videoDevs.length > 0) {
              setSelectedDevice((prev) => (prev ? prev : videoDevs[0].deviceId || ''));
            }
          }
        }
      } catch {}
    };
    fetchDevices();
    return () => {
      isMounted = false;
    };
  }, []);

  // Start real webcam stream
  const startCamera = async () => {
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Webcam API is not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedDevice
          ? { deviceId: { exact: selectedDevice }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setIsSimulatedMode(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera permission denied or camera in use';
      setErrorMessage(msg);
      // Fallback to simulation mode automatically so the user can immediately experience the 3D mouse
      setIsSimulatedMode(true);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    onHandDetected(null);
  };

  // MediaPipe hands processing loop
  useEffect(() => {
    if (!cameraActive || isSimulatedMode) return;

    let handsInstance: any = null;
    let cameraInstance: any = null;
    let isSubscribed = true;

    const initMediaPipe = async () => {
      try {
        // Try window.Hands (loaded from CDN script in index.html) or import
        const mpHandsClass = (window as any).Hands;
        if (!mpHandsClass) {
          console.warn('MediaPipe Hands global not yet ready, retrying in 500ms...');
          setTimeout(initMediaPipe, 500);
          return;
        }

        handsInstance = new mpHandsClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        handsInstance.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.65,
          minTrackingConfidence: 0.65,
        });

        handsInstance.onResults((results: any) => {
          if (!isSubscribed) return;

          // Draw 2D canvas overlay
          const canvas = canvasRef.current;
          const video = videoRef.current;
          if (canvas && video) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = video.videoWidth || 640;
              canvas.height = video.videoHeight || 480;
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const landmarks: LandmarkPoint[] = results.multiHandLandmarks[0];

                // Draw landmarks points on preview
                landmarks.forEach((pt, i) => {
                  const px = (1.0 - pt.x) * canvas.width; // mirror view
                  const py = pt.y * canvas.height;

                  ctx.beginPath();
                  ctx.arc(px, py, i === 8 ? 6 : 3, 0, 2 * Math.PI);
                  ctx.fillStyle = i === 8 ? '#f43f5e' : i === 4 ? '#10b981' : '#06b6d4';
                  ctx.fill();
                });

                onHandDetectedRef.current({
                  landmarks,
                  handedness: results.multiHandedness?.[0]?.label || 'Right',
                });
              } else {
                onHandDetectedRef.current(null);
              }
            }
          }
        });

        // Initialize camera helper if available, or requestVideoFrameCallback
        const mpCameraClass = (window as any).Camera;
        if (mpCameraClass && videoRef.current) {
          cameraInstance = new mpCameraClass(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && handsInstance) {
                await handsInstance.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480,
          });
          cameraInstance.start();
        } else {
          // Manual render loop fallback
          const processLoop = async () => {
            if (!isSubscribed || !cameraActive) return;
            if (videoRef.current && videoRef.current.readyState >= 2 && handsInstance) {
              await handsInstance.send({ image: videoRef.current });
            }
            requestAnimationFrame(processLoop);
          };
          processLoop();
        }
      } catch (err) {
        console.error('MediaPipe initialization error:', err);
      }
    };

    initMediaPipe();

    return () => {
      isSubscribed = false;
      if (cameraInstance) cameraInstance.stop();
      if (handsInstance) handsInstance.close();
    };
  }, [cameraActive, isSimulatedMode]);

  // Synthetic Hand Simulation Loop (works without physical webcam)
  useEffect(() => {
    if (!isSimulatedMode) {
      if (simAnimRef.current) cancelAnimationFrame(simAnimRef.current);
      return;
    }

    const runSimulation = () => {
      simClockRef.current += 0.025;
      const t = simClockRef.current;

      // Realistic figure-8 Lissajous hand movement
      const centerX = 0.5 + 0.22 * Math.sin(t * 0.7);
      const centerY = 0.45 + 0.18 * Math.sin(t * 1.4);

      // Periodically trigger a click or scroll or custom gesture
      const cycle = Math.floor(t) % 18;
      const action = simActionRef.current;
      
      const isPinching = action === 'PINCH' || (action === 'MOVE' && (cycle === 3 || cycle === 4));
      const isRightPinching = action === 'MOVE' && cycle === 7;
      const isTwoFinger = action === 'MOVE' && (cycle === 9 || cycle === 10);
      const isPeaceSign = action === 'PEACE' || (action === 'MOVE' && (cycle === 13 || cycle === 14));
      const isFist = action === 'FIST' || (action === 'MOVE' && (cycle === 16 || cycle === 17));
      const isThumbsUp = action === 'THUMBS_UP';

      // Generate 21 realistic synthetic hand coordinates
      const scale = 0.26;
      const syntheticLandmarks: LandmarkPoint[] = [];

      // Landmark 0: Wrist
      syntheticLandmarks.push({ x: centerX, y: centerY + scale * 0.9, z: 0 });

      // Landmark 1..4: Thumb
      if (isThumbsUp) {
        // Thumb extended straight up
        syntheticLandmarks.push({ x: centerX - scale * 0.2, y: centerY + scale * 0.6, z: -0.02 });
        syntheticLandmarks.push({ x: centerX - scale * 0.25, y: centerY + scale * 0.35, z: -0.03 });
        syntheticLandmarks.push({ x: centerX - scale * 0.25, y: centerY + scale * 0.1, z: -0.04 });
        syntheticLandmarks.push({ x: centerX - scale * 0.25, y: centerY - scale * 0.2, z: -0.05 });
      } else if (isFist) {
        // Thumb folded across curled fingers
        syntheticLandmarks.push({ x: centerX - scale * 0.15, y: centerY + scale * 0.6, z: -0.02 });
        syntheticLandmarks.push({ x: centerX - scale * 0.1, y: centerY + scale * 0.5, z: -0.03 });
        syntheticLandmarks.push({ x: centerX, y: centerY + scale * 0.45, z: -0.04 });
        syntheticLandmarks.push({ x: centerX + scale * 0.05, y: centerY + scale * 0.45, z: -0.05 });
      } else {
        syntheticLandmarks.push({ x: centerX - scale * 0.2, y: centerY + scale * 0.6, z: -0.02 });
        syntheticLandmarks.push({ x: centerX - scale * 0.35, y: centerY + scale * 0.4, z: -0.03 });
        syntheticLandmarks.push({ x: centerX - scale * 0.3, y: centerY + scale * 0.2, z: -0.04 });
        syntheticLandmarks.push({
          x: centerX - (isPinching ? scale * 0.05 : scale * 0.25),
          y: centerY + (isPinching ? scale * 0.05 : scale * 0.1),
          z: -0.05,
        });
      }

      // Landmark 5..8: Index finger
      const indexCurled = isFist || isThumbsUp;
      syntheticLandmarks.push({ x: centerX - scale * 0.1, y: centerY + scale * 0.35, z: 0 });
      syntheticLandmarks.push({ x: centerX - scale * 0.1, y: centerY + (indexCurled ? scale * 0.45 : scale * 0.15), z: 0.01 });
      syntheticLandmarks.push({ x: centerX - (isPeaceSign ? scale * 0.22 : scale * 0.08), y: centerY + (indexCurled ? scale * 0.5 : -scale * 0.05), z: 0.02 });
      syntheticLandmarks.push({
        x: centerX - (isPeaceSign ? scale * 0.28 : scale * 0.05),
        y: centerY + (indexCurled ? scale * 0.45 : -scale * 0.25),
        z: 0.03,
      });

      // Landmark 9..12: Middle finger
      const middleCurled = !isTwoFinger && !isRightPinching && !isPeaceSign;
      syntheticLandmarks.push({ x: centerX + scale * 0.05, y: centerY + scale * 0.32, z: 0 });
      syntheticLandmarks.push({ x: centerX + scale * 0.05, y: centerY + (middleCurled || isFist ? scale * 0.45 : scale * 0.15), z: 0.01 });
      syntheticLandmarks.push({
        x: centerX + (isPeaceSign ? scale * 0.22 : scale * 0.05),
        y: centerY + (middleCurled || isFist ? scale * 0.5 : -scale * 0.05),
        z: 0.02,
      });
      syntheticLandmarks.push({
        x: centerX + (isPeaceSign ? scale * 0.28 : isRightPinching ? 0 : scale * 0.05),
        y: centerY + (middleCurled || isFist ? scale * 0.45 : -scale * 0.28),
        z: 0.03,
      });

      // Landmark 13..16: Ring finger (curled)
      syntheticLandmarks.push({ x: centerX + scale * 0.18, y: centerY + scale * 0.36, z: 0 });
      syntheticLandmarks.push({ x: centerX + scale * 0.18, y: centerY + scale * 0.45, z: 0.01 });
      syntheticLandmarks.push({ x: centerX + scale * 0.18, y: centerY + scale * 0.48, z: 0.02 });
      syntheticLandmarks.push({ x: centerX + scale * 0.18, y: centerY + scale * 0.46, z: 0.03 });

      // Landmark 17..20: Pinky finger (curled)
      syntheticLandmarks.push({ x: centerX + scale * 0.28, y: centerY + scale * 0.42, z: 0 });
      syntheticLandmarks.push({ x: centerX + scale * 0.28, y: centerY + scale * 0.48, z: 0.01 });
      syntheticLandmarks.push({ x: centerX + scale * 0.28, y: centerY + scale * 0.50, z: 0.02 });
      syntheticLandmarks.push({ x: centerX + scale * 0.28, y: centerY + scale * 0.48, z: 0.03 });

      onHandDetectedRef.current({
        landmarks: syntheticLandmarks,
        handedness: 'Right',
      });

      // Draw simulation on canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = 320;
          canvas.height = 240;
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Grid lines
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
          ctx.lineWidth = 1;
          for (let x = 0; x < canvas.width; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
          }
          for (let y = 0; y < canvas.height; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }

          // Draw skeleton points
          syntheticLandmarks.forEach((pt, i) => {
            const px = (1.0 - pt.x) * canvas.width;
            const py = pt.y * canvas.height;
            ctx.beginPath();
            ctx.arc(px, py, i === 8 ? 6 : 3, 0, 2 * Math.PI);
            ctx.fillStyle = i === 8 ? '#f43f5e' : i === 4 ? '#10b981' : '#38bdf8';
            ctx.fill();
          });
        }
      }

      simAnimRef.current = requestAnimationFrame(runSimulation);
    };

    runSimulation();

    return () => {
      if (simAnimRef.current) cancelAnimationFrame(simAnimRef.current);
    };
  }, [isSimulatedMode]);

  return (
    <div className={`flex flex-col bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 backdrop-blur-md shadow-xl ${className}`}>
      {/* Header controls */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded-lg ${cameraActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200 tracking-wide">VISION SENSOR</h4>
            <span className="text-[10px] font-mono text-slate-400">
              {isSimulatedMode ? 'SYNTHETIC GENERATOR' : cameraActive ? 'LIVE WEBCAM 640x480' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Toggle Mode Button */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => {
              if (isSimulatedMode) {
                setIsSimulatedMode(false);
                startCamera();
              } else {
                stopCamera();
                setIsSimulatedMode(true);
              }
            }}
            className={`px-2 py-1 rounded-md text-[11px] font-mono flex items-center space-x-1 border transition-colors ${
              isSimulatedMode
                ? 'bg-purple-950/80 border-purple-500/60 text-purple-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>{isSimulatedMode ? 'DEMO ACTIVE' : 'TEST DEMO'}</span>
          </button>

          {cameraActive ? (
            <button
              onClick={stopCamera}
              className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-rose-950/80 border border-rose-500/50 text-rose-300 hover:bg-rose-900/80 flex items-center space-x-1"
            >
              <CameraOff className="w-3 h-3" />
              <span>OFF</span>
            </button>
          ) : (
            <button
              onClick={startCamera}
              className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 flex items-center space-x-1 shadow-lg shadow-cyan-500/20"
            >
              <Camera className="w-3 h-3" />
              <span>START CAMERA</span>
            </button>
          )}
        </div>
      </div>

      {/* Video Viewport / Canvas Overlay */}
      <div className="relative mt-2.5 aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
        {/* Actual Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${
            cameraActive && !isSimulatedMode ? 'opacity-100' : 'hidden'
          }`}
        />

        {/* 2D Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover ${
            cameraActive || isSimulatedMode ? 'opacity-100' : 'hidden'
          }`}
        />

        {/* Inactive Standby View */}
        {!cameraActive && !isSimulatedMode && (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <Camera className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
            <p className="text-xs text-slate-400 font-medium">Camera tracking is idle</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">
              Click <b>Start Camera</b> to use your real hand, or click <b>Test Demo</b> to test right now with synthetic gestures.
            </p>
          </div>
        )}

        {/* Live HUD telemetry badges */}
        {(cameraActive || isSimulatedMode) && (
          <div className="absolute top-2 left-2 flex items-center space-x-1.5 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950/80 border border-emerald-500/50 text-emerald-300">
              {isSimulatedMode ? 'SYNTHETIC TRACKING' : 'MEDIAPIPE 21-PTS'}
            </span>
          </div>
        )}

        {isPaused && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
            <div className="px-3 py-1.5 rounded-lg bg-amber-950/90 border border-amber-500 text-amber-300 font-mono text-xs font-bold flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>TRACKING TEMPORARILY PAUSED</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Gesture Emulator Bar */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
        <span className="text-[10px] text-slate-500 uppercase mr-1">Gesture Emulators:</span>
        <button
          onClick={() => {
            setIsSimulatedMode(true);
            simActionRef.current = 'PEACE';
          }}
          className="px-2 py-0.5 rounded bg-fuchsia-950/60 border border-fuchsia-500/50 text-fuchsia-300 hover:bg-fuchsia-900/60 transition-colors"
          title="Simulate Peace Sign (Snapshot Action)"
        >
          ✌ Peace (V)
        </button>
        <button
          onClick={() => {
            setIsSimulatedMode(true);
            simActionRef.current = 'FIST';
          }}
          className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/50 text-amber-300 hover:bg-amber-900/60 transition-colors"
          title="Simulate Fist (Lock Cursor)"
        >
          ✊ Fist Lock
        </button>
        <button
          onClick={() => {
            setIsSimulatedMode(true);
            simActionRef.current = 'THUMBS_UP';
          }}
          className="px-2 py-0.5 rounded bg-teal-950/60 border border-teal-500/50 text-teal-300 hover:bg-teal-900/60 transition-colors"
          title="Simulate Thumbs Up (Resume / Confirm)"
        >
          👍 Thumbs Up
        </button>
        <button
          onClick={() => {
            setIsSimulatedMode(true);
            simActionRef.current = 'PINCH';
          }}
          className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60 transition-colors"
          title="Simulate Pinch Click"
        >
          👌 Pinch Click
        </button>
        <button
          onClick={() => {
            setIsSimulatedMode(true);
            simActionRef.current = 'MOVE';
          }}
          className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200"
          title="Return to standard cursor move"
        >
          Reset
        </button>
      </div>

      {/* Error alert if permission was denied */}
      {errorMessage && (
        <div className="mt-2 p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-[11px] flex items-start justify-between">
          <span>{errorMessage} (Switched to Demo Simulation Mode)</span>
          <button onClick={() => setErrorMessage(null)} className="text-amber-400 ml-2 font-bold">✕</button>
        </div>
      )}
    </div>
  );
};
