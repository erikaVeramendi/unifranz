import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FilesetResolver,
  PoseLandmarker,
  FaceLandmarker,
  HandLandmarker,
} from '@mediapipe/tasks-vision';
import {
  lerp,
  lerpAngle,
  clamp,
  drawPixelDino,
  drawHolographicScales,
  processVrHeadsetImage,
  analyzeHandGesture,
  detectSmileFromFace,
} from './utils/arHelpers';
import LoadingScreen from './components/LoadingScreen';
import PhotoModal from './components/PhotoModal';
import UnifranzLogo from './components/UnifranzLogo';
import {
  Camera,
  Code2,
  Scale,
  Glasses,
  Sparkles,
  Hand,
  Smile,
  Activity,
  Scan,
  Maximize2,
  RefreshCw,
} from 'lucide-react';

// Modes available in the AR Mirror
const AR_MODES = [
  {
    id: 'SIS',
    shortName: 'Ing. de Sistemas',
    fullName: 'Ingeniería de Sistemas e Innovación Digital',
    profileTitle: 'PERFIL DETECTADO: Futuro Ingeniero de Sistemas',
    profileMode: 'Modo: Innovación Digital & IA',
    badge: 'TECH & AI LEADER',
  },
  {
    id: 'DER',
    shortName: 'Derecho',
    fullName: 'Derecho, Justicia & Liderazgo Global',
    profileTitle: 'PERFIL DETECTADO: Futuro Abogado UNIFRANZ',
    profileMode: 'Modo: Justicia & Liderazgo',
    badge: 'LEX & LEADERSHIP',
  },
  {
    id: 'VR_ONLY',
    shortName: 'Solo Lentes VR',
    fullName: 'Inmersión Metaverso & Realidad Extendida',
    profileTitle: 'PERFIL DETECTADO: Explorador XR UNIFRANZ',
    profileMode: 'Modo: Metaverso & Visión Futura',
    badge: 'XR VISIONARY',
  },
];

