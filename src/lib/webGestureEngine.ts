import {
  LandmarkPoint,
  GestureType,
  TelemetryData,
  SensitivitySettings,
  GestureThresholds,
} from '../types';
import { soundFx } from './soundFx';

export class WebGestureEngine {
  private thresholds: GestureThresholds;
  private sensitivity: SensitivitySettings;

  private lastClickTime: number = 0;
  private lastPinchTime: number = 0;
  private pinchStartTime: number | null = null;
  private wasPinching: boolean = false;
  private wasRightPinching: boolean = false;
  private isDragging: boolean = false;
  private prevScrollY: number | null = null;
  private palmOpenStartTime: number | null = null;
  public isPaused: boolean = false;
  public isCursorFrozen: boolean = false;

  // Timestamps for debounce & hold
  private lastPeaceTime: number = 0;
  private lastThumbsUpTime: number = 0;
  private fistHoldStartTime: number | null = null;
  private wasFist: boolean = false;

  // Smoothing states
  private smoothedX: number = 0.5;
  private smoothedY: number = 0.5;

  constructor(thresholds: GestureThresholds, sensitivity: SensitivitySettings) {
    this.thresholds = thresholds;
    this.sensitivity = sensitivity;
  }

  updateConfig(thresholds: GestureThresholds, sensitivity: SensitivitySettings) {
    this.thresholds = thresholds;
    this.sensitivity = sensitivity;
  }

  private distance(p1: LandmarkPoint, p2: LandmarkPoint): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  computeHandScale(landmarks: LandmarkPoint[]): number {
    if (landmarks.length < 21) return 1.0;
    // Wrist (0) to Middle MCP (9)
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const scale = this.distance(wrist, middleMcp);
    return Math.max(scale, 0.02);
  }

  analyzeFingers(landmarks: LandmarkPoint[]) {
    if (landmarks.length < 21) {
      return { thumb: false, index: false, middle: false, ring: false, pinky: false };
    }

    // A finger is extended when its tip Y is lower than its PIP joint Y
    const index = landmarks[8].y < landmarks[6].y;
    const middle = landmarks[12].y < landmarks[10].y;
    const ring = landmarks[16].y < landmarks[14].y;
    const pinky = landmarks[20].y < landmarks[18].y;

    const thumbTipDist = this.distance(landmarks[4], landmarks[0]);
    const thumbIpDist = this.distance(landmarks[3], landmarks[0]);
    const thumb = thumbTipDist > thumbIpDist;

    return { thumb, index, middle, ring, pinky };
  }

  mapCoordinatesToScreen(
    normX: number,
    normY: number,
    screenWidth: number,
    screenHeight: number
  ): { x: number; y: number } {
    let targetNormX = this.sensitivity.invertX ? 1.0 - normX : normX;
    let targetNormY = this.sensitivity.invertY ? 1.0 - normY : normY;

    // Deadzone margin
    const dz = this.sensitivity.deadZoneRatio;
    let clampedX = (targetNormX - dz) / Math.max(1.0 - 2 * dz, 0.01);
    let clampedY = (targetNormY - dz) / Math.max(1.0 - 2 * dz, 0.01);

    clampedX = Math.max(0, Math.min(1, clampedX));
    clampedY = Math.max(0, Math.min(1, clampedY));

    // Sensitivity scaling relative to center
    const cx = 0.5;
    const cy = 0.5;
    const offX = (clampedX - cx) * this.sensitivity.xSensitivity;
    const offY = (clampedY - cy) * this.sensitivity.ySensitivity;

    const finalTargetX = Math.max(0, Math.min(1, cx + offX));
    const finalTargetY = Math.max(0, Math.min(1, cy + offY));

    // If cursor is position-locked (e.g. by Fist Lock gesture), do not update smoothing
    if (this.isCursorFrozen) {
      return {
        x: Math.round(this.smoothedX * screenWidth),
        y: Math.round(this.smoothedY * screenHeight),
      };
    }

    // Smooth position using Exponential Moving Average
    const dx = finalTargetX - this.smoothedX;
    const dy = finalTargetY - this.smoothedY;
    const rawDist = Math.sqrt(dx * dx + dy * dy);

    // Tremor dead zone
    if (rawDist > 0.001) {
      let alpha = 1.0 - this.sensitivity.smoothingFactor;
      if (this.sensitivity.accelerationEnabled && rawDist > 0.04) {
        alpha = Math.min(1.0, alpha * this.sensitivity.accelerationFactor);
      }
      this.smoothedX = alpha * finalTargetX + (1.0 - alpha) * this.smoothedX;
      this.smoothedY = alpha * finalTargetY + (1.0 - alpha) * this.smoothedY;
    }

    return {
      x: Math.round(this.smoothedX * screenWidth),
      y: Math.round(this.smoothedY * screenHeight),
    };
  }

