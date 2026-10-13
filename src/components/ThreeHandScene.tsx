import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { LandmarkPoint, GestureType } from '../types';

interface ThreeHandSceneProps {
  landmarks: LandmarkPoint[];
  activeGesture: GestureType;
  isPaused: boolean;
  className?: string;
}

// MediaPipe Hand Bone Connections
const BONE_CONNECTIONS: [number, number][] = [
  // Palm base
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],// Ring
  [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
  // Palm bridges
  [5, 9], [9, 13], [13, 17], [0, 17]
];

export const ThreeHandScene: React.FC<ThreeHandSceneProps> = ({
  landmarks,
  activeGesture,
  isPaused,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Mesh references for smooth animation
  const jointMeshesRef = useRef<THREE.Mesh[]>([]);
  const boneLinesRef = useRef<THREE.LineSegments | null>(null);
  const laserRayRef = useRef<THREE.Line | null>(null);
  const pointerGlowRef = useRef<THREE.Mesh | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // View mode
  const [viewAngle, setViewAngle] = React.useState<'3D' | 'FRONT' | 'TOP'>('3D');

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 320;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.12);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 2.4);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 2. WebGL Renderer with antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0x0ea5e9, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 2.5);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xa855f7, 3, 5);
    pointLight.position.set(-1, -1, 1);
    scene.add(pointLight);

    // 4. Cybernetic Grid Floor
    const grid = new THREE.GridHelper(4, 20, 0x06b6d4, 0x1e293b);
    grid.position.y = -0.9;
    gridHelperRef.current = grid;
    scene.add(grid);

    // 5. Ambient Floating Particles
    const particleCount = 120;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 4;
      particlePositions[i + 1] = (Math.random() - 0.5) * 3;
      particlePositions[i + 2] = (Math.random() - 0.5) * 3;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.025,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particlesRef.current = particles;
    scene.add(particles);

    // 6. Joint Spheres (21 nodes)
    const sphereGeo = new THREE.SphereGeometry(0.024, 16, 16);
    const tipSphereGeo = new THREE.SphereGeometry(0.038, 20, 20);

    const jointMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < 21; i++) {
      const isTip = [4, 8, 12, 16, 20].includes(i);
      const isIndexTip = i === 8;

      let color = 0x38bdf8; // Cyan default
      if (isIndexTip) color = 0xf43f5e; // Rose / Red index cursor
      else if (i === 4) color = 0x10b981; // Green thumb
      else if (isTip) color = 0xa855f7; // Purple other tips

      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: isIndexTip ? 0.9 : 0.4,
        roughness: 0.2,
        metalness: 0.8,
      });

      const mesh = new THREE.Mesh(isIndexTip ? tipSphereGeo : sphereGeo, mat);
      mesh.position.set(0, 0, -100); // hide initially
      scene.add(mesh);
      jointMeshes.push(mesh);
    }
    jointMeshesRef.current = jointMeshes;

    // 7. Bone Connecting Lines
    const bonePositions = new Float32Array(BONE_CONNECTIONS.length * 2 * 3);
    const boneGeo = new THREE.BufferGeometry();
    boneGeo.setAttribute('position', new THREE.BufferAttribute(bonePositions, 3));
    const boneMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.8,
      linewidth: 2,
    });
    const boneLines = new THREE.LineSegments(boneGeo, boneMat);
    boneLinesRef.current = boneLines;
    scene.add(boneLines);

    // 8. Laser Targeting Ray from Index Tip
    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1.2),
    ]);
    const rayMat = new THREE.LineBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.85,
    });
    const laserRay = new THREE.Line(rayGeo, rayMat);
    laserRayRef.current = laserRay;
    scene.add(laserRay);

    // 9. Pulsing Ring on Index Tip
    const ringGeo = new THREE.RingGeometry(0.045, 0.055, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const pointerGlow = new THREE.Mesh(ringGeo, ringMat);
    pointerGlowRef.current = pointerGlow;
    scene.add(pointerGlow);

    // Render loop
    let clock = 0;
    const animate = () => {
      clock += 0.02;
      animFrameIdRef.current = requestAnimationFrame(animate);

      // Rotate background particles slowly
      if (particlesRef.current) {
        particlesRef.current.rotation.y = clock * 0.05;
      }

      // Animate pointer ring pulse
      if (pointerGlowRef.current) {
        const pulse = 1.0 + 0.15 * Math.sin(clock * 6);
        pointerGlowRef.current.scale.set(pulse, pulse, pulse);
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Camera based on View Angle
  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;

    if (viewAngle === '3D') {
      camera.position.set(0.4, 0.35, 2.2);
    } else if (viewAngle === 'FRONT') {
      camera.position.set(0, 0, 2.0);
    } else if (viewAngle === 'TOP') {
      camera.position.set(0, 2.0, 0.4);
    }
    camera.lookAt(0, 0, 0);
  }, [viewAngle]);

  // Update 3D Landmark positions in real-time
  useEffect(() => {
    const scene = sceneRef.current;
    const jointMeshes = jointMeshesRef.current;
    const boneLines = boneLinesRef.current;
    const laserRay = laserRayRef.current;
    const pointerGlow = pointerGlowRef.current;

    if (!scene || jointMeshes.length < 21 || !boneLines) return;

    if (!landmarks || landmarks.length < 21) {
      // Hide all landmarks if no hand detected
      jointMeshes.forEach((m) => m.position.set(0, 0, -100));
      if (laserRay) laserRay.visible = false;
      if (pointerGlow) pointerGlow.visible = false;
      return;
    }

    if (laserRay) laserRay.visible = true;
    if (pointerGlow) pointerGlow.visible = true;

    // Map MediaPipe coords (0..1, inverted Y) to Three.js world space coords
    const points3D: THREE.Vector3[] = landmarks.map((lm) => {
      // Invert X for mirror view
      const wx = -(lm.x - 0.5) * 1.8;
      const wy = -(lm.y - 0.5) * 1.5;
      const wz = -(lm.z || 0) * 1.8;
      return new THREE.Vector3(wx, wy, wz);
    });

    // Update joint spheres
    points3D.forEach((pos, idx) => {
      const mesh = jointMeshes[idx];
      mesh.position.copy(pos);

      // Highlight active click or gesture colors
      if (idx === 8 && mesh.material instanceof THREE.MeshStandardMaterial) {
        if (activeGesture === 'LEFT_CLICK' || activeGesture === 'DOUBLE_CLICK') {
          mesh.material.color.setHex(0x10b981); // Emerald on click
          mesh.material.emissive.setHex(0x10b981);
        } else if (activeGesture === 'DRAGGING' || activeGesture === 'DRAG_START') {
          mesh.material.color.setHex(0xeab308); // Yellow on drag
          mesh.material.emissive.setHex(0xeab308);
        } else if (activeGesture === 'RIGHT_CLICK') {
          mesh.material.color.setHex(0x8b5cf6); // Purple on right click
          mesh.material.emissive.setHex(0x8b5cf6);
        } else if (activeGesture === 'PEACE_SIGN') {
          mesh.material.color.setHex(0xd946ef); // Fuchsia for Peace sign
          mesh.material.emissive.setHex(0xd946ef);
        } else if (activeGesture === 'FIST_LOCK') {
          mesh.material.color.setHex(0xf59e0b); // Gold for Fist Lock
          mesh.material.emissive.setHex(0xf59e0b);
        } else if (activeGesture === 'THUMBS_UP') {
          mesh.material.color.setHex(0x14b8a6); // Teal for Thumbs up
          mesh.material.emissive.setHex(0x14b8a6);
        } else {
          mesh.material.color.setHex(0xf43f5e);
          mesh.material.emissive.setHex(0xf43f5e);
        }
      }
    });

    // Update bone line vertices
    const boneAttr = boneLines.geometry.attributes.position as THREE.BufferAttribute;
    const boneArr = boneAttr.array as Float32Array;
    let bIdx = 0;

    BONE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const p1 = points3D[startIdx];
      const p2 = points3D[endIdx];

      boneArr[bIdx++] = p1.x;
      boneArr[bIdx++] = p1.y;
      boneArr[bIdx++] = p1.z;

      boneArr[bIdx++] = p2.x;
      boneArr[bIdx++] = p2.y;
      boneArr[bIdx++] = p2.z;
    });
    boneAttr.needsUpdate = true;

    // Update laser targeting ray from Index Tip (index 8)
    const indexTip = points3D[8];
    if (laserRay && pointerGlow) {
      const rayAttr = laserRay.geometry.attributes.position as THREE.BufferAttribute;
      const rayArr = rayAttr.array as Float32Array;

      rayArr[0] = indexTip.x;
      rayArr[1] = indexTip.y;
      rayArr[2] = indexTip.z;

      rayArr[3] = indexTip.x;
      rayArr[4] = indexTip.y;
      rayArr[5] = indexTip.z - 0.7; // extend forward
      rayAttr.needsUpdate = true;

      pointerGlow.position.copy(indexTip);
    }
  }, [landmarks, activeGesture, isPaused]);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-950/80 border border-cyan-500/30 backdrop-blur-md shadow-2xl shadow-cyan-950/40 ${className}`}>
      {/* 3D Scene Viewport */}
      <div ref={mountRef} className="w-full h-full min-h-[300px]" />

      {/* Cybernetic HUD Overlay Badges */}
      <div className="absolute top-3 left-3 flex items-center space-x-2 pointer-events-none">
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 border border-cyan-500/40 text-xs font-mono text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>3D HOLOGRAPHIC RIG</span>
        </div>
        <div className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 text-[10px] font-mono text-slate-400">
          THREE.JS WEBGL
        </div>
      </div>

      {/* Camera angle toggle controls */}
      <div className="absolute top-3 right-3 flex items-center space-x-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
        {(['3D', 'FRONT', 'TOP'] as const).map((angle) => (
          <button
            key={angle}
            onClick={() => setViewAngle(angle)}
            className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
              viewAngle === angle
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {angle}
          </button>
        ))}
      </div>

      {/* Bottom Status Ticker */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-2">
          <span className="text-slate-500">ACTIVE GESTURE:</span>
          <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-bold">
            {isPaused ? 'PAUSED' : activeGesture}
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          {landmarks && landmarks.length >= 21 ? '21 SKELETON NODES TRACKED' : 'AWAITING HAND...'}
        </div>
      </div>
    </div>
  );
};
