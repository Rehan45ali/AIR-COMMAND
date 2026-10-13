/**
 * GestureMouse AI Type Definitions
 */

export type SystemState = 'ACTIVE' | 'PAUSED' | 'IDLE' | 'STOPPED';

export type ControlMode = 'COMBINED' | 'GESTURE_ONLY' | 'VOICE_ONLY';

export type GestureType =
  | 'NONE'
  | 'MOVE'
  | 'LEFT_CLICK'
  | 'RIGHT_CLICK'
  | 'DOUBLE_CLICK'
  | 'DRAG_START'
  | 'DRAGGING'
  | 'DRAG_RELEASE'
  | 'SCROLL'
  | 'PAUSE'
  | 'RESUME'
  | 'PEACE_SIGN'
  | 'FIST_LOCK'
  | 'THUMBS_UP'
  | 'ROCK_ON'
  | 'THREE_FINGERS';

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  landmarks: LandmarkPoint[];
  handedness?: 'Left' | 'Right';
  score?: number;
}

export interface SensitivitySettings {
  xSensitivity: number;
  ySensitivity: number;
  smoothingFactor: number; // 0.1 (raw/jittery) to 0.95 (ultra smooth)
  deadZoneRatio: number;   // 0.0 to 0.2
  invertX: boolean;
  invertY: boolean;
  accelerationEnabled: boolean;
  accelerationFactor: number;
}

export interface GestureThresholds {
  pinchThreshold: number;        // Normalized threshold (default ~0.28)
  rightPinchThreshold: number;
  doubleClickWindowMs: number;
  dragHoldMs: number;
  scrollSensitivity: number;
  clickCooldownMs: number;
  pauseHoldMs: number;
  peaceDistanceThreshold?: number; // Spread between Index & Middle for peace sign
  fistCurledRatio?: number;        // Curl threshold for fist lock
}

export type CustomActionType = 'SCREENSHOT' | 'FREEZE_CURSOR' | 'CONFIRM' | 'DESKTOP_MINIMIZE' | 'NOTEPAD';

export interface CustomGestureMappings {
  peaceSignAction: CustomActionType;
  fistLockAction: CustomActionType;
  thumbsUpAction: CustomActionType;
}

export interface GestureProfile {
  id: string;
  name: string;
  description: string;
  isBuiltIn?: boolean;
  sensitivity: SensitivitySettings;
  thresholds: GestureThresholds;
  customActions?: CustomGestureMappings;
}

export interface TelemetryData {
  fps: number;
  latencyMs: number;
  handDetected: boolean;
  handScale: number;
  pinchDistance: number;
  rightPinchDistance: number;
  scrollDelta: number;
  isDragging: boolean;
  isCursorFrozen: boolean;
  activeGesture: GestureType;
  cursorScreenPos: { x: number; y: number };
  fingerStates: {
    thumb: boolean;
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
  };
}

export interface VoiceCommandEvent {
  command: string;
  transcript: string;
  timestamp: number;
  confidence?: number;
}

export interface ActionLogItem {
  id: string;
  timestamp: number;
  source: 'GESTURE' | 'VOICE' | 'SYSTEM';
  action: string;
  details?: string;
}
