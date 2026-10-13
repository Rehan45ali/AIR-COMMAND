import React, { useState } from 'react';
import {
  Sliders,
  Bookmark,
  Plus,
  Trash2,
  Download,
  Upload,
  Check,
  Zap,
  Shield,
  MousePointer,
  Maximize,
  Sparkles,
  Info
} from 'lucide-react';
import { GestureProfile, SensitivitySettings, GestureThresholds, TelemetryData } from '../types';
import { BUILT_IN_PROFILES, saveProfilesToStorage } from '../lib/profiles';
import { soundFx } from '../lib/soundFx';

interface DashboardProps {
  activeProfile: GestureProfile;
  profiles: GestureProfile[];
  telemetry: TelemetryData;
  onProfileChange: (profile: GestureProfile) => void;
  onProfilesUpdate: (profiles: GestureProfile[]) => void;
  onSensitivityChange: (sensitivity: SensitivitySettings) => void;
  onThresholdsChange: (thresholds: GestureThresholds) => void;
  className?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  activeProfile,
  profiles,
  telemetry,
  onProfileChange,
  onProfilesUpdate,
  onSensitivityChange,
  onThresholdsChange,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'sensitivity' | 'profiles' | 'gestures'>('sensitivity');
  const [newProfileName, setNewProfileName] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Quick sensitivity adjust
  const handleSensitivityUpdate = (field: keyof SensitivitySettings, value: number | boolean) => {
    const updated: SensitivitySettings = {
      ...activeProfile.sensitivity,
      [field]: value,
    };
    onSensitivityChange(updated);
  };

