import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FilesetResolver,
  PoseLandmarker,
  FaceLandmarker,
  HandLandmarker,
  ImageSegmenter,
} from '@mediapipe/tasks-vision';
import {
  lerp,
  lerpAngle,
  clamp,
  FUTURE_ROLES,
  drawPixelDino,
  drawWalkingShoulderDino,
  computePalmCenterAndTilt,
  drawNeuralBinarySphere,
  drawDigitalFusionCore,
  drawHolographicScales,
  drawLegalTechShield,
  drawMetaverseTronGrid,
  drawSynergyConnectionBeam,
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
  RefreshCw,
  Users,
  Zap,
} from 'lucide-react';

const AR_MODES = [
  {
    id: 'SIS',
    shortName: 'Ing. de Sistemas',
    fullName: 'Ingeniería de Sistemas e Innovación Digital',
    profileTitle: 'PERFIL: Futuro Ingeniero de Sistemas',
    profileMode: 'Modo: Innovación Digital & IA',
    badge: 'NUEVA MALLA 2026 // SIS',
  },
  {
    id: 'DER',
    shortName: 'Derecho',
    fullName: 'Derecho, Justicia & Liderazgo Global',
    profileTitle: 'PERFIL: Futuro Abogado UNIFRANZ',
    profileMode: 'Modo: Justicia & LegalTech',
    badge: 'NUEVA MALLA 2026 // DER',
  },
  {
    id: 'VR_ONLY',
    shortName: 'Metaverso VR',
    fullName: 'Inmersión Metaverso & Realidad Extendida',
    profileTitle: 'PERFIL: Explorador XR UNIFRANZ',
    profileMode: 'Modo: Cyberspace & Visión Futura',
    badge: 'UNIFRANZ METAVERSE',
  },
];

const createPersonSlot = (defaultX = 640, roleIdx = 0) => ({
  active: false,
  lostFrames: 0,
  scanStartTime: 0,
  rouletteStartTime: 0,
  roleIndex: roleIdx,
  shoulderCenterX: defaultX,
  shoulderCenterY: 360,
  hipCenterX: defaultX,
  hipCenterY: 610,
  shoulderWidth: 210,
  torsoHeight: 260,
  shoulderAngle: 0,
  hasFace: false,
  faceLostFrames: 0,
  eyeCenterX: defaultX,
  eyeCenterY: 200,
  eyeDistance: 72,
  headRoll: 0,
  headYaw: 0,
  headPitch: 0,
});

