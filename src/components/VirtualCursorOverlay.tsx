import React, { useEffect, useState } from 'react';
import { GestureType } from '../types';

interface VirtualCursorOverlayProps {
  x: number;
  y: number;
  gesture: GestureType;
  isDragging: boolean;
  isPaused: boolean;
  enabled?: boolean;
}

interface ClickRipple {
  id: number;
  x: number;
  y: number;
  type: 'left' | 'right' | 'double';
}

export const VirtualCursorOverlay: React.FC<VirtualCursorOverlayProps> = ({
  x,
  y,
  gesture,
  isDragging,
  isPaused,
  enabled = true,
}) => {
  const [ripples, setRipples] = useState<ClickRipple[]>([]);
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);

  // Update trail history
  useEffect(() => {
    if (!enabled || isPaused) return;
    setTrail((prev) => {
      const next = [{ x, y }, ...prev.slice(0, 4)];
      return next;
    });
  }, [x, y, enabled, isPaused]);

  const prevGestureRef = React.useRef<GestureType>(gesture);
  const posRef = React.useRef<{ x: number; y: number }>({ x, y });
  posRef.current = { x, y };

  // Trigger ripple on click gesture transition only
  useEffect(() => {
    const prev = prevGestureRef.current;
    prevGestureRef.current = gesture;

    const isClick = gesture === 'LEFT_CLICK' || gesture === 'DOUBLE_CLICK' || gesture === 'RIGHT_CLICK';
    const wasClick = prev === 'LEFT_CLICK' || prev === 'DOUBLE_CLICK' || prev === 'RIGHT_CLICK';

    if (isClick && (!wasClick || gesture !== prev)) {
      const currentPos = posRef.current;
      const newRipple: ClickRipple = {
        id: Date.now() + Math.random(),
        x: currentPos.x,
        y: currentPos.y,
        type: gesture === 'RIGHT_CLICK' ? 'right' : gesture === 'DOUBLE_CLICK' ? 'double' : 'left',
      };
      setRipples((prevList) => [...prevList.slice(-3), newRipple]);

      const timer = setTimeout(() => {
        setRipples((prevList) => prevList.filter((r) => r.id !== newRipple.id));
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [gesture]);

  if (!enabled) return null;

  // Determine accent color by gesture state
  let reticleColor = 'border-cyan-400 text-cyan-300 shadow-cyan-500/50';
  let dotColor = 'bg-cyan-400';
  let badgeText = 'POINT';

  if (isPaused) {
    reticleColor = 'border-amber-400 text-amber-300 shadow-amber-500/50';
    dotColor = 'bg-amber-400';
    badgeText = 'PAUSED';
  } else if (isDragging || gesture === 'DRAGGING' || gesture === 'DRAG_START') {
    reticleColor = 'border-yellow-400 text-yellow-300 shadow-yellow-500/50 scale-110';
    dotColor = 'bg-yellow-400';
    badgeText = 'DRAG';
  } else if (gesture === 'LEFT_CLICK') {
    reticleColor = 'border-emerald-400 text-emerald-300 shadow-emerald-500/50 scale-90';
    dotColor = 'bg-emerald-400';
    badgeText = 'CLICK';
  } else if (gesture === 'DOUBLE_CLICK') {
    reticleColor = 'border-emerald-300 text-emerald-200 shadow-emerald-400/80 scale-95';
    dotColor = 'bg-emerald-300';
    badgeText = '2x CLICK';
  } else if (gesture === 'RIGHT_CLICK') {
    reticleColor = 'border-purple-400 text-purple-300 shadow-purple-500/50';
    dotColor = 'bg-purple-400';
    badgeText = 'RIGHT';
  } else if (gesture === 'SCROLL') {
    reticleColor = 'border-blue-400 text-blue-300 shadow-blue-500/50';
    dotColor = 'bg-blue-400';
    badgeText = 'SCROLL';
  } else if (gesture === 'PEACE_SIGN') {
    reticleColor = 'border-fuchsia-400 text-fuchsia-300 shadow-fuchsia-500/80 scale-125 animate-pulse';
    dotColor = 'bg-fuchsia-400';
    badgeText = 'PEACE (V)';
  } else if (gesture === 'FIST_LOCK') {
    reticleColor = 'border-amber-500 text-amber-300 shadow-amber-500/80 scale-105 ring-2 ring-amber-500/40';
    dotColor = 'bg-amber-500';
    badgeText = 'FIST LOCKED';
  } else if (gesture === 'THUMBS_UP') {
    reticleColor = 'border-teal-400 text-teal-300 shadow-teal-500/80 scale-110';
    dotColor = 'bg-teal-400';
    badgeText = 'THUMBS UP';
  } else if (gesture === 'ROCK_ON') {
    reticleColor = 'border-rose-400 text-rose-300 shadow-rose-500/80';
    dotColor = 'bg-rose-400';
    badgeText = 'ROCK ON';
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Motion trail ghosts */}
      {trail.map((pos, idx) => {
        const opacity = (1 - (idx + 1) / 6) * 0.45;
        const scale = 1 - (idx + 1) * 0.12;
        return (
          <div
            key={idx}
            className="absolute rounded-full pointer-events-none transition-transform duration-75"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              width: '16px',
              height: '16px',
              transform: `translate(-50%, -50%) scale(${scale})`,
              backgroundColor: idx % 2 === 0 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(244, 63, 94, 0.3)',
              opacity,
            }}
          />
        );
      })}

      {/* Click ripples */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className={`absolute rounded-full border-2 animate-ping pointer-events-none ${
            ripple.type === 'right'
              ? 'border-purple-400 bg-purple-500/20'
              : ripple.type === 'double'
              ? 'border-emerald-300 bg-emerald-400/30'
              : 'border-emerald-400 bg-emerald-500/20'
          }`}
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
            width: '48px',
            height: '48px',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Main 3D Cyber Reticle Cursor */}
      <div
        className="absolute pointer-events-none transition-transform duration-75 ease-out"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Outer rotating cyber ring */}
        <div
          className={`w-9 h-9 rounded-full border-2 border-dashed ${reticleColor} animate-[spin_8s_linear_infinite] shadow-lg flex items-center justify-center`}
        >
          {/* Inner crosshair ring */}
          <div className="w-5 h-5 rounded-full border border-slate-200/40 flex items-center justify-center">
            {/* Center core point */}
            <div className={`w-2 h-2 rounded-full ${dotColor} shadow`} />
          </div>
        </div>

        {/* Crosshair ticks */}
        <div className="absolute top-1/2 left-[-6px] w-[6px] h-[2px] bg-cyan-400/80 -translate-y-1/2" />
        <div className="absolute top-1/2 right-[-6px] w-[6px] h-[2px] bg-cyan-400/80 -translate-y-1/2" />
        <div className="absolute left-1/2 top-[-6px] w-[2px] h-[6px] bg-cyan-400/80 -translate-x-1/2" />
        <div className="absolute left-1/2 bottom-[-6px] w-[2px] h-[6px] bg-cyan-400/80 -translate-x-1/2" />

        {/* Attached Gesture Tag */}
        <div
          className={`absolute left-11 top-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border backdrop-blur-md whitespace-nowrap shadow-md ${
            isPaused
              ? 'bg-amber-950/80 border-amber-500 text-amber-300'
              : isDragging
              ? 'bg-yellow-950/80 border-yellow-500 text-yellow-300'
              : gesture === 'LEFT_CLICK' || gesture === 'DOUBLE_CLICK'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
              : gesture === 'RIGHT_CLICK'
              ? 'bg-purple-950/80 border-purple-500 text-purple-300'
              : 'bg-slate-900/85 border-cyan-500/60 text-cyan-300'
          }`}
        >
          {badgeText}
        </div>
      </div>
    </div>
  );
};