  processFrame(
    landmarks: LandmarkPoint[],
    screenWidth: number,
    screenHeight: number
  ): {
    gesture: GestureType;
    telemetry: TelemetryData;
    actionEvent?: { type: string; details?: string };
  } {
    const now = performance.now();
    const fingers = this.analyzeFingers(landmarks);
    const handScale = this.computeHandScale(landmarks);

    let activeGesture: GestureType = 'NONE';
    let actionEvent: { type: string; details?: string } | undefined;

    let pinchDistance = 99;
    let rightPinchDistance = 99;
    let scrollDelta = 0;

    if (landmarks.length >= 21) {
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];

      pinchDistance = this.distance(thumbTip, indexTip) / handScale;
      rightPinchDistance = this.distance(thumbTip, middleTip) / handScale;

      // 1. Fist Lock Check (All fingers curled -> Freeze cursor position)
      const isFist = !fingers.thumb && !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky;
      if (isFist) {
        if (!this.wasFist) {
          this.wasFist = true;
          this.isCursorFrozen = true;
          activeGesture = 'FIST_LOCK';
          actionEvent = { type: 'FIST_LOCK', details: 'Cursor Position Locked (Fist Lock Active)' };
          soundFx.playLock();
        } else {
          activeGesture = 'FIST_LOCK';
        }
      } else if (this.wasFist) {
        this.wasFist = false;
        this.isCursorFrozen = false;
        soundFx.playUnlock();
        actionEvent = { type: 'FIST_UNLOCK', details: 'Cursor Unlocked' };
      }

      // 2. Thumbs Up Check (Only Thumb extended upwards -> Resume / Confirm)
      const isThumbsUp =
        fingers.thumb &&
        !fingers.index &&
        !fingers.middle &&
        !fingers.ring &&
        !fingers.pinky &&
        thumbTip.y < landmarks[2].y; // Thumb tip pointing upwards
      if (isThumbsUp && !isFist) {
        if (now - this.lastThumbsUpTime > 800) {
          this.lastThumbsUpTime = now;
          activeGesture = 'THUMBS_UP';
          if (this.isPaused) {
            this.isPaused = false;
            actionEvent = { type: 'RESUME', details: 'Thumbs Up: Tracking Resumed' };
            soundFx.playClick();
          } else {
            actionEvent = { type: 'THUMBS_UP', details: 'Thumbs Up: Confirmed' };
            soundFx.playVoiceRecognized();
          }
        }
      }

      // 3. Pause / Resume check (flat open palm held)
      const allExtended = fingers.thumb && fingers.index && fingers.middle && fingers.ring && fingers.pinky;
      if (allExtended) {
        if (!this.palmOpenStartTime) {
          this.palmOpenStartTime = now;
        } else if (now - this.palmOpenStartTime >= this.thresholds.pauseHoldMs) {
          this.palmOpenStartTime = now + 1200; // cooldown
          this.isPaused = !this.isPaused;
          activeGesture = this.isPaused ? 'PAUSE' : 'RESUME';
          actionEvent = { type: activeGesture, details: this.isPaused ? 'Tracking Paused' : 'Tracking Resumed' };
          if (this.isPaused) soundFx.playRightClick();
          else soundFx.playClick();
        }
      } else {
        this.palmOpenStartTime = null;
      }

      if (!this.isPaused && !isFist && !isThumbsUp) {
        // 4. Check Two-Finger Gestures: Peace Sign vs Parallel Scroll
        const isTwoFingerExtended = fingers.index && fingers.middle && !fingers.ring && !fingers.pinky;
        if (isTwoFingerExtended) {
          const fingerSpread = this.distance(indexTip, middleTip) / handScale;
          const peaceThreshold = this.thresholds.peaceDistanceThreshold || 0.38;

          // If fingers are spread wide apart into 'V' shape => PEACE_SIGN
          if (fingerSpread >= peaceThreshold) {
            this.prevScrollY = null;
            activeGesture = 'PEACE_SIGN';
            if (now - this.lastPeaceTime > 750) {
              this.lastPeaceTime = now;
              actionEvent = { type: 'PEACE_SIGN', details: 'Peace Sign Triggered (Snapshot/Action)' };
              soundFx.playShutter();
            }
          } else {
            // Fingers are parallel and close together => SCROLL
            const avgY = (indexTip.y + middleTip.y) / 2;
            if (this.prevScrollY !== null) {
              scrollDelta = (avgY - this.prevScrollY) * this.thresholds.scrollSensitivity * 400;
              if (Math.abs(scrollDelta) > 1.5) {
                activeGesture = 'SCROLL';
                actionEvent = { type: 'SCROLL', details: `Delta: ${Math.round(scrollDelta)}` };
                soundFx.playScrollTick();
              }
            }
            this.prevScrollY = avgY;
          }
        } else if (fingers.index && fingers.middle && fingers.ring && !fingers.pinky && !fingers.thumb) {
          // 5. Three Fingers (Index, Middle, Ring extended, Pinky curled) -> Open All Apps
          this.prevScrollY = null;
          activeGesture = 'THREE_FINGERS';
          if (now - this.lastPeaceTime > 1200) {
            this.lastPeaceTime = now;
            actionEvent = { type: 'OPEN_ALL_APPS', details: 'Three-Finger Gesture: Launch All Desktop Apps' };
            soundFx.playDoubleClick();
          }
        } else if (fingers.index && fingers.pinky && !fingers.middle && !fingers.ring) {
          // 6. Rock On Gesture (Index & Pinky extended, Middle & Ring curled)
          this.prevScrollY = null;
          activeGesture = 'ROCK_ON';
          if (now - this.lastThumbsUpTime > 1200) {
            this.lastThumbsUpTime = now;
            actionEvent = { type: 'TOGGLE_MUSIC', details: 'Rock On Gesture: Cyber Audio Deck Active' };
            soundFx.playVoiceRecognized();
          }
        } else {
          this.prevScrollY = null;
          // 7. Left Click and Drag & Drop (Thumb + Index Pinch)
          const isPinching = pinchDistance < this.thresholds.pinchThreshold;

            if (isPinching) {
              if (!this.wasPinching) {
                this.wasPinching = true;
                this.pinchStartTime = now;
              } else {
                if (!this.isDragging && this.pinchStartTime) {
                  const holdDuration = now - this.pinchStartTime;
                  if (holdDuration >= this.thresholds.dragHoldMs) {
                    this.isDragging = true;
                    activeGesture = 'DRAG_START';
                    actionEvent = { type: 'DRAG_START', details: 'Mouse Down (Drag Initiated)' };
                    soundFx.playDragStart();
                  }
                }
              }

              if (this.isDragging) {
                activeGesture = 'DRAGGING';
              } else {
                activeGesture = 'MOVE';
              }
            } else {
              // Pinch released
              if (this.isDragging) {
                this.isDragging = false;
                this.wasPinching = false;
                this.pinchStartTime = null;
                activeGesture = 'DRAG_RELEASE';
                actionEvent = { type: 'DRAG_RELEASE', details: 'Mouse Up (Drop)' };
                soundFx.playDragDrop();
              } else if (this.wasPinching) {
                this.wasPinching = false;
                const duration = now - (this.pinchStartTime || now);
                this.pinchStartTime = null;

                if (duration < this.thresholds.dragHoldMs) {
                  // Check double click
                  const timeSinceLastPinch = now - this.lastPinchTime;
                  if (timeSinceLastPinch < this.thresholds.doubleClickWindowMs) {
                    this.lastClickTime = now;
                    this.lastPinchTime = 0;
                    activeGesture = 'DOUBLE_CLICK';
                    actionEvent = { type: 'DOUBLE_CLICK', details: 'Double Click Triggered' };
                    soundFx.playDoubleClick();
                  } else {
                    if (now - this.lastClickTime >= this.thresholds.clickCooldownMs) {
                      this.lastClickTime = now;
                      this.lastPinchTime = now;
                      activeGesture = 'LEFT_CLICK';
                      actionEvent = { type: 'LEFT_CLICK', details: 'Left Click Triggered' };
                      soundFx.playClick();
                    }
                  }
                }
              } else {
                // 7. Right click (Thumb + Middle Pinch)
                const isRightPinching = rightPinchDistance < this.thresholds.rightPinchThreshold;
                if (isRightPinching && !this.wasRightPinching) {
                  this.wasRightPinching = true;
                  if (now - this.lastClickTime >= this.thresholds.clickCooldownMs) {
                    this.lastClickTime = now;
                    activeGesture = 'RIGHT_CLICK';
                    actionEvent = { type: 'RIGHT_CLICK', details: 'Right Click Triggered' };
                    soundFx.playRightClick();
                  }
                } else if (!isRightPinching) {
                  this.wasRightPinching = false;
                  if (fingers.index) {
                    activeGesture = 'MOVE';
                  }
                }
              }
            }
          }
        }
      }

    const indexTipNorm = landmarks.length >= 21 ? landmarks[8] : { x: 0.5, y: 0.5, z: 0 };
    const screenPos = this.mapCoordinatesToScreen(
      indexTipNorm.x,
      indexTipNorm.y,
      screenWidth,
      screenHeight
    );

    const telemetry: TelemetryData = {
      fps: 30,
      latencyMs: Math.round(performance.now() - now),
      handDetected: landmarks.length >= 21,
      handScale,
      pinchDistance,
      rightPinchDistance,
      scrollDelta,
      isDragging: this.isDragging,
      isCursorFrozen: this.isCursorFrozen,
      activeGesture,
      cursorScreenPos: screenPos,
      fingerStates: fingers,
    };

    return { gesture: activeGesture, telemetry, actionEvent };
  }
}