export default function App() {
  // Primary Career & Second Person (Synergy Mode) Career
  const [selectedCareer, setSelectedCareer] = useState('SIS'); // 'SIS' | 'DER' | 'VR_ONLY'
  const [secondPersonCareer, setSecondPersonCareer] = useState('SAME'); // 'SAME' | 'SIS' | 'DER'
  const [vrEnabled, setVrEnabled] = useState(true);
  const [hudEnabled, setHudEnabled] = useState(true);
  const [simTwoPersons, setSimTwoPersons] = useState(false);

  // Loading & Error States
  const [loadingProgress, setLoadingProgress] = useState(10);
  const [loadingStatus, setLoadingStatus] = useState('Inicializando motor neuronal MediaPipe...');
  const [cameraError, setCameraError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);

  // Interactive HUD Feedback States
  const [proximityLevel, setProximityLevel] = useState(0.25);
  const [detectedCount, setDetectedCount] = useState(0);
  const [gestureBanner, setGestureBanner] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [flashActive, setFlashActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [fpsCount, setFpsCount] = useState(60);

  // Refs for 60 FPS loop
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const fgCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);

  // Mirror state ref for inside requestAnimationFrame
  const stateRef = useRef({
    selectedCareer: 'SIS',
    secondPersonCareer: 'SAME',
    vrEnabled: true,
    hudEnabled: true,
    isSimulationMode: false,
    simTwoPersons: false,
    countdownActive: false,
  });

  useEffect(() => {
    stateRef.current.selectedCareer = selectedCareer;
    stateRef.current.secondPersonCareer = secondPersonCareer;
    stateRef.current.vrEnabled = vrEnabled;
    stateRef.current.hudEnabled = hudEnabled;
    stateRef.current.isSimulationMode = isSimulationMode;
    stateRef.current.simTwoPersons = simTwoPersons;
    stateRef.current.countdownActive = countdown !== null;
  }, [
    selectedCareer,
    secondPersonCareer,
    vrEnabled,
    hudEnabled,
    isSimulationMode,
    simTwoPersons,
    countdown,
  ]);

  // MediaPipe Landmarkers & ImageSegmenter Ref
  const landmarkersRef = useRef({
    pose: null,
    face: null,
    hand: null,
    segmenter: null,
  });

  // Preloaded Image Assets Ref
  const assetsRef = useRef({
    shirtSis: null,
    shirtDer: null,
    vrHeadset: null,
    logoImg: null,
  });

  // Multi-Person & Particle Tracking State Ref
  const trackingRef = useRef({
    persons: [createPersonSlot(480, 0), createPersonSlot(860, 1)],
    proximity: 0.25,
    lastModeSwitchTime: 0,
    lastPhotoTriggerTime: 0,
    openHandHoldFrames: 0,
    peaceOrSmileHoldFrames: 0,
    shockwaves: [],
    particles: [],
    burstParticles: [],
  });

  // Initialize ambient floating particles
  useEffect(() => {
    const pts = [];
    for (let i = 0; i < 44; i++) {
      pts.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0012,
        vy: -0.0012 - Math.random() * 0.0022,
        size: 10 + Math.random() * 12,
        type: i % 6 === 0 ? 'DINO' : i % 3 === 0 ? 'AI' : i % 2 === 0 ? '0' : '1',
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

  // Initialize Camera and MediaPipe Models (Pose x2, Face x2, Hand x4, ImageSegmenter)
  const initExperience = useCallback(
    async (useSimulation = false) => {
      setCameraError(null);
      setLoadingProgress(15);
      setLoadingStatus('Cargando prendas Nueva Malla 2026 y visor VR...');
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
            'No se detectó una cámara disponible o el permiso fue denegado. Puedes reintentar o activar el Modo Simulación Holográfica (soporta 1 o 2 personas en Modo Sinergia).'
          );
          return;
        }
      } else {
        setIsSimulationMode(true);
      }

      setLoadingProgress(60);
      setLoadingStatus('Cargando MediaPipe Multi-Pose, Face, Hand & ImageSegmenter...');

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
            numPoses: 2,
          }),
          FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numFaces: 2,
            outputFaceBlendshapes: true,
          }),
          HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 4,
          }),
        ]);

        // Load ImageSegmenter for UNIFRANZ Metaverse VR Cyberspace effect
        let imageSegmenter = null;
        try {
          imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            outputCategoryMask: false,
            outputConfidenceMasks: true,
          });
        } catch (segErr) {
          console.warn('Selfie Segmenter fallback:', segErr);
        }

        landmarkersRef.current = {
          pose: poseLandmarker,
          face: faceLandmarker,
          hand: handLandmarker,
          segmenter: imageSegmenter,
        };
      } catch (visionErr) {
        console.warn('MediaPipe initialization warning:', visionErr);
      }

      setLoadingProgress(100);
      setLoadingStatus('¡Espejo AR UNIFRANZ • Nueva Malla 2026 Listo!');
      setTimeout(() => setIsReady(true), 350);
    },
    [preloadAssets]
  );

  useEffect(() => {
    initExperience(false);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, [initExperience]);

  // Spawn an orange energy shockwave
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

  // Re-spin the Holographic Career Role Roulette ("🔄 Nuevo Perfil")
  const spinRoleRoulette = useCallback(() => {
    const now = performance.now();
    trackingRef.current.persons.forEach((p, idx) => {
      p.rouletteStartTime = now;
      p.scanStartTime = now;
      p.roleIndex = (p.roleIndex + 1 + Math.floor(Math.random() * 3)) % 4;
    });
    triggerEnergyShockwave(0.5, 0.35, '🎰 RULETA HOLOGRÁFICA: ESCANEANDO ROL DEL FUTURO...');
  }, [triggerEnergyShockwave]);

  // Cycle between SIS -> DER -> VR_ONLY
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
      const now = performance.now();
      trackingRef.current.persons.forEach((p) => {
        p.scanStartTime = now;
        p.rouletteStartTime = now;
      });

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

  // Capture High-Resolution Commemorative Photo with UNIFRANZ Launch Frame (includes all AR layers & hand holograms)
  const captureCommemorativePhoto = useCallback(() => {
    const mainCanvas = canvasRef.current;
    if (!mainCanvas) return;

    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 380);

    const outCanvas = document.createElement('canvas');
    const W = 1280;
    const H = 960;
    outCanvas.width = W;
    outCanvas.height = H;
    const ctx = outCanvas.getContext('2d');

    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, W, H);

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

    // Top-left Launch Badge
    ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
    ctx.fillRect(36, 36, 330, 44);
    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 36, 330, 44);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 14px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LANZAMIENTO NUEVA MALLA 2026', 201, 63);

    // Top-right Event Tag
    ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
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

    ctx.fillStyle = '#FF6B00';
    ctx.fillRect(20, footerY, W - 40, 4);

    if (assetsRef.current.logoImg) {
      ctx.drawImage(assetsRef.current.logoImg, 44, footerY + 24, 260, 62);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 36px "Orbitron", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('UNIFRANZ', 46, footerY + 68);
    }

    const activeMode =
      AR_MODES.find((m) => m.id === stateRef.current.selectedCareer) || AR_MODES[0];
    const p0 = trackingRef.current.persons[0];
    const assignedRole =
      (FUTURE_ROLES[stateRef.current.selectedCareer] || FUTURE_ROLES.SIS)[p0.roleIndex % 4];
    const nowStr = new Date().toLocaleDateString('es-BO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    ctx.textAlign = 'right';
    ctx.fillStyle = '#FF6B00';
    ctx.font = '800 20px "Orbitron", sans-serif';
    ctx.fillText(activeMode.fullName.toUpperCase(), W - 48, footerY + 46);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 15px "Space Grotesk", sans-serif';
    ctx.fillText(`ROL DEL FUTURO: ${assignedRole.toUpperCase()}`, W - 48, footerY + 72);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.font = '600 13px "Space Grotesk", sans-serif';
    ctx.fillText(
      `UNIFRANZ AR MIRROR  •  ${nowStr}  •  #InnovaciónUnifranz`,
      W - 48,
      footerY + 98
    );

    const framedDataUrl = outCanvas.toDataURL('image/png', 0.94);
    const qrUrl = `${window.location.origin}/?souvenir=UNIFRANZ-AR&carrera=${encodeURIComponent(
      activeMode.shortName
    )}&rol=${encodeURIComponent(assignedRole)}&fecha=${encodeURIComponent(
      nowStr
    )}&tag=InnovacionUnifranz`;

    setCapturedPhoto({
      framedDataUrl,
      careerLabel: `${activeMode.shortName} • ${assignedRole}`,
      timestamp: nowStr,
      sharePayload: qrUrl,
    });
  }, []);

  // Trigger 3... 2... 1... Holographic Countdown
  const startPhotoCountdown = useCallback(
    (reasonText = '📸 INICIANDO CAPTURA SOUVENIR') => {
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

  // Main 60 FPS Render & Multi-Person Computer Vision Loop
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

      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;
      const tState = trackingRef.current;
      const {
        selectedCareer: primaryMode,
        secondPersonCareer: p2CareerSetting,
        vrEnabled: showVr,
        hudEnabled: showHud,
        isSimulationMode: sim,
        simTwoPersons: sim2P,
      } = stateRef.current;

      ctx.clearRect(0, 0, W, H);

      // Compute mirrored video viewport transform
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
      }

      const toScreenX = (normX) => drawX + (1 - normX) * drawW;
      const toScreenY = (normY) => drawY + normY * drawH;

      // 1. Execute MediaPipe Vision Tasks (Multi-Pose, Multi-Face, Multi-Hand, ImageSegmenter)
      let rawPoses = [];
      let rawFaces = [];
      let faceBlendshapes = [];
      let handResults = null;
      let segMaskApplied = false;

      if (!sim && video && video.readyState >= 2) {
        const ts = performance.now();
        const isNewFrame = video.currentTime !== lastVideoTime;
        if (isNewFrame) {
          lastVideoTime = video.currentTime;
        }

        try {
          if (landmarkersRef.current.pose) {
            const pRes = landmarkersRef.current.pose.detectForVideo(video, ts);
            if (pRes?.landmarks) rawPoses = pRes.landmarks;
          }
          if (landmarkersRef.current.face) {
            const fRes = landmarkersRef.current.face.detectForVideo(video, ts);
            if (fRes?.faceLandmarks) {
              rawFaces = fRes.faceLandmarks;
              faceBlendshapes = fRes.faceBlendshapes || [];
            }
          }
          if (landmarkersRef.current.hand) {
            handResults = landmarkersRef.current.hand.detectForVideo(video, ts);
          }
        } catch (e) {
          // Continue smoothly
        }

        // 2. Render Background & Person Segmentation ("Metaverso UNIFRANZ" when VR Glasses are enabled)
        if (showVr && landmarkersRef.current.segmenter) {
          try {
            const segResult = landmarkersRef.current.segmenter.segmentForVideo(video, ts);
            if (segResult?.confidenceMasks?.length > 0) {
              const mask = segResult.confidenceMasks[0];
              const mW = mask.width;
              const mH = mask.height;
              const maskFloat = mask.getAsFloat32Array();

              // Draw Tron / Cyberspace perspective grid on main canvas
              drawMetaverseTronGrid(ctx, W, H, now);

              // Prepare offscreen mask & foreground canvases (downscaled for 60 FPS speed)
              if (!maskCanvasRef.current) {
                maskCanvasRef.current = document.createElement('canvas');
                fgCanvasRef.current = document.createElement('canvas');
              }
              const mCanvas = maskCanvasRef.current;
              const fCanvas = fgCanvasRef.current;
              if (mCanvas.width !== mW || mCanvas.height !== mH) {
                mCanvas.width = mW;
                mCanvas.height = mH;
                fCanvas.width = mW;
                fCanvas.height = mH;
              }

              const mCtx = mCanvas.getContext('2d');
              const imgData = mCtx.createImageData(mW, mH);
              const d = imgData.data;
              for (let i = 0; i < maskFloat.length; i++) {
                const conf = maskFloat[i];
                const idx = i * 4;
                d[idx] = 255;
                d[idx + 1] = 255;
                d[idx + 2] = 255;
                // Smooth person edge feathering
                d[idx + 3] = conf > 0.35 ? Math.min(255, Math.floor(((conf - 0.25) / 0.45) * 255)) : 0;
              }
              mCtx.putImageData(imgData, 0, 0);

              const fCtx = fCanvas.getContext('2d');
              fCtx.clearRect(0, 0, mW, mH);
              fCtx.drawImage(video, 0, 0, mW, mH);
              fCtx.globalCompositeOperation = 'destination-in';
              fCtx.drawImage(mCanvas, 0, 0, mW, mH);
              fCtx.globalCompositeOperation = 'source-over';

              // Draw sharp segmented person mirrored over the Tron cyberspace background
              ctx.save();
              ctx.translate(W, 0);
              ctx.scale(-1, 1);
              ctx.shadowColor = '#FF6B00';
              ctx.shadowBlur = 18;
              ctx.drawImage(fCanvas, W - drawX - drawW, drawY, drawW, drawH);
              ctx.restore();

              mask.close();
              segMaskApplied = true;
            }
          } catch (segErr) {
            // Fallback if mask read fails
          }
        }

        if (!segMaskApplied) {
          // Standard mirrored video feed (plus optional cyberspace grid overlay if VR enabled without segmenter)
          ctx.save();
          ctx.translate(W, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, W - drawX - drawW, drawY, drawW, drawH);
          ctx.restore();

          if (showVr) {
            ctx.save();
            ctx.globalAlpha = 0.28;
            drawMetaverseTronGrid(ctx, W, H, now);
            ctx.restore();
          }
        }
      } else {
        // Simulation Mode Backdrop (Tron Cyberspace when VR active, Dark Studio otherwise)
        if (showVr) {
          drawMetaverseTronGrid(ctx, W, H, now);
        } else {
          const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.45, 50, W * 0.5, H * 0.5, W * 0.8);
          bgGrad.addColorStop(0, '#1C140D');
          bgGrad.addColorStop(0.55, '#0E0E0E');
          bgGrad.addColorStop(1, '#050505');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, W, H);
        }

        // Generate synthetic landmarks for 1 or 2 simulated people + interactive hands
        const breath = Math.sin(now * 0.0025) * 0.008;
        const sway = Math.sin(now * 0.0014) * 0.014;
        const centers = sim2P ? [0.68, 0.32] : [0.5];

        rawPoses = centers.map((cx, idx) => {
          const p = [];
          const s = sway * (idx === 0 ? 1 : -1);
          p[11] = { x: cx + 0.11 + s, y: 0.43 + breath, z: 0 };
          p[12] = { x: cx - 0.11 + s, y: 0.43 - breath * 0.5, z: 0 };
          p[23] = { x: cx + 0.08 + s, y: 0.77 + breath, z: 0 };
          p[24] = { x: cx - 0.08 + s, y: 0.77 + breath, z: 0 };
          return p;
        });

        rawFaces = centers.map((cx, idx) => {
          const f = [];
          const s = sway * (idx === 0 ? 1 : -1);
          f[33] = { x: cx + 0.042 + s, y: 0.25 + breath, z: 0 };
          f[263] = { x: cx - 0.042 + s, y: 0.25 - breath * 0.4, z: 0 };
          f[1] = { x: cx + s, y: 0.28 + breath, z: 0 };
          return f;
        });

        // Simulated raised hands so hand holograms are visible in Simulation Mode too
        const handOsc = Math.sin(now * 0.002) * 0.05;
        const c0 = centers[0];
        const makeSimHand = (hx, hy) => {
          const arr = Array.from({ length: 21 }, () => ({ x: hx, y: hy, z: 0 }));
          arr[0] = { x: hx, y: hy + 0.06, z: 0 };
          arr[5] = { x: hx - 0.025, y: hy, z: 0 };
          arr[9] = { x: hx, y: hy - 0.01, z: 0 };
          arr[13] = { x: hx + 0.015, y: hy, z: 0 };
          arr[17] = { x: hx + 0.03, y: hy + 0.005, z: 0 };
          arr[8] = { x: hx - 0.025, y: hy - 0.07, z: 0 };
          arr[6] = { x: hx - 0.025, y: hy - 0.03, z: 0 };
          arr[12] = { x: hx, y: hy - 0.075, z: 0 };
          arr[10] = { x: hx, y: hy - 0.03, z: 0 };
          return arr;
        };
        handResults = {
          landmarks: [
            makeSimHand(c0 - 0.14 + handOsc, 0.46 + breath),
            makeSimHand(c0 + 0.14 - handOsc, 0.46 - breath),
          ],
        };
      }

      // 3. Sort & Match up to 2 Detected Persons (Left-to-Right on Mirrored Screen)
      const sortedPoses = [...rawPoses]
        .filter((lm) => lm && lm[11] && lm[12])
        .sort((a, b) => {
          const ax = toScreenX((a[11].x + a[12].x) / 2);
          const bx = toScreenX((b[11].x + b[12].x) / 2);
          return ax - bx;
        })
        .slice(0, 2);

      const sortedFaces = [...rawFaces]
        .filter((lm) => lm && lm[33] && lm[263])
        .sort((a, b) => {
          const ax = toScreenX((a[33].x + a[263].x) / 2);
          const bx = toScreenX((b[33].x + b[263].x) / 2);
          return ax - bx;
        })
        .slice(0, 2);

      const maxDetected = Math.max(sortedPoses.length, sortedFaces.length);
      let activeCount = 0;

      for (let idx = 0; idx < 2; idx++) {
        const slot = tState.persons[idx];
        const poseLm = sortedPoses[idx] || null;
        const faceLm = sortedFaces[idx] || null;

        if (poseLm || faceLm) {
          if (!slot.active) {
            slot.active = true;
            slot.scanStartTime = now;
            slot.rouletteStartTime = now;
            slot.roleIndex = (idx + Math.floor(Math.random() * 4)) % 4;
          }
          slot.lostFrames = 0;
          activeCount++;

          if (poseLm) {
            const lShoulder = poseLm[11];
            const rShoulder = poseLm[12];
            const lHip = poseLm[23] || { x: lShoulder.x, y: lShoulder.y + 0.34 };
            const rHip = poseLm[24] || { x: rShoulder.x, y: rShoulder.y + 0.34 };

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

            const dx = sx1 - sx2;
            const dy = sy1 - sy2;
            let targetAngle = Math.atan2(dy, dx);
            if (dx < 0) targetAngle += Math.PI;
            targetAngle = clamp(targetAngle, -0.55, 0.55);

            const sf = 0.25;
            slot.shoulderCenterX = lerp(slot.shoulderCenterX, targetCenterX, sf);
            slot.shoulderCenterY = lerp(slot.shoulderCenterY, targetCenterY, sf);
            slot.hipCenterX = lerp(slot.hipCenterX, targetHipX, sf);
            slot.hipCenterY = lerp(slot.hipCenterY, targetHipY, sf);
            slot.shoulderWidth = lerp(slot.shoulderWidth, targetShoulderWidth, sf);
            slot.torsoHeight = lerp(slot.torsoHeight, targetTorsoHeight, sf);
            slot.shoulderAngle = lerpAngle(slot.shoulderAngle, targetAngle, sf);
          }

          if (faceLm) {
            const leftEye = faceLm[33];
            const rightEye = faceLm[263];
            const noseTip = faceLm[1] || {
              x: (leftEye.x + rightEye.x) / 2,
              y: (leftEye.y + rightEye.y) / 2,
            };

            const ex1 = toScreenX(leftEye.x);
            const ey1 = toScreenY(leftEye.y);
            const ex2 = toScreenX(rightEye.x);
            const ey2 = toScreenY(rightEye.y);
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

            const targetYaw = clamp((nx - targetEyeCenterX) / (targetEyeDist * 0.7), -0.8, 0.8);
            const targetPitch = clamp(
              (ny - targetEyeCenterY) / (targetEyeDist * 0.9) - 0.35,
              -0.5,
              0.5
            );

            slot.hasFace = true;
            slot.faceLostFrames = 0;
            const ff = 0.32;
            slot.eyeCenterX = lerp(slot.eyeCenterX, targetEyeCenterX, ff);
            slot.eyeCenterY = lerp(slot.eyeCenterY, targetEyeCenterY, ff);
            slot.eyeDistance = lerp(slot.eyeDistance, targetEyeDist, ff);
            slot.headRoll = lerpAngle(slot.headRoll, targetRoll, ff);
            slot.headYaw = lerp(slot.headYaw, targetYaw, ff);
            slot.headPitch = lerp(slot.headPitch, targetPitch, ff);

            if (!poseLm) {
              slot.shoulderCenterX = lerp(slot.shoulderCenterX, slot.eyeCenterX, 0.22);
              slot.shoulderCenterY = lerp(
                slot.shoulderCenterY,
                slot.eyeCenterY + slot.eyeDistance * 2.25,
                0.22
              );
              slot.shoulderWidth = lerp(slot.shoulderWidth, slot.eyeDistance * 3.1, 0.22);
              slot.torsoHeight = lerp(slot.torsoHeight, slot.eyeDistance * 4.2, 0.22);
              slot.shoulderAngle = lerpAngle(slot.shoulderAngle, slot.headRoll * 0.5, 0.22);
            }
          } else {
            slot.faceLostFrames++;
            if (slot.faceLostFrames > 18) slot.hasFace = false;
          }
        } else {
          slot.lostFrames++;
          if (slot.lostFrames > 22) {
            slot.active = false;
            slot.hasFace = false;
          } else if (slot.active) {
            activeCount++;
          }
        }
      }

      if (frameCounter % 10 === 0) {
        setDetectedCount(activeCount);
      }

      // Update reactive proximity from largest detected shoulder width
      if (activeCount > 0) {
        const maxSW = Math.max(
          ...tState.persons.filter((p) => p.active).map((p) => p.shoulderWidth)
        );
        const rawProx = clamp((maxSW / W - 0.13) / 0.28, 0.15, 1.0);
        tState.proximity = lerp(tState.proximity, rawProx, 0.1);
        if (frameCounter % 10 === 0) {
          setProximityLevel(Number(tState.proximity.toFixed(2)));
        }
      }

      // Helper to get effective career mode for person index (0 or 1)
      const getCareerForPerson = (idx) => {
        if (idx === 0) return primaryMode;
        if (p2CareerSetting === 'SAME') return primaryMode;
        return p2CareerSetting;
      };

      // 4. Render Per-Person Virtual Try-On Poleras, Walking Pixel Dino, VR Headset & Role Roulette HUD
      tState.persons.forEach((person, idx) => {
        if (!person.active) return;
        const personMode = getCareerForPerson(idx);

        // 4A. Virtual Try-On Polera (SIS or DER)
        if (personMode !== 'VR_ONLY') {
          const shirtImg =
            personMode === 'SIS' ? assetsRef.current.shirtSis : assetsRef.current.shirtDer;
          if (shirtImg) {
            ctx.save();
            ctx.translate(person.shoulderCenterX, person.shoulderCenterY);
            ctx.rotate(person.shoulderAngle);

            const shirtW = person.shoulderWidth * 2.02;
            const naturalRatio =
              (shirtImg.naturalHeight || 800) / (shirtImg.naturalWidth || 800);
            const shirtH = Math.max(shirtW * naturalRatio, person.torsoHeight * 1.48);
            const collarOffsetY = -shirtH * 0.165;

            ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
            ctx.shadowBlur = 18;
            ctx.drawImage(shirtImg, -shirtW / 2, collarOffsetY, shirtW, shirtH);
            ctx.restore();
          }
        }

        // 4B. Pixelated Companion Dino walking on Left Shoulder when wearing POLERA-SIS
        if (personMode === 'SIS') {
          drawWalkingShoulderDino(
            ctx,
            person.shoulderCenterX,
            person.shoulderCenterY,
            person.shoulderWidth,
            person.shoulderAngle,
            now + idx * 900
          );
        }

        // 4C. Futuristic VR Headset on Face
        if (showVr && (person.hasFace || person.active)) {
          const vrCanvas = assetsRef.current.vrHeadset;
          if (vrCanvas) {
            const vx = person.hasFace ? person.eyeCenterX : person.shoulderCenterX;
            const vy = person.hasFace
              ? person.eyeCenterY
              : person.shoulderCenterY - person.shoulderWidth * 0.72;
            const eDist = person.hasFace ? person.eyeDistance : person.shoulderWidth * 0.32;

            ctx.save();
            ctx.translate(
              vx + person.headYaw * eDist * 0.22,
              vy + person.headPitch * eDist * 0.18
            );
            ctx.rotate(person.headRoll);

            const vrW = eDist * 3.05;
            const vrH = vrW;
            const yawScaleX = 1 - Math.abs(person.headYaw) * 0.12;
            ctx.scale(yawScaleX, 1);

            ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
            ctx.shadowBlur = 22;
            ctx.drawImage(vrCanvas, -vrW / 2, -vrH * 0.56, vrW, vrH);
            ctx.restore();
          }
        }

        // 4D. Cyberpunk Biometric Silhouette Scanner & Holographic Role Roulette HUD Card
        if (showHud) {
          const elapsedScan = now - person.scanStartTime;
          const isInitialScan = elapsedScan < 1550;
          const scanProgress = isInitialScan
            ? (elapsedScan % 1550) / 1550
            : (now * 0.00035) % 1;

          const boxLeft = person.shoulderCenterX - person.shoulderWidth * 0.92;
          const boxRight = person.shoulderCenterX + person.shoulderWidth * 0.92;
          const boxTop =
            (person.hasFace
              ? person.eyeCenterY
              : person.shoulderCenterY - person.shoulderWidth * 0.7) -
            person.shoulderWidth * 0.44;
          const boxBottom = person.shoulderCenterY + person.torsoHeight * 1.15;
          const boxW = boxRight - boxLeft;
          const boxH = boxBottom - boxTop;

          ctx.save();
          const cornerLen = Math.min(34, boxW * 0.15);
          ctx.strokeStyle = isInitialScan ? '#FF6B00' : 'rgba(255, 107, 0, 0.5)';
          ctx.lineWidth = isInitialScan ? 3 : 1.8;
          ctx.shadowColor = '#FF6B00';
          ctx.shadowBlur = isInitialScan ? 16 : 6;

          ctx.beginPath();
          ctx.moveTo(boxLeft, boxTop + cornerLen);
          ctx.lineTo(boxLeft, boxTop);
          ctx.lineTo(boxLeft + cornerLen, boxTop);
          ctx.moveTo(boxRight - cornerLen, boxTop);
          ctx.lineTo(boxRight, boxTop);
          ctx.lineTo(boxRight, boxTop + cornerLen);
          ctx.moveTo(boxLeft, boxBottom - cornerLen);
          ctx.lineTo(boxLeft, boxBottom);
          ctx.lineTo(boxLeft + cornerLen, boxBottom);
          ctx.moveTo(boxRight - cornerLen, boxBottom);
          ctx.lineTo(boxRight, boxBottom);
          ctx.lineTo(boxRight, boxBottom - cornerLen);
          ctx.stroke();

          if (isInitialScan) {
            const scanY = boxTop + scanProgress * boxH;
            const scanGrad = ctx.createLinearGradient(boxLeft, scanY - 25, boxLeft, scanY + 6);
            scanGrad.addColorStop(0, 'rgba(255, 107, 0, 0)');
            scanGrad.addColorStop(0.85, 'rgba(255, 107, 0, 0.35)');
            scanGrad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
            ctx.fillStyle = scanGrad;
            ctx.fillRect(boxLeft, scanY - 25, boxW, 31);
          }
          ctx.restore();

          // Holographic Role Roulette Floating Terminal Card next to shoulder
          const modeObj = AR_MODES.find((m) => m.id === personMode) || AR_MODES[0];
          const rolesList = FUTURE_ROLES[personMode] || FUTURE_ROLES.SIS;
          const elapsedRoulette = now - person.rouletteStartTime;
          const isSpinningRoulette = elapsedRoulette < 1500;
          const currentRoleText = isSpinningRoulette
            ? rolesList[Math.floor(elapsedRoulette / 95) % rolesList.length]
            : rolesList[person.roleIndex % rolesList.length];

          const cardW = Math.min(350, Math.max(265, W * 0.25));
          const cardH = 114;
          const rawCardX =
            idx === 0 && activeCount > 1
              ? person.shoulderCenterX - person.shoulderWidth * 0.78 - cardW
              : person.shoulderCenterX + person.shoulderWidth * 0.75;
          const cardX = clamp(rawCardX, 18, W - cardW - 18);
          const cardY = clamp(
            person.shoulderCenterY - person.shoulderWidth * 0.58,
            88,
            H - cardH - 140
          );

          ctx.save();
          ctx.fillStyle = 'rgba(10, 10, 10, 0.88)';
          ctx.strokeStyle = '#FF6B00';
          ctx.lineWidth = 1.8;
          ctx.shadowColor = 'rgba(255, 107, 0, 0.5)';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.roundRect(cardX, cardY, cardW, cardH, 12);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#FF6B00';
          ctx.beginPath();
          ctx.roundRect(cardX, cardY, cardW, 24, [12, 12, 0, 0]);
          ctx.fill();

          ctx.fillStyle = '#0A0A0A';
          ctx.font = '800 10px "Orbitron", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(
            `${modeObj.badge} ${activeCount > 1 ? `// ESTUDIANTE #${idx + 1}` : ''}`,
            cardX + 12,
            cardY + 16
          );

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 12px "Space Grotesk", sans-serif';
          ctx.fillText(modeObj.profileTitle, cardX + 12, cardY + 46);

          // Slot / Terminal Role Box
          ctx.fillStyle = isSpinningRoulette
            ? 'rgba(255, 107, 0, 0.28)'
            : 'rgba(255, 107, 0, 0.14)';
          ctx.strokeStyle = isSpinningRoulette ? '#FFFFFF' : 'rgba(255, 107, 0, 0.65)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.roundRect(cardX + 10, cardY + 55, cardW - 20, 32, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isSpinningRoulette ? '#FFFFFF' : '#FF6B00';
          ctx.font = '800 11.5px "Orbitron", sans-serif';
          ctx.fillText(
            isSpinningRoulette ? `🎰 ${currentRoleText.toUpperCase()}` : `★ ${currentRoleText}`,
            cardX + 18,
            cardY + 75
          );

          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.font = '600 10px "Orbitron", monospace';
          ctx.fillText(
            isSpinningRoulette
              ? 'ESCANEANDO PERFIL DE NUEVA MALLA...'
              : 'ROL DEL FUTURO ASIGNADO • NUEVA MALLA',
            cardX + 12,
            cardY + 103
          );
          ctx.restore();
        }
      });

      // 5. MULTI-PERSON SYNERGY BEAM ("SINERGIA UNIFRANZ • NUEVA MALLA 2026")
      if (tState.persons[0].active && tState.persons[1].active) {
        const p1 = tState.persons[0];
        const p2 = tState.persons[1];
        const distBetween = Math.hypot(
          p2.shoulderCenterX - p1.shoulderCenterX,
          p2.shoulderCenterY - p1.shoulderCenterY
        );
        if (distBetween < W * 0.78) {
          drawSynergyConnectionBeam(
            ctx,
            p1.shoulderCenterX,
            p1.shoulderCenterY + p1.torsoHeight * 0.15,
            p2.shoulderCenterX,
            p2.shoulderCenterY + p2.torsoHeight * 0.15,
            now
          );
        }
      }

      // 6. INTERACTIVE HAND POWERS (MediaPipe HandLandmarker: landmarks 0, 5, 9, 13, 17)
      const personhandsMap = [[], []];

      if (handResults?.landmarks?.length > 0) {
        handResults.landmarks.forEach((handLm) => {
          const gesture = analyzeHandGesture(handLm);
          const palmInfo = computePalmCenterAndTilt(handLm, toScreenX, toScreenY);

          // Assign hand to nearest active person
          let ownerIdx = 0;
          if (tState.persons[0].active && tState.persons[1].active) {
            const d0 = Math.hypot(
              palmInfo.x - tState.persons[0].shoulderCenterX,
              palmInfo.y - tState.persons[0].shoulderCenterY
            );
            const d1 = Math.hypot(
              palmInfo.x - tState.persons[1].shoulderCenterX,
              palmInfo.y - tState.persons[1].shoulderCenterY
            );
            ownerIdx = d1 < d0 ? 1 : 0;
          } else if (tState.persons[1].active) {
            ownerIdx = 1;
          }

          const ownerPerson = tState.persons[ownerIdx];
          const isHandRaised =
            handLm[0].y < 0.85 ||
            (ownerPerson.active &&
              palmInfo.y < ownerPerson.shoulderCenterY + ownerPerson.torsoHeight * 0.75);

          if (isHandRaised) {
            personhandsMap[ownerIdx].push({
              ...palmInfo,
              gesture,
              rawWristY: handLm[0].y,
            });
          }

          // Subtle glowing cyber joints on fingers
          if (showHud) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = '#FF6B00';
            [0, 5, 9, 13, 17, 4, 8, 12, 16, 20].forEach((ptIdx) => {
              const hx = toScreenX(handLm[ptIdx].x);
              const hy = toScreenY(handLm[ptIdx].y);
              ctx.beginPath();
              ctx.arc(hx, hy, 3.2, 0, Math.PI * 2);
              ctx.fill();
            });
            ctx.restore();
          }

          // Air Gesture Controls (Open Hand 5 fingers -> Switch Polera; Peace ✌️ -> Photo Countdown)
          if (!sim && gesture === 'OPEN_PALM') {
            tState.openHandHoldFrames++;
            if (
              tState.openHandHoldFrames >= 12 &&
              now - tState.lastModeSwitchTime > 2400
            ) {
              tState.lastModeSwitchTime = now;
              tState.openHandHoldFrames = 0;
              cycleArMode({ x: palmInfo.x / W, y: palmInfo.y / H }, true);
            }
          } else if (!sim && gesture === 'PEACE') {
            tState.peaceOrSmileHoldFrames++;
            if (
              tState.peaceOrSmileHoldFrames >= 9 &&
              now - tState.lastPhotoTriggerTime > 5500 &&
              !stateRef.current.countdownActive
            ) {
              tState.lastPhotoTriggerTime = now;
              tState.peaceOrSmileHoldFrames = 0;
              startPhotoCountdown('✌️ GESTO AMOR Y PAZ: FOTO EN 3... 2... 1...');
            }
          }
        });
      }

      // Render career-specific hand powers for each person
      personhandsMap.forEach((hands, pIdx) => {
        if (hands.length === 0) return;
        const person = tState.persons[pIdx];
        const careerMode = getCareerForPerson(pIdx);

        if (careerMode === 'SIS' || careerMode === 'VR_ONLY') {
          // Check if both hands are brought together near chest -> Digital Fusion Energy Core!
          let isFused = false;
          if (hands.length >= 2) {
            const h1 = hands[0];
            const h2 = hands[1];
            const handDist = Math.hypot(h1.x - h2.x, h1.y - h2.y);
            const fuseThreshold = Math.max(150, person.shoulderWidth * 0.85);

            if (handDist < fuseThreshold) {
              isFused = true;
              const coreX = (h1.x + h2.x) / 2;
              const coreY = (h1.y + h2.y) / 2;
              drawDigitalFusionCore(ctx, coreX, coreY, Math.max(68, person.shoulderWidth * 0.36), now);

              // Shoot burst code particles ('0', '1', '{ }', 'AI') across the screen
              const tokens = ['0', '1', '{ }', 'AI', '</>', '01'];
              for (let b = 0; b < 3; b++) {
                if (tState.burstParticles.length < 110) {
                  const angle = Math.random() * Math.PI * 2;
                  const speed = 4 + Math.random() * 9;
                  tState.burstParticles.push({
                    x: coreX,
                    y: coreY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    text: tokens[Math.floor(Math.random() * tokens.length)],
                    size: 13 + Math.random() * 11,
                    alpha: 1,
                    color: Math.random() > 0.35 ? '#FF6B00' : '#FFFFFF',
                  });
                }
              }
            }
          }

          // Otherwise render rotating Neural Network / Binary Holographic Spheres on each raised palm
          if (!isFused) {
            hands.forEach((h, hIdx) => {
              drawNeuralBinarySphere(
                ctx,
                h.x,
                h.y - 24,
                Math.max(44, person.shoulderWidth * 0.24),
                now + hIdx * 500
              );
            });
          }
        } else if (careerMode === 'DER') {
          // If both hands are raised -> Deploy Hexagonal LegalTech Shield in front of torso
          if (hands.length >= 2) {
            const shieldX = (hands[0].x + hands[1].x) / 2;
            const shieldY = (hands[0].y + hands[1].y) / 2;
            drawLegalTechShield(
              ctx,
              shieldX,
              shieldY,
              Math.max(115, person.shoulderWidth * 0.62),
              now
            );
          }

          // Project Holographic Scales of Justice above raised palm, tilting dynamically with hand inclination
          hands.forEach((h) => {
            drawHolographicScales(
              ctx,
              h.x,
              h.y - 68,
              Math.max(50, person.shoulderWidth * 0.26),
              now,
              h.tiltAngle
            );
          });
        }
      });

      // 7. Render & Update Fusion Burst Code Particles ('0', '1', '{ }', 'AI')
      if (tState.burstParticles.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = tState.burstParticles.length - 1; i >= 0; i--) {
          const bp = tState.burstParticles[i];
          bp.x += bp.vx;
          bp.y += bp.vy;
          bp.alpha -= 0.018;

          if (bp.alpha <= 0.02 || bp.x < -50 || bp.x > W + 50 || bp.y < -50 || bp.y > H + 50) {
            tState.burstParticles.splice(i, 1);
            continue;
          }

          ctx.font = `900 ${Math.round(bp.size)}px "Orbitron", monospace`;
          ctx.fillStyle = bp.color;
          ctx.globalAlpha = bp.alpha;
          ctx.shadowColor = '#FF6B00';
          ctx.shadowBlur = 12;
          ctx.fillText(bp.text, bp.x, bp.y);
        }
        ctx.restore();
      }

      // 8. Ambient Proximity-Reactive Floating Particles
      if (showHud) {
        const prox = tState.proximity;
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

          if (primaryMode === 'SIS') {
            if (p.type === 'DINO') {
              drawPixelDino(
                ctx,
                px,
                py,
                2.2 + prox * 1.1,
                p.color,
                clamp(p.alpha * (0.5 + prox * 0.6), 0.2, 0.95),
                Math.floor(now / 220) % 2
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
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const rad = (p.size * 0.22 + 1.5) * (0.8 + prox * 0.6);
            const g = ctx.createRadialGradient(px, py, 0.5, px, py, rad * 2.5);
            g.addColorStop(0, '#FFFFFF');
            g.addColorStop(0.45, '#FF6B00');
            g.addColorStop(1, 'rgba(255, 107, 0, 0)');
            ctx.fillStyle = g;
            ctx.globalAlpha = clamp(p.alpha * (0.5 + prox * 0.5), 0.2, 0.95);
            ctx.beginPath();
            ctx.arc(px, py, rad * 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });
      }

      // 9. Smile Detection Trigger for Photo Countdown
      if (!sim && sortedFaces.length > 0 && detectSmileFromFace(sortedFaces[0], faceBlendshapes, 0)) {
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

      // 10. Render Orange Energy Shockwaves
      for (let i = tState.shockwaves.length - 1; i >= 0; i--) {
        const sw = tState.shockwaves[i];
        sw.radius += 26;
        sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255, 107, 0, ${sw.alpha})`;
        ctx.lineWidth = 6 * sw.alpha + 1;
        ctx.shadowColor = '#FF6B00';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(sw.x * W, sw.y * H, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        if (sw.alpha <= 0.02) {
          tState.shockwaves.splice(i, 1);
        }
      }

      // 11. Subtle Dark Edge Vignette
      const vigGrad = ctx.createRadialGradient(
        W * 0.5,
        H * 0.5,
        Math.min(W, H) * 0.36,
        W * 0.5,
        H * 0.5,
        Math.max(W, H) * 0.75
      );
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(0.75, 'rgba(5, 5, 5, 0.3)');
      vigGrad.addColorStop(1, 'rgba(10, 10, 10, 0.76)');
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
      <video ref={videoRef} playsInline muted className="hidden" />

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
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

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

      {flashActive && (
        <div className="fixed inset-0 z-40 bg-white animate-ping pointer-events-none" />
      )}

      {/* Top Institutional Header Bar */}
      <header className="fixed top-0 inset-x-0 z-20 p-4 md:px-7 md:py-4 flex items-center justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-3.5 shadow-neon-orange">
          <UnifranzLogo className="h-9 md:h-10" />
          <div className="hidden sm:flex flex-col border-l border-white/15 pl-3.5">
            <span className="font-display font-bold text-[10px] text-[#FF6B00] tracking-widest uppercase">
              INAUGURACIÓN NUEVA MALLA 2026
            </span>
            <span className="font-tech text-xs text-white/85 font-semibold">
              {activeCareerObj.fullName}
            </span>
          </div>
        </div>

        {gestureBanner && (
          <div className="hidden xl:flex items-center gap-2.5 px-5 py-2.5 rounded-full glass-panel-bright text-[#FF6B00] font-display font-bold text-xs tracking-wider uppercase animate-bounce shadow-neon-strong">
            <Sparkles className="w-4 h-4" />
            <span>{gestureBanner}</span>
          </div>
        )}

        {/* Right Actions: Spin Role Roulette + Synergy Controls + FPS */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={spinRoleRoulette}
            className="glass-panel hover:bg-[#FF6B00] hover:text-black text-white px-3.5 py-2.5 rounded-2xl font-display font-bold text-[11px] tracking-wider uppercase flex items-center gap-1.5 transition shadow-neon-orange"
            title="Girar Ruleta de Rol Profesional del Futuro"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#FF6B00] group-hover:text-black" />
            <span>🔄 Nuevo Perfil</span>
          </button>

          {/* Second Person Career Selector / Simulation Synergy Toggle */}
          {(detectedCount > 1 || isSimulationMode) && (
            <button
              onClick={() => {
                if (isSimulationMode && !simTwoPersons) {
                  setSimTwoPersons(true);
                  triggerEnergyShockwave(0.5, 0.5, '⚡ MODO SINERGIA 2 PERSONAS ACTIVADO');
                } else {
                  setSecondPersonCareer((prev) =>
                    prev === 'SAME' ? 'DER' : prev === 'DER' ? 'SIS' : 'SAME'
                  );
                }
              }}
              className="glass-panel px-3.5 py-2.5 rounded-2xl font-display font-bold text-[11px] tracking-wider uppercase flex items-center gap-1.5 text-[#FF6B00] border border-[#FF6B00]/60 hover:bg-[#FF6B00]/20 transition"
              title="Configurar Polera del Estudiante #2 en Modo Sinergia"
            >
              <Users className="w-3.5 h-3.5" />
              <span>
                {isSimulationMode && !simTwoPersons
                  ? '+ Simular 2 Personas'
                  : `P2: ${
                      secondPersonCareer === 'SAME'
                        ? 'Misma Polera'
                        : secondPersonCareer === 'SIS'
                        ? 'Sistemas'
                        : 'Derecho'
                    }`}
              </span>
            </button>
          )}

          <div className="glass-panel px-3.5 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-tech">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                detectedCount > 0
                  ? 'bg-[#FF6B00] shadow-[0_0_10px_#FF6B00] animate-ping'
                  : 'bg-white/40'
              }`}
            />
            <span className="font-display font-bold text-[11px] tracking-wider text-white">
              {detectedCount > 1 ? '2P SINERGIA' : `${fpsCount} FPS`}
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
            ¡POSA CON TUS PODERES HOLOGRÁFICOS UNIFRANZ!
          </p>
        </div>
      )}

      {/* Bottom Floating Glassmorphism Control Dock */}
      <footer className="fixed bottom-0 inset-x-0 z-20 p-4 md:p-5 flex flex-col items-center pointer-events-none">
        <div className="pointer-events-auto max-w-5xl w-full glass-panel rounded-3xl p-3 md:px-6 md:py-3.5 shadow-neon-orange flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Left Group: Career Quick Selector */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => {
                setSelectedCareer('SIS');
                const now = performance.now();
                trackingRef.current.persons.forEach((p) => {
                  p.scanStartTime = now;
                  p.rouletteStartTime = now;
                });
                triggerEnergyShockwave(
                  0.5,
                  0.5,
                  '💻 ING. DE SISTEMAS: ESFERAS IA & DINO PIXEL ACTIVOS'
                );
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
                const now = performance.now();
                trackingRef.current.persons.forEach((p) => {
                  p.scanStartTime = now;
                  p.rouletteStartTime = now;
                });
                triggerEnergyShockwave(
                  0.5,
                  0.5,
                  '⚖️ DERECHO: BALANZA HOLOGRÁFICA & ESCUDO LEGALTECH'
                );
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

          {/* Right Group: VR Metaverse & Cyberpunk HUD Toggles */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => {
                setVrEnabled((prev) => {
                  const next = !prev;
                  triggerEnergyShockwave(
                    0.5,
                    0.5,
                    next
                      ? '🥽 METAVERSO UNIFRANZ & LENTES VR ACTIVADOS'
                      : 'LENTES VR DESACTIVADOS'
                  );
                  return next;
                });
              }}
              className={`px-3.5 py-2.5 rounded-2xl font-display font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition-all border ${
                vrEnabled
                  ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.35)]'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
              title="Activar/Desactivar Lentes VR y Fondo Metaverso Tron"
            >
              <Glasses className="w-4 h-4" />
              <span>🥽 Lentes VR + Metaverso</span>
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
              <span>✨ HUD</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Commemorative Souvenir Photo + QR Code Modal */}
      <PhotoModal photoData={capturedPhoto} onClose={() => setCapturedPhoto(null)} />
    </div>
  );
}