  const handleThresholdsUpdate = (field: keyof GestureThresholds, value: number) => {
    const updated: GestureThresholds = {
      ...activeProfile.thresholds,
      [field]: value,
    };
    onThresholdsChange(updated);
  };

  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return;
    const newProfile: GestureProfile = {
      id: `profile-${Date.now()}`,
      name: newProfileName.trim(),
      description: 'Custom user calibrated profile.',
      sensitivity: { ...activeProfile.sensitivity },
      thresholds: { ...activeProfile.thresholds },
    };
    const updatedList = [...profiles, newProfile];
    onProfilesUpdate(updatedList);
    saveProfilesToStorage(updatedList);
    onProfileChange(newProfile);
    setNewProfileName('');
    setShowCreateModal(false);
    soundFx.playClick();
  };

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedList = profiles.filter((p) => p.id !== id);
    onProfilesUpdate(updatedList);
    saveProfilesToStorage(updatedList);
    if (activeProfile.id === id) {
      onProfileChange(BUILT_IN_PROFILES[0]);
    }
    soundFx.playRightClick();
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profiles, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'gesture_mouse_profiles.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    soundFx.playClick();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onProfilesUpdate(parsed);
          saveProfilesToStorage(parsed);
          onProfileChange(parsed[0]);
          soundFx.playDoubleClick();
        }
      } catch (err) {
        soundFx.playRightClick();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`flex flex-col bg-slate-900/90 rounded-2xl border border-slate-800 p-5 backdrop-blur-md shadow-2xl ${className}`}>
      {/* Dashboard Tab Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 font-display">CALIBRATION &amp; PROFILES</h3>
            <p className="text-xs text-slate-400">Tweak motion algorithms &amp; manage saved profiles</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              setActiveTab('sensitivity');
              soundFx.playClick();
            }}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeTab === 'sensitivity'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Sensitivity</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('profiles');
              soundFx.playClick();
            }}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeTab === 'profiles'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Profiles ({profiles.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('gestures');
              soundFx.playClick();
            }}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeTab === 'gestures'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gesture Maps</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SENSITIVITY & TUNING */}
      {activeTab === 'sensitivity' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
          {/* Left Column: Motion & Smoothing */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-2">
              <MousePointer className="w-4 h-4" />
              <span>Cursor Dynamics &amp; EMA Smoothing</span>
            </h4>

            {/* X Sensitivity */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">X-Axis Sensitivity</span>
                <span className="text-cyan-400 font-bold">{activeProfile.sensitivity.xSensitivity.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="3.0"
                step="0.05"
                value={activeProfile.sensitivity.xSensitivity}
                onChange={(e) => handleSensitivityUpdate('xSensitivity', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0.4x (Slow/Precise)</span>
                <span>3.0x (Ultra Fast)</span>
              </div>
            </div>

            {/* Y Sensitivity */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Y-Axis Sensitivity</span>
                <span className="text-cyan-400 font-bold">{activeProfile.sensitivity.ySensitivity.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="3.0"
                step="0.05"
                value={activeProfile.sensitivity.ySensitivity}
                onChange={(e) => handleSensitivityUpdate('ySensitivity', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Smoothing Factor */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">EMA Smoothing (Tremor Filter)</span>
                <span className="text-cyan-400 font-bold">
                  {Math.round(activeProfile.sensitivity.smoothingFactor * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.95"
                step="0.02"
                value={activeProfile.sensitivity.smoothingFactor}
                onChange={(e) => handleSensitivityUpdate('smoothingFactor', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Higher smoothing removes hand tremble; lower smoothing maximizes raw responsiveness.
              </p>
            </div>

            {/* Edge Dead Zone */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Screen Boundary Deadzone</span>
                <span className="text-cyan-400 font-bold">
                  {Math.round(activeProfile.sensitivity.deadZoneRatio * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.20"
                step="0.01"
                value={activeProfile.sensitivity.deadZoneRatio}
                onChange={(e) => handleSensitivityUpdate('deadZoneRatio', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Right Column: Pinch Calibration & Meter */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Real-Time Pinch Meter &amp; Thresholds</span>
            </h4>

            {/* Live Pinch Distance Meter */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-cyan-500/30 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300">Normalized Pinch Distance:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${
                  telemetry.pinchDistance < activeProfile.thresholds.pinchThreshold
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                    : 'bg-slate-900 text-slate-300'
                }`}>
                  {telemetry.pinchDistance > 10 ? 'No Hand' : telemetry.pinchDistance.toFixed(2)}
                </span>
              </div>

              {/* Progress Bar Gauge */}
              <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden relative border border-slate-800">
                <div
                  className={`h-full transition-all duration-75 ${
                    telemetry.pinchDistance < activeProfile.thresholds.pinchThreshold
                      ? 'bg-emerald-400'
                      : 'bg-cyan-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, (1 - telemetry.pinchDistance / 0.8) * 100))}%`,
                  }}
                />
                {/* Threshold Marker Needle */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-rose-500 shadow"
                  style={{
                    left: `${Math.min(100, Math.max(0, (1 - activeProfile.thresholds.pinchThreshold / 0.8) * 100))}%`,
                  }}
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Open Hand</span>
                <span className="text-rose-400">Trigger Threshold</span>
                <span>Touching</span>
              </div>
            </div>

            {/* Pinch Threshold Slider */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Pinch Trigger Distance Threshold</span>
                <span className="text-cyan-400 font-bold">{activeProfile.thresholds.pinchThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.16"
                max="0.45"
                step="0.01"
                value={activeProfile.thresholds.pinchThreshold}
                onChange={(e) => handleThresholdsUpdate('pinchThreshold', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Drag Hold Duration */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Drag &amp; Drop Hold Duration</span>
                <span className="text-cyan-400 font-bold">{activeProfile.thresholds.dragHoldMs} ms</span>
              </div>
              <input
                type="range"
                min="180"
                max="600"
                step="20"
                value={activeProfile.thresholds.dragHoldMs}
                onChange={(e) => handleThresholdsUpdate('dragHoldMs', parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Pinching shorter than this triggers a click; holding longer initiates item dragging.
              </p>
            </div>

            {/* Mirror / Invert X Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs font-mono">
                <span className="text-slate-200 block">Mirror Invert X (Recommended)</span>
                <span className="text-[10px] text-slate-500">Maps hand motion naturally to mirror view</span>
              </div>
              <input
                type="checkbox"
                checked={activeProfile.sensitivity.invertX}
                onChange={(e) => handleSensitivityUpdate('invertX', e.target.checked)}
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROFILES */}
      {activeTab === 'profiles' && (
        <div className="mt-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                Saved Hardware Profiles
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">Switch presets or export configs</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs font-mono flex items-center space-x-1 hover:bg-cyan-400 shadow-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Current as New</span>
              </button>
              <button
                onClick={handleExportJSON}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono flex items-center space-x-1 hover:bg-slate-700"
                title="Export profiles to JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
              <label
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono flex items-center space-x-1 hover:bg-slate-700 cursor-pointer"
                title="Import profiles from JSON"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import</span>
                <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
              </label>
            </div>
          </div>

          {/* Profile Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles.map((prof) => {
              const isActive = prof.id === activeProfile.id;
              return (
                <div
                  key={prof.id}
                  onClick={() => {
                    onProfileChange(prof);
                    soundFx.playClick();
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isActive
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-100">{prof.name}</span>
                        {prof.isBuiltIn && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                            DEFAULT
                          </span>
                        )}
                        {isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500 text-slate-950 font-bold flex items-center space-x-1">
                            <Check className="w-3 h-3" />
                            <span>ACTIVE</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-normal">{prof.description}</p>
                    </div>

                    {!prof.isBuiltIn && (
                      <button
                        onClick={(e) => handleDeleteProfile(prof.id, e)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Delete custom profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Profile telemetry snapshot badges */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center space-x-3 text-[11px] font-mono text-slate-400">
                    <span>Sens: <b>{prof.sensitivity.xSensitivity}x</b></span>
                    <span>•</span>
                    <span>Smooth: <b>{Math.round(prof.sensitivity.smoothingFactor * 100)}%</b></span>
                    <span>•</span>
                    <span>Pinch: <b>{prof.thresholds.pinchThreshold}</b></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: GESTURE MAPPER */}
      {activeTab === 'gestures' && (
        <div className="mt-5 space-y-4">
          <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            Active Gesture Mappings Reference
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-cyan-400 font-bold block">Move Cursor</span>
                <span className="text-[11px] text-slate-400">Point with Index Fingertip</span>
              </div>
              <span className="px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800">STANDARD</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-emerald-400 font-bold block">Left Click</span>
                <span className="text-[11px] text-slate-400">Touch Thumb Tip to Index Tip (&lt;320ms)</span>
              </div>
              <span className="px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800">PINCH TAP</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-purple-400 font-bold block">Right Click</span>
                <span className="text-[11px] text-slate-400">Touch Thumb Tip to Middle Tip</span>
              </div>
              <span className="px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800">MID PINCH</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-yellow-400 font-bold block">Drag &amp; Drop</span>
                <span className="text-[11px] text-slate-400">Hold Thumb+Index pinch and move hand</span>
              </div>
              <span className="px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800">PINCH HOLD</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-blue-400 font-bold block">Scroll Page</span>
                <span className="text-[11px] text-slate-400">Index + Middle extended, move up/down</span>
              </div>
              <span className="px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800">2 FINGERS</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-amber-400 font-bold block">Pause / Resume</span>
                <span className="text-[11px] text-slate-400">Open flat palm held for 0.7s</span>
              </div>
              <span className="px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800">FLAT PALM</span>
            </div>

            {/* NEW CUSTOM GESTURES */}
            <div className="p-3 rounded-xl bg-fuchsia-950/40 border border-fuchsia-500/50 flex items-center justify-between">
              <div>
                <span className="text-fuchsia-400 font-bold block flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Peace Sign (V-Shape)</span>
                </span>
                <span className="text-[11px] text-slate-300">Index &amp; Middle spread wide (&gt;38% hand span)</span>
                <span className="text-[10px] text-fuchsia-300/80 block mt-0.5">Action: Snapshot / Screen Flash Shutter</span>
              </div>
              <span className="px-2 py-1 rounded bg-fuchsia-950 border border-fuchsia-500 text-fuchsia-300 font-bold">
                SNAPSHOT
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-center justify-between">
              <div>
                <span className="text-amber-400 font-bold block flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Fist Lock (Curled Fist)</span>
                </span>
                <span className="text-[11px] text-slate-300">All 5 fingers curled into a fist</span>
                <span className="text-[10px] text-amber-300/80 block mt-0.5">Action: Freezes &amp; Locks cursor position</span>
              </div>
              <span className="px-2 py-1 rounded bg-amber-950 border border-amber-500 text-amber-300 font-bold">
                POSITION LOCK
              </span>
            </div>

            <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-500/50 flex items-center justify-between">
              <div>
                <span className="text-teal-400 font-bold block flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Thumbs Up</span>
                </span>
                <span className="text-[11px] text-slate-300">Thumb extended straight up, 4 fingers curled</span>
                <span className="text-[10px] text-teal-300/80 block mt-0.5">Action: Instant Resume &amp; Voice Confirm</span>
              </div>
              <span className="px-2 py-1 rounded bg-teal-950 border border-teal-500 text-teal-300 font-bold">
                RESUME / CONFIRM
              </span>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-center justify-between">
              <div>
                <span className="text-rose-400 font-bold block">Rock On (Index + Pinky)</span>
                <span className="text-[11px] text-slate-300">Index &amp; Pinky extended, Middle &amp; Ring curled</span>
                <span className="text-[10px] text-rose-300/80 block mt-0.5">Action: Custom Quick Tool / Alert</span>
              </div>
              <span className="px-2 py-1 rounded bg-rose-950 border border-rose-500 text-rose-300 font-bold">
                TOOL TOGGLE
              </span>
            </div>
          </div>

          {/* Custom Gesture Calibration Tuning */}
          <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <h5 className="text-xs font-mono font-bold text-cyan-400 uppercase">
              Custom Gesture Sensitivity Tuning
            </h5>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Peace Sign 'V' Spread Sensitivity</span>
                <span className="text-fuchsia-400 font-bold">
                  {Math.round((activeProfile.thresholds.peaceDistanceThreshold || 0.38) * 100)}% span
                </span>
              </div>
              <input
                type="range"
                min="0.28"
                max="0.55"
                step="0.02"
                value={activeProfile.thresholds.peaceDistanceThreshold || 0.38}
                onChange={(e) => handleThresholdsUpdate('peaceDistanceThreshold', parseFloat(e.target.value))}
                className="w-full accent-fuchsia-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Determines how wide index and middle fingers must be spread to trigger Peace Sign vs 2-finger scroll.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Profile Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-cyan-500/50 p-5 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold font-mono text-cyan-300">Save Custom Profile</h4>
            <p className="text-xs text-slate-400">Save your current sensitivity and pinch thresholds as a preset.</p>
            <input
              type="text"
              placeholder="e.g. My Fast FPS Preset"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:border-cyan-400 outline-none"
              autoFocus
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProfile}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs font-mono hover:bg-cyan-400"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
