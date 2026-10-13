import { GestureProfile } from '../types';

export const BUILT_IN_PROFILES: GestureProfile[] = [
  {
    id: 'balanced-default',
    name: 'Balanced Default',
    description: 'Optimal balance of speed and stability for general daily computing & web browsing.',
    isBuiltIn: true,
    sensitivity: {
      xSensitivity: 1.35,
      ySensitivity: 1.35,
      smoothingFactor: 0.65,
      deadZoneRatio: 0.08,
      invertX: true,
      invertY: false,
      accelerationEnabled: true,
      accelerationFactor: 1.25,
    },
    thresholds: {
      pinchThreshold: 0.28,
      rightPinchThreshold: 0.28,
      doubleClickWindowMs: 380,
      dragHoldMs: 320,
      scrollSensitivity: 2.5,
      clickCooldownMs: 250,
      pauseHoldMs: 700,
    },
  },
  {
    id: 'precision-cad',
    name: 'Precision CAD & Drawing',
    description: 'Ultra-low jitter with heightened smoothing, zero acceleration, and high pinch stability.',
    isBuiltIn: true,
    sensitivity: {
      xSensitivity: 0.85,
      ySensitivity: 0.85,
      smoothingFactor: 0.85,
      deadZoneRatio: 0.04,
      invertX: true,
      invertY: false,
      accelerationEnabled: false,
      accelerationFactor: 1.0,
    },
    thresholds: {
      pinchThreshold: 0.24,
      rightPinchThreshold: 0.24,
      doubleClickWindowMs: 420,
      dragHoldMs: 380,
      scrollSensitivity: 1.8,
      clickCooldownMs: 350,
      pauseHoldMs: 800,
    },
  },
  {
    id: 'high-speed-gaming',
    name: 'High-Speed Gaming & Navigation',
    description: 'Snappy response, high cursor acceleration multiplier, and relaxed pinch triggers.',
    isBuiltIn: true,
    sensitivity: {
      xSensitivity: 2.1,
      ySensitivity: 2.1,
      smoothingFactor: 0.40,
      deadZoneRatio: 0.12,
      invertX: true,
      invertY: false,
      accelerationEnabled: true,
      accelerationFactor: 1.6,
    },
    thresholds: {
      pinchThreshold: 0.32,
      rightPinchThreshold: 0.32,
      doubleClickWindowMs: 320,
      dragHoldMs: 260,
      scrollSensitivity: 3.5,
      clickCooldownMs: 180,
      pauseHoldMs: 600,
    },
  },
  {
    id: 'accessibility-stable',
    name: 'Accessibility (Tremor Filter)',
    description: 'Heavy damping to suppress involuntary hand tremors with wide click tolerance windows.',
    isBuiltIn: true,
    sensitivity: {
      xSensitivity: 1.05,
      ySensitivity: 1.05,
      smoothingFactor: 0.88,
      deadZoneRatio: 0.06,
      invertX: true,
      invertY: false,
      accelerationEnabled: false,
      accelerationFactor: 1.0,
    },
    thresholds: {
      pinchThreshold: 0.34,
      rightPinchThreshold: 0.34,
      doubleClickWindowMs: 500,
      dragHoldMs: 480,
      scrollSensitivity: 2.0,
      clickCooldownMs: 450,
      pauseHoldMs: 900,
    },
  },
];

const LOCAL_STORAGE_KEY = 'gesture_mouse_saved_profiles';

export function loadSavedProfiles(): GestureProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return BUILT_IN_PROFILES;
}

export function saveProfilesToStorage(profiles: GestureProfile[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profiles));
  } catch {}
}