export default function App() {
  // UI States
  const [selectedCareer, setSelectedCareer] = useState('SIS'); // 'SIS' | 'DER' | 'VR_ONLY'
  const [vrEnabled, setVrEnabled] = useState(true);
  const [hudEnabled, setHudEnabled] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(10);
  const [loadingStatus, setLoadingStatus] = useState('Inicializando motor neuronal MediaPipe...');
  const [cameraError, setCameraError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);

  // Interactive HUD Feedback States
  const [proximityLevel, setProximityLevel] = useState(0.25); // 0 to 1
  const [personDetected, setPersonDetected] = useState(false);
  const [gestureBanner, setGestureBanner] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [flashActive, setFlashActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [fpsCount, setFpsCount] = useState(60);

  // Refs for real-time 60 FPS loop
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  // Live state mirror ref for inside requestAnimationFrame
  const stateRef = useRef({
    selectedCareer: 'SIS',
    vrEnabled: true,
    hudEnabled: true,
    isSimulationMode: false,
    countdownActive: false,
  });

  useEffect(() => {
    stateRef.current.selectedCareer = selectedCareer;
    stateRef.current.vrEnabled = vrEnabled;
    stateRef.current.hudEnabled = hudEnabled;
    stateRef.current.isSimulationMode = isSimulationMode;
    stateRef.current.countdownActive = countdown !== null;
  }, [selectedCareer, vrEnabled, hudEnabled, isSimulationMode, countdown]);

  // MediaPipe Landmarker Refs
  const landmarkersRef = useRef({
    pose: null,
    face: null,
    hand: null,
  });

  // Preloaded Image Assets Refs
  const assetsRef = useRef({
    shirtSis: null,
    shirtDer: null,
    vrHeadset: null,
    logoImg: null,
  });

  // Smoothed (Lerped) Tracking State Ref
  const trackingRef = useRef({
    hasBody: false,
    bodyLostFrames: 0,
    scanStartTime: 0,
    proximity: 0.25,
    // Torso smoothed coordinates (in normalized [0..1] mirrored space)
    shoulderCenterX: 0.5,
    shoulderCenterY: 0.44,
    hipCenterX: 0.5,
    hipCenterY: 0.78,
    shoulderWidth: 0.26,
    torsoHeight: 0.34,
    shoulderAngle: 0,
    // Face smoothed coordinates (in normalized [0..1] mirrored space)
    hasFace: false,
    faceLostFrames: 0,
    eyeCenterX: 0.5,
    eyeCenterY: 0.25,
    eyeDistance: 0.085,
    headRoll: 0,
    headYaw: 0,
    headPitch: 0,
    // Hand & Gesture cooldowns
    lastModeSwitchTime: 0,
    lastPhotoTriggerTime: 0,
    openHandHoldFrames: 0,
    peaceOrSmileHoldFrames: 0,
    shockwaves: [],
    particles: [],
  });

  // Initialize floating particles (binary, pixel dinos, golden sparks)
  useEffect(() => {
    const pts = [];
    for (let i = 0; i < 42; i++) {
      pts.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0012,
        vy: -0.0012 - Math.random() * 0.0022,
        size: 10 + Math.random() * 12,
        type: i % 5 === 0 ? 'DINO' : i % 2 === 0 ? '0' : '1',
        alpha: 0.25 + Math.random() * 0.65,
        color: Math.random() > 0.35 ? '#FF6B00' : '#FFFFFF',
      });
    }
    trackingRef.current.particles = pts;
  }, []);

  // Load AR PNG/SVG assets
  const preloadAssets = useCallback(async () => {
    const loadImg = (src, fallbackSrc = null) =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => {
          if (fallbackSrc) {
            const fb = new Image();
            fb.crossOrigin = 'anonymous';
            fb.onload = () => resolve(fb);
            fb.onerror = () => resolve(null);
            fb.src = fallbackSrc;
          } else {
            resolve(null);
          }
        };
        img.src = src;
      });

    const [sisImg, derImg, vrRawImg, logoImg] = await Promise.all([
      loadImg('/assets/POLERA-SIS.png'),
      loadImg('/assets/POLERA-DER.png'),
      loadImg('/assets/LENTES-VR.jpg', '/assets/LENTES-VR.png'),
      loadImg('/assets/logo-unifranz.png', '/assets/logo-unifranz.svg'),
    ]);

    assetsRef.current.shirtSis = sisImg;
    assetsRef.current.shirtDer = derImg;
    assetsRef.current.vrHeadset = vrRawImg ? processVrHeadsetImage(vrRawImg) : null;
    assetsRef.current.logoImg = logoImg;
  }, []);

  // Initialize Camera and MediaPipe Models
  const initExperience = useCallback(async (useSimulation = false) => {
    setCameraError(null);
    setLoadingProgress(15);
    setLoadingStatus('Cargando prendas AR y recursos gráficos UNIFRANZ...');
    await preloadAssets();

    setLoadingProgress(35);
    setLoadingStatus('Solicitando acceso a cámara de alta velocidad...');

    if (!useSimulation) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
            frameRate: { ideal: 60 },
          },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        setCameraError(
          'No se detectó una cámara disponible o el permiso fue denegado. Puedes reintentar o activar el Modo Simulación Holográfica interactiva.'
        );
        return;
      }
    } else {
      setIsSimulationMode(true);
    }

    setLoadingProgress(60);
    setLoadingStatus('Inicializando MediaPipe Tasks Vision (Pose, Face & Hand)...');

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm'
      );

      setLoadingProgress(75);
      const [poseLandmarker, faceLandmarker, handLandmarker] = await Promise.all([
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        }),
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
        }),
        HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        }),
      ]);

      landmarkersRef.current = {
        pose: poseLandmarker,
        face: faceLandmarker,
        hand: handLandmarker,
      };
    } catch (visionErr) {
      console.warn('MediaPipe CDN fallback warning:', visionErr);
    }

    setLoadingProgress(100);
    setLoadingStatus('¡Espejo de Realidad Aumentada UNIFRANZ Listo!');
    setTimeout(() => setIsReady(true), 350);
  }, [preloadAssets]);

  useEffect(() => {
    initExperience(false);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, [initExperience]);

  // Spawn an orange energy shockwave on mode change
  const triggerEnergyShockwave = useCallback((normX = 0.5, normY = 0.45, label = '') => {
    trackingRef.current.shockwaves.push({
      x: normX,
      y: normY,
      radius: 10,
      maxRadius: Math.max(window.innerWidth, window.innerHeight) * 0.75,
      alpha: 1,
    });
    if (label) {
      setGestureBanner(label);
      setTimeout(() => setGestureBanner(null), 2400);
    }
  }, []);

  // Cycle between SIS -> DER -> VR_ONLY (Triggered by Open Right Hand or UI)
  const cycleArMode = useCallback(
    (handPos = { x: 0.5, y: 0.45 }, fromGesture = false) => {
      const current = stateRef.current.selectedCareer;
      let nextMode = 'SIS';
      if (current === 'SIS') nextMode = 'DER';
      else if (current === 'DER') nextMode = 'VR_ONLY';
      else nextMode = 'SIS';

      setSelectedCareer(nextMode);
      if (nextMode === 'VR_ONLY') {
        setVrEnabled(true);
      }
      // Re-trigger the 1.5s cyberpunk scan animation when switching profile
      trackingRef.current.scanStartTime = performance.now();

      const modeObj = AR_MODES.find((m) => m.id === nextMode);
      triggerEnergyShockwave(
        handPos.x,
        handPos.y,
        fromGesture
          ? `✋ GESTO DETECTADO: ${modeObj.shortName.toUpperCase()}`
          : `MODO ACTIVO: ${modeObj.shortName.toUpperCase()}`
      );
    },
    [triggerEnergyShockwave]
  );

  // Capture High-Resolution Commemorative Photo with UNIFRANZ Frame
  const captureCommemorativePhoto = useCallback(() => {
    const mainCanvas = canvasRef.current;
    if (!mainCanvas) return;

    // Trigger visual flash
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 380);

    const outCanvas = document.createElement('canvas');
    const W = 1280;
    const H = 960;
    outCanvas.width = W;
    outCanvas.height = H;
    const ctx = outCanvas.getContext('2d');

    // Deep dark background
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, W, H);

    // Draw captured AR Mirror scene inside frame (preserving aspect ratio)
    const photoAreaH = H - 150;
    const srcRatio = mainCanvas.width / mainCanvas.height;
    const dstRatio = W / photoAreaH;
    let drawW = W;
    let drawH = photoAreaH;
    let offsetX = 0;
    let offsetY = 0;

    if (srcRatio > dstRatio) {
      drawH = photoAreaH;
      drawW = drawH * srcRatio;
      offsetX = (W - drawW) / 2;
    } else {
      drawW = W;
      drawH = drawW / srcRatio;
      offsetY = (photoAreaH - drawH) / 2;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(18, 18, W - 36, photoAreaH - 18);
    ctx.clip();
    ctx.drawImage(mainCanvas, offsetX, offsetY, drawW, drawH);
    ctx.restore();

    // Neon Orange Outer Frame Border
    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 5;
    ctx.strokeRect(18, 18, W - 36, H - 36);

    // Top-right Event Tag
    ctx.fillStyle = 'rgba(10, 10, 10, 0.82)';
    ctx.fillRect(W - 310, 36, 270, 44);
    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 2;
    ctx.strokeRect(W - 310, 36, 270, 44);
    ctx.fillStyle = '#FF6B00';
    ctx.font = '800 16px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('#InnovaciónUnifranz', W - 175, 64);

    // Bottom Commemorative Footer Bar
    const footerY = H - 145;
    const footerGrad = ctx.createLinearGradient(0, footerY, W, H);
    footerGrad.addColorStop(0, '#0D0D0D');
    footerGrad.addColorStop(0.5, '#16120E');
    footerGrad.addColorStop(1, '#0A0A0A');
    ctx.fillStyle = footerGrad;
    ctx.fillRect(20, footerY, W - 40, 125);

    // Top orange divider on footer
    ctx.fillStyle = '#FF6B00';
    ctx.fillRect(20, footerY, W - 40, 4);

    // Draw UNIFRANZ Official Logo in footer
    if (assetsRef.current.logoImg) {
      ctx.drawImage(assetsRef.current.logoImg, 44, footerY + 24, 260, 62);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 36px "Orbitron", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('UNIFRANZ', 46, footerY + 68);
    }

    // Career Name & Timestamp in Footer
    const activeMode =
      AR_MODES.find((m) => m.id === stateRef.current.selectedCareer) || AR_MODES[0];
    const nowStr = new Date().toLocaleDateString('es-BO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    ctx.textAlign = 'right';
    ctx.fillStyle = '#FF6B00';
    ctx.font = '800 22px "Orbitron", sans-serif';
    ctx.fillText(activeMode.fullName.toUpperCase(), W - 48, footerY + 52);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 15px "Space Grotesk", sans-serif';
    ctx.fillText(
      `UNIFRANZ AR MIRROR EXPERIENCE  •  ${nowStr}  •  #InnovaciónUnifranz`,
      W - 48,
      footerY + 86
    );

    const framedDataUrl = outCanvas.toDataURL('image/png', 0.94);

    // Build compact QR payload so mobile scanners immediately show a souvenir verification link/card
    const qrUrl = `${window.location.origin}/?souvenir=UNIFRANZ-AR&carrera=${encodeURIComponent(
      activeMode.shortName
    )}&fecha=${encodeURIComponent(nowStr)}&tag=InnovacionUnifranz`;

    setCapturedPhoto({
      framedDataUrl,
      careerLabel: activeMode.fullName,
      timestamp: nowStr,
      sharePayload: qrUrl,
    });
  }, []);

  // Trigger 3... 2... 1... Holographic Countdown
  const startPhotoCountdown = useCallback(
    (reasonText = '📸 INICIANDO CAPTURA SOUNVENIR') => {
      if (stateRef.current.countdownActive) return;
      setGestureBanner(reasonText);
      setCountdown(3);

      let current = 3;
      const timer = setInterval(() => {
        current -= 1;
        if (current > 0) {
          setCountdown(current);
        } else {
          clearInterval(timer);
          setCountdown(null);
          setGestureBanner(null);
          captureCommemorativePhoto();
        }
      }, 950);
    },
    [captureCommemorativePhoto]
  );

  // Main 60 FPS Render & Computer Vision Loop
  useEffect(() => {
    if (!isReady) return;

    let lastFpsUpdate = performance.now();
    let frameCounter = 0;
    let lastVideoTime = -1;

    const renderLoop = (now) => {
      rafRef.current = requestAnimationFrame(renderLoop);

      frameCounter++;
      if (now - lastFpsUpdate >= 500) {
        setFpsCount(Math.min(60, Math.round((frameCounter * 1000) / (now - lastFpsUpdate))));
        frameCounter = 0;
        lastFpsUpdate = now;
      }

      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas) return;

      // Resize canvas to full viewport
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;
      const tState = trackingRef.current;
      const { selectedCareer: mode, vrEnabled: showVr, hudEnabled: showHud, isSimulationMode: sim } =
        stateRef.current;

      ctx.clearRect(0, 0, W, H);

      // 1. Draw Mirrored Video Feed (Cover Viewport) or Holographic Simulation Backdrop
      let drawX = 0;
      let drawY = 0;
      let drawW = W;
      let drawH = H;

      if (!sim && video && video.readyState >= 2) {
        const vW = video.videoWidth || 1280;
        const vH = video.videoHeight || 720;
        const vRatio = vW / vH;
        const cRatio = W / H;

        if (vRatio > cRatio) {
          drawH = H;
          drawW = H * vRatio;
          drawX = (W - drawW) / 2;
        } else {
          drawW = W;
          drawH = W / vRatio;
          drawY = (H - drawH) / 2;
        }

        ctx.save();
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, W - drawX - drawW, drawY, drawW, drawH);
        ctx.restore();
      } else {
        // Simulation Mode Cyberpunk Grid Studio Backdrop
        const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.45, 50, W * 0.5, H * 0.5, W * 0.8);
        bgGrad.addColorStop(0, '#1C140D');
        bgGrad.addColorStop(0.55, '#0E0E0E');
        bgGrad.addColorStop(1, '#050505');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);
      }

      // Helper to map normalized (0..1) video coordinates into mirrored screen pixel coordinates
      const toScreenX = (normX) => drawX + (1 - normX) * drawW;
      const toScreenY = (normY) => drawY + normY * drawH;

      // 2. Execute MediaPipe Vision Tasks on current video frame
      let poseLandmarks = null;
      let faceLandmarks = null;
      let faceBlendshapes = null;
      let handResults = null;

      if (!sim && video && video.readyState >= 2) {
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const ts = performance.now();
          try {
            if (landmarkersRef.current.pose) {
              const pRes = landmarkersRef.current.pose.detectForVideo(video, ts);
              if (pRes?.landmarks?.length > 0) poseLandmarks = pRes.landmarks[0];
            }
            if (landmarkersRef.current.face) {
              const fRes = landmarkersRef.current.face.detectForVideo(video, ts);
              if (fRes?.faceLandmarks?.length > 0) {
                faceLandmarks = fRes.faceLandmarks[0];
                faceBlendshapes = fRes.faceBlendshapes;
              }
            }
            if (landmarkersRef.current.hand) {
              handResults = landmarkersRef.current.hand.detectForVideo(video, ts);
            }
          } catch (e) {
            // Continue smoothly if a frame detection skips
          }
        }
      } else if (sim) {
        // Synthetic natural breathing avatar coordinates for Simulation Mode
        const breath = Math.sin(now * 0.0025) * 0.008;
        const sway = Math.sin(now * 0.0014) * 0.015;
        poseLandmarks = [];
        poseLandmarks[11] = { x: 0.62 + sway, y: 0.43 + breath, z: 0, visibility: 0.99 };
        poseLandmarks[12] = { x: 0.38 + sway, y: 0.43 - breath * 0.5, z: 0, visibility: 0.99 };
        poseLandmarks[23] = { x: 0.58 + sway, y: 0.78 + breath, z: 0, visibility: 0.99 };
        poseLandmarks[24] = { x: 0.42 + sway, y: 0.78 + breath, z: 0, visibility: 0.99 };

        faceLandmarks = [];
        faceLandmarks[33] = { x: 0.545 + sway, y: 0.25 + breath, z: 0 };
        faceLandmarks[263] = { x: 0.455 + sway, y: 0.25 - breath * 0.4, z: 0 };
        faceLandmarks[1] = { x: 0.5 + sway, y: 0.28 + breath, z: 0 };
      }

      // 3. Process & Lerp Pose Landmarks (11, 12 Shoulders & 23, 24 Hips)
      if (poseLandmarks && poseLandmarks[11] && poseLandmarks[12]) {
        const lShoulder = poseLandmarks[11];
        const rShoulder = poseLandmarks[12];
        const lHip = poseLandmarks[23] || { x: lShoulder.x, y: lShoulder.y + 0.34 };
        const rHip = poseLandmarks[24] || { x: rShoulder.x, y: rShoulder.y + 0.34 };

        const sx1 = toScreenX(lShoulder.x);
        const sy1 = toScreenY(lShoulder.y);
        const sx2 = toScreenX(rShoulder.x);
        const sy2 = toScreenY(rShoulder.y);

        const hx1 = toScreenX(lHip.x);
        const hy1 = toScreenY(lHip.y);
        const hx2 = toScreenX(rHip.x);
        const hy2 = toScreenY(rHip.y);

        const targetCenterX = (sx1 + sx2) / 2;
        const targetCenterY = (sy1 + sy2) / 2;
        const targetHipX = (hx1 + hx2) / 2;
        const targetHipY = (hy1 + hy2) / 2;

        const targetShoulderWidth = Math.hypot(sx1 - sx2, sy1 - sy2);
        const targetTorsoHeight = Math.hypot(
          targetHipX - targetCenterX,
          targetHipY - targetCenterY
        );

        // Angle of shoulders on mirrored screen (sx2,sy2 is left-side of screen, sx1,sy1 is right-side)
        const dx = sx1 - sx2;
        const dy = sy1 - sy2;
        let targetAngle = Math.atan2(dy, dx);
        if (dx < 0) {
          targetAngle += Math.PI;
        }
        targetAngle = clamp(targetAngle, -0.55, 0.55);

        if (!tState.hasBody) {
          tState.hasBody = true;
          tState.scanStartTime = now;
          setPersonDetected(true);
          tState.shoulderCenterX = targetCenterX;
          tState.shoulderCenterY = targetCenterY;
          tState.hipCenterX = targetHipX;
          tState.hipCenterY = targetHipY;
          tState.shoulderWidth = targetShoulderWidth;
          tState.torsoHeight = targetTorsoHeight;
          tState.shoulderAngle = targetAngle;
        } else {
          // Smooth linear interpolation (lerp) to eliminate jitter
          const smoothFactor = 0.24;
          tState.shoulderCenterX = lerp(tState.shoulderCenterX, targetCenterX, smoothFactor);
          tState.shoulderCenterY = lerp(tState.shoulderCenterY, targetCenterY, smoothFactor);
          tState.hipCenterX = lerp(tState.hipCenterX, targetHipX, smoothFactor);
          tState.hipCenterY = lerp(tState.hipCenterY, targetHipY, smoothFactor);
          tState.shoulderWidth = lerp(tState.shoulderWidth, targetShoulderWidth, smoothFactor);
          tState.torsoHeight = lerp(tState.torsoHeight, targetTorsoHeight, smoothFactor);
          tState.shoulderAngle = lerpAngle(tState.shoulderAngle, targetAngle, smoothFactor);
        }

        tState.bodyLostFrames = 0;

        // Calculate proximity (0..1) from shoulder ratio relative to screen width
        const rawProx = clamp((tState.shoulderWidth / W - 0.14) / 0.28, 0.15, 1.0);
        tState.proximity = lerp(tState.proximity, rawProx, 0.1);
        if (frameCounter % 10 === 0) {
          setProximityLevel(Number(tState.proximity.toFixed(2)));
        }
      } else {
        tState.bodyLostFrames++;
        if (tState.bodyLostFrames > 25 && tState.hasBody) {
          tState.hasBody = false;
          setPersonDetected(false);
        }
      }

      // 4. Process & Lerp Face Landmarks (Eyes, Temples, Head Pitch/Yaw/Roll)
      if (faceLandmarks && faceLandmarks[33] && faceLandmarks[263]) {
        const leftEyeOuter = faceLandmarks[33];
        const rightEyeOuter = faceLandmarks[263];
        const noseTip = faceLandmarks[1] || {
          x: (leftEyeOuter.x + rightEyeOuter.x) / 2,
          y: (leftEyeOuter.y + rightEyeOuter.y) / 2,
        };

        const ex1 = toScreenX(leftEyeOuter.x);
        const ey1 = toScreenY(leftEyeOuter.y);
        const ex2 = toScreenX(rightEyeOuter.x);
        const ey2 = toScreenY(rightEyeOuter.y);
        const nx = toScreenX(noseTip.x);
        const ny = toScreenY(noseTip.y);

        const targetEyeCenterX = (ex1 + ex2) / 2;
        const targetEyeCenterY = (ey1 + ey2) / 2;
        const targetEyeDist = Math.hypot(ex1 - ex2, ey1 - ey2);

        const fdx = ex1 - ex2;
        const fdy = ey1 - ey2;
        let targetRoll = Math.atan2(fdy, fdx);
        if (fdx < 0) targetRoll += Math.PI;
        targetRoll = clamp(targetRoll, -0.65, 0.65);

        // Estimate head yaw (-1..1) and pitch from nose offset relative to eyes
        const targetYaw = clamp((nx - targetEyeCenterX) / (targetEyeDist * 0.7), -0.8, 0.8);
        const targetPitch = clamp((ny - targetEyeCenterY) / (targetEyeDist * 0.9) - 0.35, -0.5, 0.5);

        if (!tState.hasFace) {
          tState.hasFace = true;
          tState.eyeCenterX = targetEyeCenterX;
          tState.eyeCenterY = targetEyeCenterY;
          tState.eyeDistance = targetEyeDist;
          tState.headRoll = targetRoll;
          tState.headYaw = targetYaw;
          tState.headPitch = targetPitch;
        } else {
          const faceLerp = 0.32;
          tState.eyeCenterX = lerp(tState.eyeCenterX, targetEyeCenterX, faceLerp);
          tState.eyeCenterY = lerp(tState.eyeCenterY, targetEyeCenterY, faceLerp);
          tState.eyeDistance = lerp(tState.eyeDistance, targetEyeDist, faceLerp);
          tState.headRoll = lerpAngle(tState.headRoll, targetRoll, faceLerp);
          tState.headYaw = lerp(tState.headYaw, targetYaw, faceLerp);
          tState.headPitch = lerp(tState.headPitch, targetPitch, faceLerp);
        }
        tState.faceLostFrames = 0;

        // Fallback proximity from face if torso is partially out of frame
        if (!tState.hasBody) {
          tState.hasBody = true;
          tState.scanStartTime = now;
          setPersonDetected(true);
        }
        if (poseLandmarks == null) {
          tState.shoulderCenterX = lerp(
            tState.shoulderCenterX,
            tState.eyeCenterX,
            0.2
          );
          tState.shoulderCenterY = lerp(
            tState.shoulderCenterY,
            tState.eyeCenterY + tState.eyeDistance * 2.25,
            0.2
          );
          tState.shoulderWidth = lerp(
            tState.shoulderWidth,
            tState.eyeDistance * 3.1,
            0.2
          );
          tState.torsoHeight = lerp(
            tState.torsoHeight,
            tState.eyeDistance * 4.2,
            0.2
          );
          tState.shoulderAngle = lerpAngle(tState.shoulderAngle, tState.headRoll * 0.5, 0.2);
        }
      } else {
        tState.faceLostFrames++;
        if (tState.faceLostFrames > 20) {
          tState.hasFace = false;
        }
      }

      // 5. Render Sim Avatar Silhouette if in Simulation Mode
      if (sim && tState.hasBody) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 107, 0, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tState.eyeCenterX, tState.eyeCenterY, tState.eyeDistance * 0.95, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 6. VIRTUAL TRY-ON: Superimpose UNIFRANZ Career Polera (SIS or DER)
      if (tState.hasBody && mode !== 'VR_ONLY') {
        const shirtImg =
          mode === 'SIS' ? assetsRef.current.shirtSis : assetsRef.current.shirtDer;

        if (shirtImg) {
          ctx.save();
          // Anchor at shoulder center, rotated by shoulder angle
          ctx.translate(tState.shoulderCenterX, tState.shoulderCenterY);
          ctx.rotate(tState.shoulderAngle);

          // Scale shirt width generously across shoulders + sleeves
          const shirtW = tState.shoulderWidth * 2.02;
          const naturalRatio =
            (shirtImg.naturalHeight || 800) / (shirtImg.naturalWidth || 800);
          // Blend natural ratio with detected torso height for organic fit
          const shirtH = Math.max(
            shirtW * naturalRatio,
            tState.torsoHeight * 1.48
          );

          // Collar alignment offset above shoulder line
          const collarOffsetY = -shirtH * 0.165;

          ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
          ctx.shadowBlur = 18;
          ctx.drawImage(shirtImg, -shirtW / 2, collarOffsetY, shirtW, shirtH);
          ctx.restore();
        }
      }

      // 7. FACIAL AR: Superimpose Futuristic VR Headset
      if (showVr && (tState.hasFace || (tState.hasBody && mode === 'VR_ONLY'))) {
        const vrCanvas = assetsRef.current.vrHeadset;
        if (vrCanvas) {
          const vx = tState.hasFace ? tState.eyeCenterX : tState.shoulderCenterX;
          const vy = tState.hasFace
            ? tState.eyeCenterY
            : tState.shoulderCenterY - tState.shoulderWidth * 0.72;
          const eDist = tState.hasFace ? tState.eyeDistance : tState.shoulderWidth * 0.32;

          ctx.save();
          ctx.translate(vx + tState.headYaw * eDist * 0.22, vy + tState.headPitch * eDist * 0.18);
          ctx.rotate(tState.headRoll);

          // Scale headset across temples; crop account for transparent margins in 1024x1024 asset
          const vrW = eDist * 3.05;
          const vrH = vrW;

          // Subtle perspective horizontal scale on head yaw
          const yawScaleX = 1 - Math.abs(tState.headYaw) * 0.12;
          ctx.scale(yawScaleX, 1);

          // Visor center in LENTES-VR asset is slightly below middle (~55% of image height)
          ctx.shadowColor = 'rgba(56, 189, 248, 0.65)';
          ctx.shadowBlur = 20;
          ctx.drawImage(vrCanvas, -vrW / 2, -vrH * 0.56, vrW, vrH);
          ctx.restore();
        }
      }

      // 8. IMMERSIVE HUD, CYBERPUNK SCANNER, PARTICLES & HOLOGRAMS
      if (showHud) {
        const prox = tState.proximity;

        // 8A. Reactive Proximity Particles (Binary + Pixel Dinos for SIS, Golden Sparks for DER)
        const speedMultiplier = 0.7 + prox * 2.2;
        tState.particles.forEach((p) => {
          p.y += p.vy * speedMultiplier;
          p.x += p.vx * speedMultiplier;
          if (p.y < -0.05) {
            p.y = 1.05;
            p.x = Math.random();
          }
          if (p.x < 0) p.x = 1;
          if (p.x > 1) p.x = 0;

          const px = p.x * W;
          const py = p.y * H;

          if (mode === 'SIS') {
            if (p.type === 'DINO') {
              drawPixelDino(
                ctx,
                px,
                py,
                2.2 + prox * 1.1,
                p.color,
                clamp(p.alpha * (0.5 + prox * 0.6), 0.2, 0.95)
              );
            } else {
              ctx.save();
              ctx.font = `700 ${Math.round(p.size + prox * 5)}px "Orbitron", monospace`;
              ctx.fillStyle = p.color;
              ctx.globalAlpha = clamp(p.alpha * (0.45 + prox * 0.55), 0.15, 0.9);
              ctx.shadowColor = '#FF6B00';
              ctx.shadowBlur = 8 * prox;
              ctx.fillText(p.type, px, py);
              ctx.restore();
            }
          } else {
            // Golden/Orange Law & XR Ambient Particles
            ctx.save();
            const rad = (p.size * 0.22 + 1.5) * (0.8 + prox * 0.6);
            const g = ctx.createRadialGradient(px, py, 0.5, px, py, rad * 2.5);
            g.addColorStop(0, '#FFD700');
            g.addColorStop(0.5, '#FF6B00');
            g.addColorStop(1, 'rgba(255, 107, 0, 0)');
            ctx.fillStyle = g;
            ctx.globalAlpha = clamp(p.alpha * (0.5 + prox * 0.5), 0.2, 0.95);
            ctx.beginPath();
            ctx.arc(px, py, rad * 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });

        // 8B. Biometric Cyberpunk Silhouette Scanner (1.5s burst on detection/switch + subtle active HUD)
        if (tState.hasBody) {
          const elapsedScan = now - tState.scanStartTime;
          const isInitialScan = elapsedScan < 1550;
          const scanProgress = isInitialScan
            ? (elapsedScan % 1550) / 1550
            : ((now * 0.00035) % 1);

          const boxLeft = tState.shoulderCenterX - tState.shoulderWidth * 0.95;
          const boxRight = tState.shoulderCenterX + tState.shoulderWidth * 0.95;
          const boxTop =
            (tState.hasFace ? tState.eyeCenterY : tState.shoulderCenterY - tState.shoulderWidth * 0.7) -
            tState.shoulderWidth * 0.45;
          const boxBottom = tState.shoulderCenterY + tState.torsoHeight * 1.15;
          const boxW = boxRight - boxLeft;
          const boxH = boxBottom - boxTop;

          ctx.save();
          // Corner HUD brackets around person
          const cornerLen = Math.min(36, boxW * 0.15);
          ctx.strokeStyle = isInitialScan ? '#FF6B00' : 'rgba(255, 107, 0, 0.55)';
          ctx.lineWidth = isInitialScan ? 3 : 1.8;
          ctx.shadowColor = '#FF6B00';
          ctx.shadowBlur = isInitialScan ? 16 : 6;

          ctx.beginPath();
          // Top-Left
          ctx.moveTo(boxLeft, boxTop + cornerLen);
          ctx.lineTo(boxLeft, boxTop);
          ctx.lineTo(boxLeft + cornerLen, boxTop);
          // Top-Right
          ctx.moveTo(boxRight - cornerLen, boxTop);
          ctx.lineTo(boxRight, boxTop);
          ctx.lineTo(boxRight, boxTop + cornerLen);
          // Bottom-Left
          ctx.moveTo(boxLeft, boxBottom - cornerLen);
          ctx.lineTo(boxLeft, boxBottom);
          ctx.lineTo(boxLeft + cornerLen, boxBottom);
          // Bottom-Right
          ctx.moveTo(boxRight - cornerLen, boxBottom);
          ctx.lineTo(boxRight, boxBottom);
          ctx.lineTo(boxRight, boxBottom - cornerLen);
          ctx.stroke();

          // Horizontal Laser Scan Line during initial 1.5s detection
          if (isInitialScan) {
            const scanY = boxTop + scanProgress * boxH;
            const scanGrad = ctx.createLinearGradient(boxLeft, scanY - 25, boxLeft, scanY + 6);
            scanGrad.addColorStop(0, 'rgba(255, 107, 0, 0)');
            scanGrad.addColorStop(0.85, 'rgba(255, 107, 0, 0.35)');
            scanGrad.addColorStop(1, 'rgba(255, 190, 90, 0.95)');
            ctx.fillStyle = scanGrad;
            ctx.fillRect(boxLeft, scanY - 25, boxW, 31);

            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(boxLeft, scanY);
            ctx.lineTo(boxRight, scanY);
            ctx.stroke();
          }
          ctx.restore();

          // 8C. Floating Terminal Profile Card next to Shoulder
          const activeMode = AR_MODES.find((m) => m.id === mode) || AR_MODES[0];
          const cardW = Math.min(340, Math.max(255, W * 0.26));
          const cardH = 104;
          // Position card to the right of person's shoulder (or clamp inside screen)
          const rawCardX = tState.shoulderCenterX + tState.shoulderWidth * 0.78;
          const cardX = clamp(rawCardX, 20, W - cardW - 20);
          const cardY = clamp(
            tState.shoulderCenterY - tState.shoulderWidth * 0.55,
            88,
            H - cardH - 140
          );

          ctx.save();
          // Connecting target line from shoulder to card
          ctx.strokeStyle = '#FF6B00';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(
            tState.shoulderCenterX + tState.shoulderWidth * 0.42,
            tState.shoulderCenterY - tState.shoulderWidth * 0.12,
            4,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = '#FF6B00';
          ctx.fill();
          ctx.moveTo(
            tState.shoulderCenterX + tState.shoulderWidth * 0.42,
            tState.shoulderCenterY - tState.shoulderWidth * 0.12
          );
          ctx.lineTo(cardX, cardY + 24);
          ctx.stroke();

          // Glassmorphic Dark Card Body
          ctx.fillStyle = 'rgba(10, 10, 10, 0.84)';
          ctx.strokeStyle = '#FF6B00';
          ctx.lineWidth = 1.8;
          ctx.shadowColor = 'rgba(255, 107, 0, 0.45)';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.roundRect(cardX, cardY, cardW, cardH, 12);
          ctx.fill();
          ctx.stroke();

          // Top Accent Bar
          ctx.fillStyle = '#FF6B00';
          ctx.beginPath();
          ctx.roundRect(cardX, cardY, cardW, 24, [12, 12, 0, 0]);
          ctx.fill();

          ctx.fillStyle = '#0A0A0A';
          ctx.font = '800 10px "Orbitron", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(
            `UNIFRANZ BIOMETRIC HUD // ${activeMode.badge}`,
            cardX + 12,
            cardY + 16
          );

          // Animated Typewriter Terminal Text
          const typeChars = Math.floor((now - tState.scanStartTime) / 18);
          const line1 = activeMode.profileTitle.slice(0, Math.max(12, typeChars));
          const line2 = activeMode.profileMode.slice(
            0,
            Math.max(0, typeChars - activeMode.profileTitle.length)
          );

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 12.5px "Space Grotesk", sans-serif';
          ctx.fillText(line1, cardX + 12, cardY + 48);

          ctx.fillStyle = '#FFB347';
          ctx.font = '600 12px "Space Grotesk", sans-serif';
          ctx.fillText(line2 || activeMode.profileMode, cardX + 12, cardY + 69);

          // Proximity & Confidence Telemetry Bar
          ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.font = '500 10px "Orbitron", monospace';
          ctx.fillText(
            `SYNC: ${Math.round(88 + prox * 11)}%  |  PROX: ${Math.round(prox * 100)}%`,
            cardX + 12,
            cardY + 90
          );

          // Small pixel dino or scale badge on card corner
          if (mode === 'SIS') {
            drawPixelDino(ctx, cardX + cardW - 26, cardY + 66, 2.2, '#FF6B00', 0.95);
          }
          ctx.restore();
        }
      }

      // 9. HAND GESTURE RECOGNITION & HOLOGRAPHIC SCALES IN PALM
      if (handResults?.landmarks?.length > 0) {
        handResults.landmarks.forEach((handLm, idx) => {
          const gesture = analyzeHandGesture(handLm);
          const palmX = toScreenX(handLm[9].x);
          const palmY = toScreenY(handLm[9].y);

          // Draw subtle cyber hand joints when HUD is enabled
          if (showHud) {
            ctx.save();
            ctx.fillStyle = '#FF6B00';
            [0, 4, 8, 12, 16, 20].forEach((ptIdx) => {
              const hx = toScreenX(handLm[ptIdx].x);
              const hy = toScreenY(handLm[ptIdx].y);
              ctx.beginPath();
              ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
              ctx.fill();
            });
            ctx.restore();
          }

          // If wearing POLERA-DER (Derecho) and raising a hand, float Holographic Scales over palm
          if (mode === 'DER' && gesture !== null) {
            drawHolographicScales(ctx, palmX, palmY - 75, 52, now);
          }

          // Gesture 1: Open Hand (5 fingers) -> Switch AR Career Mode with orange energy waves
          if (gesture === 'OPEN_PALM') {
            tState.openHandHoldFrames++;
            if (
              tState.openHandHoldFrames >= 10 &&
              now - tState.lastModeSwitchTime > 2200
            ) {
              tState.lastModeSwitchTime = now;
              tState.openHandHoldFrames = 0;
              cycleArMode({ x: palmX / W, y: palmY / H }, true);
            }
          } else if (gesture === 'PEACE') {
            // Gesture 2: Peace & Love (✌️) -> Start 3s Souvenir Photo Countdown
            tState.peaceOrSmileHoldFrames++;
            if (
              tState.peaceOrSmileHoldFrames >= 8 &&
              now - tState.lastPhotoTriggerTime > 5500 &&
              !stateRef.current.countdownActive
            ) {
              tState.lastPhotoTriggerTime = now;
              tState.peaceOrSmileHoldFrames = 0;
              startPhotoCountdown('✌️ GESTO AMOR Y PAZ: FOTO EN 3... 2... 1...');
            }
          } else {
            tState.openHandHoldFrames = Math.max(0, tState.openHandHoldFrames - 1);
          }
        });
      } else {
        tState.openHandHoldFrames = 0;
      }

      // 10. SMILE DETECTION TRIGGER FOR PHOTO COUNTDOWN
      if (faceLandmarks && detectSmileFromFace(faceLandmarks, faceBlendshapes)) {
        tState.peaceOrSmileHoldFrames++;
        if (
          tState.peaceOrSmileHoldFrames >= 16 &&
          now - tState.lastPhotoTriggerTime > 6000 &&
          !stateRef.current.countdownActive
        ) {
          tState.lastPhotoTriggerTime = now;
          tState.peaceOrSmileHoldFrames = 0;
          startPhotoCountdown('😄 ¡SONRISA UNIFRANZ DETECTADA! CAPTURANDO...');
        }
      }

      // 11. Render Energy Shockwaves (Triggered when switching modes)
      for (let i = tState.shockwaves.length - 1; i >= 0; i--) {
        const sw = tState.shockwaves[i];
        sw.radius += 24;
        sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);

        ctx.save();
        ctx.strokeStyle = `rgba(255, 107, 0, ${sw.alpha})`;
        ctx.lineWidth = 6 * sw.alpha + 1;
        ctx.shadowColor = '#FF6B00';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(sw.x * W, sw.y * H, sw.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner secondary wave ring
        if (sw.radius > 45) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${sw.alpha * 0.65})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sw.x * W, sw.y * H, sw.radius * 0.72, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

        if (sw.alpha <= 0.02) {
          tState.shockwaves.splice(i, 1);
        }
      }

      // 12. Dark Vignette & Reactive Proximity Aura Border
      const vigGrad = ctx.createRadialGradient(
        W * 0.5,
        H * 0.5,
        Math.min(W, H) * 0.36,
        W * 0.5,
        H * 0.5,
        Math.max(W, H) * 0.75
      );
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(0.75, 'rgba(5, 5, 5, 0.32)');
      vigGrad.addColorStop(1, 'rgba(10, 10, 10, 0.78)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, W, H);
    };

    rafRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isReady, cycleArMode, startPhotoCountdown]);

  const activeCareerObj =
    AR_MODES.find((m) => m.id === selectedCareer) || AR_MODES[0];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0A0A0A] select-none">
      {/* Hidden synchronized video element */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="hidden"
      />

      {/* Initial Loading Screen */}
      {!isReady && (
        <LoadingScreen
          progress={loadingProgress}
          statusText={loadingStatus}
          error={cameraError}
          onRetry={() => initExperience(false)}
          onStartDemo={() => initExperience(true)}
        />
      )}

      {/* Main 60 FPS AR Mirror Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block z-0"
      />

      {/* Reactive Proximity Neon Screen Border */}
      <div
        className="pointer-events-none fixed inset-0 z-10 transition-all duration-200"
        style={{
          boxShadow: `inset 0 0 ${Math.round(25 + proximityLevel * 75)}px rgba(255, 107, 0, ${(
            0.18 +
            proximityLevel * 0.52
          ).toFixed(2)}), inset 0 0 ${Math.round(8 + proximityLevel * 20)}px rgba(255, 85, 0, ${(
            0.35 +
            proximityLevel * 0.5
          ).toFixed(2)})`,
          border: `${Math.round(2 + proximityLevel * 3)}px solid rgba(255, 107, 0, ${(
            0.35 +
            proximityLevel * 0.6
          ).toFixed(2)})`,
        }}
      />

      {/* White / Orange Camera Flash Overlay */}
      {flashActive && (
        <div className="fixed inset-0 z-40 bg-white animate-ping pointer-events-none" />
      )}

      {/* Top Institutional Header Bar */}
      <header className="fixed top-0 inset-x-0 z-20 p-4 md:px-8 md:py-5 flex items-center justify-between pointer-events-none">
        {/* Official UNIFRANZ Logo Card */}
        <div className="pointer-events-auto glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-3.5 shadow-neon-orange">
          <UnifranzLogo className="h-9 md:h-11" />
          <div className="hidden sm:flex flex-col border-l border-white/15 pl-3.5">
            <span className="font-display font-bold text-[11px] text-[#FF6B00] tracking-widest uppercase">
              AR MIRROR TOTEM
            </span>
            <span className="font-tech text-[11px] text-white/70">
              {activeCareerObj.fullName}
            </span>
          </div>
        </div>

        {/* Center Gesture Notification Banner */}
        {gestureBanner && (
          <div className="hidden lg:flex items-center gap-2.5 px-5 py-2.5 rounded-full glass-panel-bright text-[#FF6B00] font-display font-bold text-xs tracking-wider uppercase animate-bounce shadow-neon-strong">
            <Sparkles className="w-4 h-4" />
            <span>{gestureBanner}</span>
          </div>
        )}

        {/* Right Telemetry & Gesture Hints Pill */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-3 glass-panel px-4 py-2.5 rounded-2xl text-xs font-tech">
            <div className="flex items-center gap-1.5 text-white/80" title="Levanta 5 dedos para cambiar carrera">
              <Hand className="w-4 h-4 text-[#FF6B00]" />
              <span>Mano Abierta: Cambiar Polera</span>
            </div>
            <div className="h-4 w-[1px] bg-white/15" />
            <div className="flex items-center gap-1.5 text-white/80" title="Gesto Amor y Paz o Sonrisa para Foto">
              <Smile className="w-4 h-4 text-[#FF6B00]" />
              <span>✌️ / Sonrisa: Capturar Foto</span>
            </div>
          </div>

          {/* Live Biometric Status Pill */}
          <div className="glass-panel px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5 text-xs font-tech">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                personDetected
                  ? 'bg-[#FF6B00] shadow-[0_0_10px_#FF6B00] animate-ping'
                  : 'bg-white/40'
              }`}
            />
            <span className="font-display font-bold text-[11px] tracking-wider text-white">
              {fpsCount} FPS
            </span>
          </div>
        </div>
      </header>

      {/* Holographic 3... 2... 1... Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center pointer-events-none bg-black/35 backdrop-blur-[2px]">
          <div className="relative flex items-center justify-center w-48 h-48 md:w-64 md:h-64 rounded-full glass-panel-bright border-4 border-[#FF6B00] shadow-neon-strong">
            <span className="font-display font-black text-7xl md:text-9xl text-white drop-shadow-[0_0_30px_#FF6B00]">
              {countdown}
            </span>
          </div>
          <p className="mt-5 font-display font-bold text-sm md:text-base tracking-[0.25em] uppercase text-[#FF6B00] bg-black/80 px-5 py-2 rounded-full border border-[#FF6B00]/50">
            ¡SONRÍE PARA TU RECUERDO UNIFRANZ!
          </p>
        </div>
      )}

      {/* Bottom Floating Glassmorphism Control Dock */}
      <footer className="fixed bottom-0 inset-x-0 z-20 p-4 md:p-6 flex flex-col items-center pointer-events-none">
        <div className="pointer-events-auto max-w-5xl w-full glass-panel rounded-3xl p-3 md:px-6 md:py-4 shadow-neon-orange flex flex-col lg:flex-row items-center justify-between gap-3.5">
          {/* Left Group: Career Quick Selector */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => {
                setSelectedCareer('SIS');
                trackingRef.current.scanStartTime = performance.now();
                triggerEnergyShockwave(0.5, 0.5, '💻 INGENIERÍA DE SISTEMAS ACTIVO');
              }}
              className={`px-4 py-2.5 rounded-2xl font-display font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition-all ${
                selectedCareer === 'SIS'
                  ? 'bg-[#FF6B00] text-black shadow-neon-orange scale-[1.02]'
                  : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>💻 Ing. de Sistemas</span>
            </button>

            <button
              onClick={() => {
                setSelectedCareer('DER');
                trackingRef.current.scanStartTime = performance.now();
                triggerEnergyShockwave(0.5, 0.5, '⚖️ DERECHO & LIDERAZGO ACTIVO');
              }}
              className={`px-4 py-2.5 rounded-2xl font-display font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition-all ${
                selectedCareer === 'DER'
                  ? 'bg-[#FF6B00] text-black shadow-neon-orange scale-[1.02]'
                  : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>⚖️ Derecho</span>
            </button>
          </div>

          {/* Center Hero Capture CTA Button */}
          <button
            onClick={() => startPhotoCountdown('📸 CAPTURANDO MOMENTO UNIFRANZ...')}
            disabled={countdown !== null}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B00] via-[#FF5500] to-[#FF6B00] hover:from-[#FF7A1A] hover:to-[#FF5500] text-black font-display font-black text-xs md:text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 animate-pulse-glow transition transform active:scale-95 disabled:opacity-50"
          >
            <Camera className="w-5 h-5 stroke-[2.5]" />
            <span>📸 CAPTURAR MOMENTO UNIFRANZ</span>
          </button>

          {/* Right Group: VR Visor & Cyberpunk HUD Toggles */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setVrEnabled((prev) => !prev)}
              className={`px-3.5 py-2.5 rounded-2xl font-display font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition-all border ${
                vrEnabled
                  ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.35)]'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
              title="Activar/Desactivar Lentes VR Futuristas"
            >
              <Glasses className="w-4 h-4" />
              <span>🥽 Lentes VR</span>
            </button>

            <button
              onClick={() => setHudEnabled((prev) => !prev)}
              className={`px-3.5 py-2.5 rounded-2xl font-display font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition-all border ${
                hudEnabled
                  ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.35)]'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
              title="Activar/Desactivar Escáner y Efectos HUD"
            >
              <Sparkles className="w-4 h-4" />
              <span>✨ Efectos HUD</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Commemorative Souvenir Photo + QR Code Modal */}
      <PhotoModal
        photoData={capturedPhoto}
        onClose={() => setCapturedPhoto(null)}
      />
    </div>
  );
}
