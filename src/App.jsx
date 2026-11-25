import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FilesetResolver,
  PoseLandmarker,
  FaceLandmarker,
  HandLandmarker,
  ImageSegmenter,
} from '@mediapipe/tasks-vision';
import {
  AR_CONFIG,
  ACCESSORY_MODES,
  SISTEMAS_CAREER,
  ASSETS_PATHS,
  SIS_QUIZ_QUESTIONS,
} from './config';
import {
  lerp,
  clamp,
  drawPixelDino,
  drawProceduralWhiteOculusQuest,
  drawUnifranzHolographicCrown,
  drawHackerHudVisor,
  drawProceduralDualSenseController,
  drawHolographicKeyboard,
  drawSistemasOrbitalIcons,
  drawNeuralBinarySphere,
  drawCybersecurityHandShield,
  drawDigitalFusionCore,
  drawHeadTiltQuizHUD,
  drawQuizResultEffects,
  drawMetaverseTronGrid,
  drawSynergyConnectionBeam,
  detectSmileFromFace,
} from './utils/arHelpers';
import {
  extractValidPoses,
  extractValidFaces,
  pairFacesToBodies,
  updateTrackedPersons,
  updateTrackedHands,
  stepTrackedHandsFade,
} from './utils/personTracker';
import LoadingScreen from './components/LoadingScreen';
import PhotoModal from './components/PhotoModal';
import UnifranzLogo from './components/UnifranzLogo';
import {
  Camera,
  Code2,
  Glasses,
  Sparkles,
  RefreshCw,
  Users,
  Layers,
  Crown,
  Terminal,
  Gamepad2,
  Keyboard,
  Zap,
} from 'lucide-react';

export default function App() {
  // === 100% Ingeniería de Sistemas e Innovación Digital (Cero PNGs de poleras o lentes) ===
  // Índice de Modo de Accesorio: 0 = Visor Oculus Blanco, 1 = Corona UNIFRANZ, 2 = Ambos, 3 = Modo Hacker HUD
  const [accessoryModeIdx, setAccessoryModeIdx] = useState(0);
  const [hudEnabled, setHudEnabled] = useState(true);
  const [manualKeyboard, setManualKeyboard] = useState(false);
  const [fondoMetaverso, setFondoMetaverso] = useState(false);
  const [simTwoPersons, setSimTwoPersons] = useState(false);
  const [simHandMode, setSimHandMode] = useState('POWERS'); // 'POWERS' | 'GAMING' | 'KEYBOARD' | 'FUSION'

  // === Minijuego Interactivo: "¿Qué Mención de Sistemas eres?" (IA vs. Ciberseguridad) ===
  const [quizUiState, setQuizUiState] = useState({
    active: false,
    winner: null, // null | 'IA' | 'CIBERSEGURIDAD'
  });

  // Estados de carga y modal
  const [loadingProgress, setLoadingProgress] = useState(10);
  const [loadingStatus, setLoadingStatus] = useState(
    'Inicializando motor neuronal MediaPipe GPU...'
  );
  const [cameraError, setCameraError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);

  // Feedback de interfaz
  const [gestureBanner, setGestureBanner] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [flashActive, setFlashActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);

  // Refs de DOM y Canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const fpsSpanRef = useRef(null);
  const peopleSpanRef = useRef(null);

  // Canvases offscreen reutilizables (detección <= 640x480 y segmentación suavizada)
  const detectCanvasRef = useRef(null);
  const fgCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const smoothMaskCanvasRef = useRef(null);
  const hasSegCacheRef = useRef(false);

  // Espejo del estado en Ref para lectura instantánea dentro de requestAnimationFrame
  const stateRef = useRef({
    accessoryModeIdx: 0,
    hudEnabled: true,
    manualKeyboard: false,
    fondoMetaverso: false,
    isSimulationMode: false,
    simTwoPersons: false,
    simHandMode: 'POWERS',
    countdownActive: false,
  });

  useEffect(() => {
    stateRef.current.accessoryModeIdx = accessoryModeIdx;
    stateRef.current.hudEnabled = hudEnabled;
    stateRef.current.manualKeyboard = manualKeyboard;
    stateRef.current.fondoMetaverso = fondoMetaverso;
    stateRef.current.isSimulationMode = isSimulationMode;
    stateRef.current.simTwoPersons = simTwoPersons;
    stateRef.current.simHandMode = simHandMode;
    stateRef.current.countdownActive = countdown !== null;
  }, [
    accessoryModeIdx,
    hudEnabled,
    manualKeyboard,
    fondoMetaverso,
    isSimulationMode,
    simTwoPersons,
    simHandMode,
    countdown,
  ]);

  // Estado del Minijuego en Ref para actualización a 60 FPS
  const quizRef = useRef({
    active: false,
    questionIdx: 0,
    tiltSide: null, // 'LEFT' | 'RIGHT' | null
    holdMs: 0,
    lastFrameTs: 0,
    aiVotes: 0,
    cyberVotes: 0,
    winner: null, // null | 'IA' | 'CIBERSEGURIDAD'
    simTiltOverride: 0,
  });

  // Modelos MediaPipe
  const landmarkersRef = useRef({
    pose: null,
    face: null,
    hand: null,
    segmenter: null,
  });

  // Solo se precarga el logo oficial de UNIFRANZ (los lentes, mandos, corona y teclado son 100% código)
  const assetsRef = useRef({
    logoImg: null,
  });

  // Estado de seguimiento multi-persona, manos, partículas y temporizador Tron de 4s
  const trackingRef = useRef({
    trackedPersons: [],
    trackedHands: [],
    proximity: 0.25,
    tronFusionUntilTs: 0, // Marca de tiempo hasta la cual la Matriz Tron de 4s permanece activa
    lastFusionTriggerTs: 0,
    lastAccessorySwitchTs: 0,
    peaceHoldFrames: 0,
    lastPhotoTriggerTime: 0,
    smileHoldFrames: 0,
    shockwaves: [],
    particles: [],
    burstParticles: [],
  });

  // Inicializar partículas ambientales de Sistemas
  useEffect(() => {
    const pts = [];
    const tokens = ['0', '1', 'AI', '{ }', '</>', 'DINO'];
    for (let i = 0; i < 26; i++) {
      pts.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.001,
        vy: -0.001 - Math.random() * 0.0018,
        size: 10 + Math.random() * 8,
        type: tokens[i % tokens.length],
        alpha: 0.25 + Math.random() * 0.55,
        color: Math.random() > 0.35 ? '#FF6B00' : '#FFFFFF',
      });
    }
    trackingRef.current.particles = pts;
  }, []);

  // Soporte de flechas Izquierda/Derecha para responder el test en Modo Simulación
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!quizRef.current.active) return;
      if (e.key === 'ArrowLeft') quizRef.current.simTiltOverride = -0.28;
      if (e.key === 'ArrowRight') quizRef.current.simTiltOverride = 0.28;
    };
    const onKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        quizRef.current.simTiltOverride = 0;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Precargar logo oficial UNIFRANZ
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

    assetsRef.current.logoImg = await loadImg(ASSETS_PATHS.logoPng, ASSETS_PATHS.logoSvg);
  }, []);

  // Inicializar cámara y modelos MediaPipe GPU
  const initExperience = useCallback(
    async (useSimulation = false) => {
      setCameraError(null);
      setLoadingProgress(15);
      setLoadingStatus('Inicializando motores vectoriales Oculus Quest, DualSense & IA...');
      await preloadAssets();

      setLoadingProgress(35);
      setLoadingStatus('Solicitando acceso a cámara...');

      if (!useSimulation) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
              frameRate: { ideal: 30 },
            },
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
        } catch (err) {
          setCameraError(
            'No se detectó una cámara disponible o el permiso fue denegado. Puedes reintentar o activar el Modo Simulación Holográfica.'
          );
          return;
        }
      } else {
        setIsSimulationMode(true);
      }

      setLoadingProgress(60);
      setLoadingStatus('Cargando MediaPipe Pose, Face, Hand & ImageSegmenter (GPU)...');

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
            numPoses: AR_CONFIG.MAX_PERSONS,
            minPoseDetectionConfidence: AR_CONFIG.VISIBILITY_THRESHOLD,
            minPosePresenceConfidence: AR_CONFIG.VISIBILITY_THRESHOLD,
            minTrackingConfidence: AR_CONFIG.VISIBILITY_THRESHOLD,
          }),
          FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numFaces: AR_CONFIG.MAX_PERSONS,
            minFaceDetectionConfidence: AR_CONFIG.FACE_DETECTION_CONFIDENCE,
            minFacePresenceConfidence: AR_CONFIG.FACE_PRESENCE_CONFIDENCE,
            minTrackingConfidence: AR_CONFIG.FACE_TRACKING_CONFIDENCE,
            outputFaceBlendshapes: true,
          }),
          HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: AR_CONFIG.MAX_HANDS,
          }),
        ]);

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
          console.warn('ImageSegmenter opcional no disponible:', segErr);
        }

        landmarkersRef.current = {
          pose: poseLandmarker,
          face: faceLandmarker,
          hand: handLandmarker,
          segmenter: imageSegmenter,
        };
      } catch (visionErr) {
        console.warn('Error inicializando MediaPipe:', visionErr);
      }

      setLoadingProgress(100);
      setLoadingStatus('¡Espejo AR Ingeniería de Sistemas • Nueva Malla 2026 Listo!');
      setTimeout(() => setIsReady(true), 250);
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

  const showBanner = useCallback((label) => {
    if (!label) return;
    setGestureBanner(label);
    setTimeout(() => setGestureBanner(null), 2400);
  }, []);

  const triggerEnergyShockwave = useCallback(
    (normX = 0.5, normY = 0.45, label = '') => {
      trackingRef.current.shockwaves.push({
        x: normX,
        y: normY,
        radius: 12,
        maxRadius: Math.max(window.innerWidth, window.innerHeight) * 0.72,
        alpha: 0.95,
      });
      showBanner(label);
    },
    [showBanner]
  );

  // Explosión de partículas naranjas y blancas al revelar la mención ganadora o fusionar manos
  const triggerParticleExplosion = useCallback((centerX, centerY, tokensList) => {
    const tokens = tokensList || ['AI', '0', '1', '{ }', 'CLOUD', 'REACT', '★'];
    for (let i = 0; i < 42; i++) {
      const angle = (i / 42) * Math.PI * 2 + Math.random() * 0.2;
      const speed = 4 + Math.random() * 10;
      trackingRef.current.burstParticles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        text: tokens[i % tokens.length],
        size: 13 + Math.random() * 11,
        alpha: 1,
        color: i % 2 === 0 ? '#FF6B00' : '#FFFFFF',
      });
    }
  }, []);

  // Alternar entre [ Visor Oculus Blanco ] -> [ Corona UNIFRANZ ] -> [ Ambos ] -> [ Modo Hacker HUD ]
  const cycleAccessoryMode = useCallback(
    (originNorm = { x: 0.5, y: 0.35 }, fromPeaceGesture = false) => {
      setAccessoryModeIdx((prev) => {
        const nextIdx = (prev + 1) % ACCESSORY_MODES.length;
        const nextMode = ACCESSORY_MODES[nextIdx];
        triggerEnergyShockwave(
          originNorm.x,
          originNorm.y,
          fromPeaceGesture
            ? `✌️ GESTO PAZ DETECTADO: ${nextMode.label.toUpperCase()}`
            : `MODO ACCESORIO: ${nextMode.label.toUpperCase()}`
        );
        return nextIdx;
      });
    },
    [triggerEnergyShockwave]
  );

  // Girar ruleta de rol profesional de Ingeniería de Sistemas
  const spinRoleRoulette = useCallback(() => {
    const now = performance.now();
    trackingRef.current.trackedPersons.forEach((p) => {
      p.rouletteStartTime = now;
      p.scanStartTime = now;
      p.roleIndex = (p.roleIndex + 1 + Math.floor(Math.random() * 3)) % 4;
    });
    triggerEnergyShockwave(0.5, 0.35, '🎰 RULETA HOLOGRÁFICA: NUEVO ROL DE SISTEMAS ASIGNADO');
  }, [triggerEnergyShockwave]);

  // Capturar Foto Souvenir bajo el sello #NuevaMallaSistemas #Unifranz
  const captureCommemorativePhoto = useCallback(() => {
    const mainCanvas = canvasRef.current;
    if (!mainCanvas) return;

    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 320);

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

    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 5;
    ctx.strokeRect(18, 18, W - 36, H - 36);

    const quizWinner = quizRef.current.winner;
    const mentionStamp = quizWinner
      ? quizWinner === 'IA'
        ? 'MENCIÓN: INTELIGENCIA ARTIFICIAL'
        : 'MENCIÓN: CIBERSEGURIDAD'
      : 'NUEVA MALLA CURRICULAR 2026';

    // Sello Superior Izquierdo (Resultado del Test AR o Nueva Malla Curricular)
    ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
    ctx.fillRect(36, 36, 400, 46);
    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 2.2;
    ctx.strokeRect(36, 36, 400, 46);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 14px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🏆 ${mentionStamp}`, 236, 64);

    // Sello Superior Derecho (#NuevaMallaSistemas #Unifranz)
    ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
    ctx.fillRect(W - 385, 36, 345, 46);
    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 2.2;
    ctx.strokeRect(W - 385, 36, 345, 46);
    ctx.fillStyle = '#FF6B00';
    ctx.font = '800 14.5px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('#NuevaMallaSistemas #Unifranz', W - 212, 65);

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

    const firstPerson = trackingRef.current.trackedPersons[0];
    const roleIdx = firstPerson ? firstPerson.roleIndex % SISTEMAS_CAREER.roles.length : 0;
    const assignedRole =
      quizWinner === 'IA'
        ? 'Mención: Inteligencia Artificial'
        : quizWinner === 'CIBERSEGURIDAD'
        ? 'Mención: Ciberseguridad'
        : SISTEMAS_CAREER.roles[roleIdx];

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
    ctx.fillText(SISTEMAS_CAREER.fullName.toUpperCase(), W - 48, footerY + 46);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 15px "Space Grotesk", sans-serif';
    ctx.fillText(
      quizWinner
        ? `${assignedRole.toUpperCase()} • LÍDER DEL FUTURO`
        : `ROL DEL FUTURO: ${assignedRole.toUpperCase()}`,
      W - 48,
      footerY + 72
    );

    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.font = '600 13px "Space Grotesk", sans-serif';
    ctx.fillText(
      `UNIFRANZ AR MIRROR  •  ${nowStr}  •  #NuevaMallaSistemas #Unifranz`,
      W - 48,
      footerY + 98
    );

    const framedDataUrl = outCanvas.toDataURL('image/png', 0.92);
    const qrUrl = `${window.location.origin}/?souvenir=UNIFRANZ-SIS&mencion=${encodeURIComponent(
      assignedRole
    )}&fecha=${encodeURIComponent(nowStr)}&tag=NuevaMallaSistemas`;

    setCapturedPhoto({
      framedDataUrl,
      careerShort: SISTEMAS_CAREER.shortName,
      careerLabel: `${SISTEMAS_CAREER.shortName} • ${assignedRole}`,
      timestamp: nowStr,
      sharePayload: qrUrl,
    });
  }, []);

  // Temporizador 3... 2... 1...
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
      }, 900);
    },
    [captureCommemorativePhoto]
  );

  // Iniciar el Minijuego Interactivo "¿Qué Mención de Sistemas eres?" (IA vs. Ciberseguridad)
  const startSistemasQuiz = useCallback(() => {
    quizRef.current = {
      active: true,
      questionIdx: 0,
      tiltSide: null,
      holdMs: 0,
      lastFrameTs: performance.now(),
      aiVotes: 0,
      cyberVotes: 0,
      winner: null,
      simTiltOverride: 0,
    };
    setQuizUiState({ active: true, winner: null });
    triggerEnergyShockwave(
      0.5,
      0.32,
      '🎮 TEST AR INICIADO: INCLINA TU CABEZA A IZQUIERDA (IA) O DERECHA (CIBERSEGURIDAD)'
    );
  }, [triggerEnergyShockwave]);

  // Bucle único de renderizado y visión artificial (60 FPS en Canvas 2D)
  useEffect(() => {
    if (!isReady) return;

    let lastFpsUpdate = performance.now();
    let frameCounter = 0;
    let lastVideoTime = -1;
    let detectTick = 0;
    let lastDetectTs = 0;

    const renderLoop = (now) => {
      rafRef.current = requestAnimationFrame(renderLoop);

      frameCounter++;
      const fpsElapsed = now - lastFpsUpdate;
      if (fpsElapsed >= 500) {
        const realFps = Math.round((frameCounter * 1000) / fpsElapsed);
        if (fpsSpanRef.current) {
          fpsSpanRef.current.textContent = `${realFps} FPS`;
        }
        if (peopleSpanRef.current) {
          peopleSpanRef.current.textContent = `${trackingRef.current.trackedPersons.length}`;
        }
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
        accessoryModeIdx: accIdx,
        hudEnabled: showHud,
        manualKeyboard: forceKeyboard,
        fondoMetaverso: manualTronBg,
        isSimulationMode: sim,
        simTwoPersons: sim2P,
        simHandMode: sHandMode,
      } = stateRef.current;

      const currentAccessory = ACCESSORY_MODES[accIdx] || ACCESSORY_MODES[0];
      // La Matriz Tron está activa si el usuario la activó manualmente o durante los 4 segundos posteriores a la Fusión de Manos
      const isTronMatrixActive = manualTronBg || now < tState.tronFusionUntilTs;

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

      // === 1. DETECCIÓN A BAJA RESOLUCIÓN (<= 640x480) EN CUADROS ALTERNOS ===
      if (!sim && video && video.readyState >= 2) {
        const isNewVideoFrame = video.currentTime !== lastVideoTime;

        if (isNewVideoFrame) {
          lastVideoTime = video.currentTime;
          detectTick++;

          if (!detectCanvasRef.current) {
            detectCanvasRef.current = document.createElement('canvas');
          }
          const dCanvas = detectCanvasRef.current;
          const vW = video.videoWidth || 640;
          const vH = video.videoHeight || 480;
          const scale = Math.min(
            AR_CONFIG.DETECTION_MAX_WIDTH / vW,
            AR_CONFIG.DETECTION_MAX_HEIGHT / vH,
            1
          );
          const detW = Math.max(160, Math.round(vW * scale));
          const detH = Math.max(120, Math.round(vH * scale));
          if (dCanvas.width !== detW || dCanvas.height !== detH) {
            dCanvas.width = detW;
            dCanvas.height = detH;
          }
          const dCtx = dCanvas.getContext('2d', { willReadFrequently: false });
          dCtx.drawImage(video, 0, 0, detW, detH);

          const ts = Math.max(lastDetectTs + 1, Math.round(now));
          lastDetectTs = ts;

          const runPoseFace = detectTick % AR_CONFIG.DETECTION_STRIDE_FRAMES === 0;
          const runHands = !runPoseFace;

          if (runPoseFace) {
            let rawPoses = [];
            let rawFaces = [];
            let faceBlendshapes = [];

            try {
              if (landmarkersRef.current.pose) {
                const pRes = landmarkersRef.current.pose.detectForVideo(dCanvas, ts);
                if (pRes?.landmarks) rawPoses = pRes.landmarks;
              }
              if (landmarkersRef.current.face) {
                const fRes = landmarkersRef.current.face.detectForVideo(dCanvas, ts);
                if (fRes?.faceLandmarks) {
                  rawFaces = fRes.faceLandmarks;
                  faceBlendshapes = fRes.faceBlendshapes || [];
                }
              }
            } catch (e) {
              // Continuar con el último estado suavizado
            }

            const validPoses = extractValidPoses(rawPoses, toScreenX, toScreenY);
            const validFaces = extractValidFaces(rawFaces, faceBlendshapes, toScreenX, toScreenY);
            const detections = pairFacesToBodies(validPoses, validFaces, W);
            updateTrackedPersons(tState.trackedPersons, detections, W, now);
          }

          if (runHands && landmarkersRef.current.hand) {
            try {
              const handRes = landmarkersRef.current.hand.detectForVideo(dCanvas, ts);
              updateTrackedHands(
                tState.trackedHands,
                handRes?.landmarks || [],
                tState.trackedPersons,
                toScreenX,
                toScreenY,
                W,
                now
              );
            } catch (e) {
              // Continuar con el último estado suavizado
            }
          }

          if (runHands && isTronMatrixActive && landmarkersRef.current.segmenter) {
            try {
              const segResult = landmarkersRef.current.segmenter.segmentForVideo(dCanvas, ts);
              if (segResult?.confidenceMasks?.length > 0) {
                const mask = segResult.confidenceMasks[0];
                const mW = mask.width;
                const mH = mask.height;
                const maskFloat = mask.getAsFloat32Array();

                if (!maskCanvasRef.current) {
                  maskCanvasRef.current = document.createElement('canvas');
                  smoothMaskCanvasRef.current = document.createElement('canvas');
                  fgCanvasRef.current = document.createElement('canvas');
                }
                const mCanvas = maskCanvasRef.current;
                const smCanvas = smoothMaskCanvasRef.current;
                const fCanvas = fgCanvasRef.current;

                if (mCanvas.width !== mW || mCanvas.height !== mH) {
                  mCanvas.width = mW;
                  mCanvas.height = mH;
                  smCanvas.width = mW;
                  smCanvas.height = mH;
                  fCanvas.width = detW;
                  fCanvas.height = detH;
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
                  d[idx + 3] =
                    conf > 0.3 ? Math.min(255, Math.floor(((conf - 0.25) / 0.5) * 255)) : 0;
                }
                mCtx.putImageData(imgData, 0, 0);

                const smCtx = smCanvas.getContext('2d');
                smCtx.clearRect(0, 0, mW, mH);
                smCtx.filter = 'blur(2.5px)';
                smCtx.drawImage(mCanvas, 0, 0, mW, mH);
                smCtx.filter = 'none';

                const fCtx = fCanvas.getContext('2d');
                fCtx.clearRect(0, 0, detW, detH);
                fCtx.drawImage(dCanvas, 0, 0, detW, detH);
                fCtx.globalCompositeOperation = 'destination-in';
                fCtx.drawImage(smCanvas, 0, 0, detW, detH);
                fCtx.globalCompositeOperation = 'source-over';

                mask.close();
                hasSegCacheRef.current = true;
              }
            } catch (segErr) {
              // Ignorar error transitorio
            }
          }
        }

        stepTrackedHandsFade(tState.trackedHands, now);

        // === 2. DIBUJAR FONDO + VIDEO ESPEJO (CON MATRIZ TRON SI FUSIÓN ACTIVA) ===
        if (isTronMatrixActive && hasSegCacheRef.current && fgCanvasRef.current) {
          drawMetaverseTronGrid(ctx, W, H, now);
          ctx.save();
          ctx.translate(W, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(fgCanvasRef.current, W - drawX - drawW, drawY, drawW, drawH);
          ctx.restore();
        } else {
          ctx.save();
          ctx.translate(W, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, W - drawX - drawW, drawY, drawW, drawH);
          ctx.restore();

          if (isTronMatrixActive) {
            ctx.save();
            ctx.globalAlpha = 0.42;
            drawMetaverseTronGrid(ctx, W, H, now);
            ctx.restore();
          }
        }
      } else if (sim) {
        // === MODO SIMULACIÓN HOLOGRÁFICA ===
        if (isTronMatrixActive) {
          drawMetaverseTronGrid(ctx, W, H, now);
        } else {
          const bgGrad = ctx.createRadialGradient(
            W * 0.5,
            H * 0.45,
            50,
            W * 0.5,
            H * 0.5,
            W * 0.8
          );
          bgGrad.addColorStop(0, '#1C140D');
          bgGrad.addColorStop(0.55, '#0E0E0E');
          bgGrad.addColorStop(1, '#050505');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, W, H);
        }

        const breath = Math.sin(now * 0.0025) * 0.008;
        const sway = Math.sin(now * 0.0014) * 0.014;
        const centers = sim2P ? [0.68, 0.32] : [0.5];

        const simQuizTilt = quizRef.current.active
          ? quizRef.current.simTiltOverride !== 0
            ? quizRef.current.simTiltOverride
            : Math.sin(now * 0.0018) * 0.25
          : 0;

        const simPoses = centers.map((cx, idx) => {
          const p = [];
          const s = sway * (idx === 0 ? 1 : -1);
          p[0] = { x: cx + s, y: 0.27 + breath, z: 0, visibility: 1 };
          p[2] = { x: cx + 0.025 + s, y: 0.25 + breath - simQuizTilt * 0.08, z: 0, visibility: 1 };
          p[5] = { x: cx - 0.025 + s, y: 0.25 + breath + simQuizTilt * 0.08, z: 0, visibility: 1 };
          p[7] = { x: cx + 0.055 + s, y: 0.25 + breath - simQuizTilt * 0.1, z: 0, visibility: 1 };
          p[8] = { x: cx - 0.055 + s, y: 0.25 + breath + simQuizTilt * 0.1, z: 0, visibility: 1 };
          p[11] = { x: cx + 0.11 + s, y: 0.43 + breath, z: 0, visibility: 1 };
          p[12] = { x: cx - 0.11 + s, y: 0.43 - breath * 0.5, z: 0, visibility: 1 };
          p[23] = { x: cx + 0.08 + s, y: 0.77 + breath, z: 0, visibility: 1 };
          p[24] = { x: cx - 0.08 + s, y: 0.77 + breath, z: 0, visibility: 1 };
          return p;
        });

        const simFaces = centers.map((cx, idx) => {
          const f = [];
          const s = sway * (idx === 0 ? 1 : -1);
          f[33] = { x: cx + 0.042 + s, y: 0.25 + breath - simQuizTilt * 0.06, z: 0 };
          f[263] = { x: cx - 0.042 + s, y: 0.25 - breath * 0.4 + simQuizTilt * 0.06, z: 0 };
          f[1] = { x: cx + s, y: 0.28 + breath, z: 0 };
          f[10] = { x: cx + s - simQuizTilt * 0.03, y: 0.18 + breath, z: 0 };
          f[152] = { x: cx + s + simQuizTilt * 0.03, y: 0.36 + breath, z: 0 };
          f[127] = { x: cx + 0.065 + s, y: 0.25 + breath - simQuizTilt * 0.06, z: 0 };
          f[356] = { x: cx - 0.065 + s, y: 0.25 + breath + simQuizTilt * 0.06, z: 0 };
          return f;
        });

        const validPoses = extractValidPoses(simPoses, toScreenX, toScreenY);
        const validFaces = extractValidFaces(simFaces, [], toScreenX, toScreenY);
        const detections = pairFacesToBodies(validPoses, validFaces, W);
        updateTrackedPersons(tState.trackedPersons, detections, W, now);

        const handOsc = Math.sin(now * 0.002) * 0.035;
        const c0 = centers[0];

        const makeSimHandByMode = (hx, hy, modeType) => {
          const arr = Array.from({ length: 21 }, () => ({ x: hx, y: hy, z: 0 }));
          arr[0] = { x: hx, y: hy + 0.06, z: 0 };
          arr[5] = { x: hx - 0.025, y: hy, z: 0 };
          arr[9] = { x: hx, y: hy - 0.01, z: 0 };
          arr[13] = { x: hx + 0.015, y: hy, z: 0 };
          arr[17] = { x: hx + 0.03, y: hy + 0.005, z: 0 };

          if (modeType === 'GAMING') {
            // Puño cerrado ('FIST') para activar Mandos PlayStation DualSense
            [8, 6, 12, 10, 16, 14, 20, 18].forEach((k) => {
              arr[k] = { x: hx, y: hy + 0.02, z: 0 };
            });
          } else if (modeType === 'KEYBOARD') {
            // Dedos extendidos hacia abajo ('TYPING') para activar Teclado Holográfico
            arr[6] = { x: hx - 0.025, y: hy + 0.02, z: 0 };
            arr[8] = { x: hx - 0.025, y: hy + 0.08, z: 0 };
            arr[10] = { x: hx, y: hy + 0.02, z: 0 };
            arr[12] = { x: hx, y: hy + 0.085, z: 0 };
            arr[14] = { x: hx + 0.015, y: hy + 0.02, z: 0 };
            arr[16] = { x: hx + 0.015, y: hy + 0.08, z: 0 };
            arr[18] = { x: hx + 0.03, y: hy + 0.02, z: 0 };
            arr[20] = { x: hx + 0.03, y: hy + 0.075, z: 0 };
          } else {
            // Mano abierta hacia arriba ('OPEN_PALM') para Esfera IA y Escudo Ciberseguridad
            arr[6] = { x: hx - 0.025, y: hy - 0.03, z: 0 };
            arr[8] = { x: hx - 0.025, y: hy - 0.08, z: 0 };
            arr[10] = { x: hx, y: hy - 0.03, z: 0 };
            arr[12] = { x: hx, y: hy - 0.085, z: 0 };
            arr[14] = { x: hx + 0.015, y: hy - 0.03, z: 0 };
            arr[16] = { x: hx + 0.015, y: hy - 0.08, z: 0 };
            arr[18] = { x: hx + 0.03, y: hy - 0.03, z: 0 };
            arr[20] = { x: hx + 0.03, y: hy - 0.075, z: 0 };
          }
          return arr;
        };

        const spread = sHandMode === 'FUSION' ? 0.03 : sHandMode === 'KEYBOARD' ? 0.1 : 0.16;
        updateTrackedHands(
          tState.trackedHands,
          [
            makeSimHandByMode(c0 - spread + handOsc, 0.48 + breath, sHandMode),
            makeSimHandByMode(c0 + spread - handOsc, 0.48 - breath, sHandMode),
          ],
          tState.trackedPersons,
          toScreenX,
          toScreenY,
          W,
          now
        );
        stepTrackedHandsFade(tState.trackedHands, now);
      } else {
        ctx.fillStyle = '#0A0A0A';
        ctx.fillRect(0, 0, W, H);
      }

      const persons = tState.trackedPersons;

      if (persons.length > 0) {
        const maxSW = Math.max(...persons.map((p) => p.shoulderWidth));
        const rawProx = clamp((maxSW / W - 0.13) / 0.28, 0.15, 1.0);
        tState.proximity = lerp(tState.proximity, rawProx, 0.1);
      }

      // === 3. RENDERIZAR VISOR OCULUS QUEST BLANCO, CORONA UNIFRANZ Y ELEMENTOS ORBITALES DE SISTEMAS ===
      for (let idx = 0; idx < persons.length; idx++) {
        const person = persons[idx];

        // 3A. Elementos Orbitales de Ingeniería de Sistemas (Cubo 3D, Microchip, DualSense, Red Neuronal, { </> } y Dino Runner)
        if (showHud) {
          drawSistemasOrbitalIcons(ctx, person, W, H, now + idx * 600);
        }

        // 3B. Visor Oculus Quest Blanco Futurista (100% Procedural en Canvas 2D, sin correa superior)
        const shouldDrawOculus =
          currentAccessory.oculus || quizRef.current.winner !== null;
        if (shouldDrawOculus && person.hasVr) {
          drawProceduralWhiteOculusQuest(
            ctx,
            person.vrCenterX,
            person.vrCenterY,
            person.vrWidth,
            person.vrAngle,
            person.headYaw || 0,
            now
          );
        }

        // 3C. Modo Hacker HUD (Visor Ciber-Analítico)
        if (currentAccessory.hackerHud && person.hasVr) {
          drawHackerHudVisor(ctx, person, now);
        }

        // 3D. Corona Holográfica UNIFRANZ ("LÍDER DEL FUTURO")
        const shouldDrawCrown =
          currentAccessory.crown || quizRef.current.winner !== null;
        if (shouldDrawCrown && person.hasVr) {
          drawUnifranzHolographicCrown(
            ctx,
            person.foreheadX ?? person.vrCenterX,
            person.foreheadY ?? person.vrCenterY - person.vrWidth * 0.3,
            person.faceHeight || person.vrWidth * 0.9,
            person.templeWidth || person.vrWidth * 0.78,
            person.vrAngle,
            now
          );
        }

        // 3E. Badge Monumental y Efectos Especiales del Minijuego (IA vs Ciberseguridad)
        if (idx === 0 && quizRef.current.winner) {
          drawQuizResultEffects(ctx, person, quizRef.current.winner, W, H, now);
        }

        // 3F. Tarjeta HUD Flotante y Ruleta de Rol Profesional de Sistemas
        if (showHud && !quizRef.current.active) {
          const elapsedScan = now - person.scanStartTime;
          const isInitialScan = elapsedScan < 1400;

          const boxLeft = person.shoulderCenterX - person.shoulderWidth * 0.9;
          const boxRight = person.shoulderCenterX + person.shoulderWidth * 0.9;
          const boxTop =
            (person.hasVr
              ? person.vrCenterY
              : person.shoulderCenterY - person.shoulderWidth * 0.7) -
            person.shoulderWidth * 0.42;
          const boxBottom = person.shoulderCenterY + person.torsoHeight * 1.1;
          const boxW = boxRight - boxLeft;
          const boxH = boxBottom - boxTop;

          ctx.save();
          const cornerLen = Math.min(30, boxW * 0.15);
          ctx.strokeStyle = isInitialScan ? '#FF6B00' : 'rgba(255, 107, 0, 0.55)';
          ctx.lineWidth = isInitialScan ? 2.6 : 1.6;

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
            const scanProgress = (elapsedScan % 1400) / 1400;
            const scanY = boxTop + scanProgress * boxH;
            ctx.fillStyle = 'rgba(255, 107, 0, 0.32)';
            ctx.fillRect(boxLeft, scanY - 4, boxW, 6);
          }
          ctx.restore();

          const rolesList = SISTEMAS_CAREER.roles;
          const elapsedRoulette = now - person.rouletteStartTime;
          const isSpinningRoulette = elapsedRoulette < 1400;
          const currentRoleText =
            idx === 0 && quizRef.current.winner
              ? quizRef.current.winner === 'IA'
                ? 'Mención: Inteligencia Artificial'
                : 'Mención: Ciberseguridad'
              : isSpinningRoulette
              ? rolesList[Math.floor(elapsedRoulette / 95) % rolesList.length]
              : rolesList[person.roleIndex % rolesList.length];

          const cardW = Math.min(315, Math.max(225, W * 0.22));
          const cardH = 104;
          const rawCardX =
            idx === 0 && persons.length > 1
              ? person.shoulderCenterX - person.shoulderWidth * 0.78 - cardW
              : person.shoulderCenterX + person.shoulderWidth * 0.72;
          const cardX = clamp(rawCardX, 16, W - cardW - 16);
          const cardY = clamp(
            person.shoulderCenterY - person.shoulderWidth * 0.55,
            84,
            H - cardH - 135
          );

          ctx.save();
          ctx.fillStyle = 'rgba(10, 10, 10, 0.86)';
          ctx.strokeStyle = '#FF6B00';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.roundRect(cardX, cardY, cardW, cardH, 10);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#FF6B00';
          ctx.beginPath();
          ctx.roundRect(cardX, cardY, cardW, 22, [10, 10, 0, 0]);
          ctx.fill();

          ctx.fillStyle = '#0A0A0A';
          ctx.font = '800 9.5px "Orbitron", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(
            `${SISTEMAS_CAREER.badge}${persons.length > 1 ? ` // P#${idx + 1}` : ''}`,
            cardX + 10,
            cardY + 14.5
          );

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 11.5px "Space Grotesk", sans-serif';
          ctx.fillText(SISTEMAS_CAREER.profileTitle, cardX + 10, cardY + 42);

          ctx.fillStyle = isSpinningRoulette
            ? 'rgba(255, 107, 0, 0.25)'
            : 'rgba(255, 107, 0, 0.14)';
          ctx.strokeStyle = isSpinningRoulette ? '#FFFFFF' : 'rgba(255, 107, 0, 0.6)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.roundRect(cardX + 10, cardY + 50, cardW - 20, 28, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isSpinningRoulette ? '#FFFFFF' : '#FF6B00';
          ctx.font = '800 10.5px "Orbitron", sans-serif';
          ctx.fillText(
            isSpinningRoulette ? `🎰 ${currentRoleText.toUpperCase()}` : `★ ${currentRoleText}`,
            cardX + 16,
            cardY + 68
          );

          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.font = '600 9px "Orbitron", monospace';
          ctx.fillText('#NuevaMallaSistemas #Unifranz', cardX + 10, cardY + 94);
          ctx.restore();
        }
      }

      // === 3G. LÓGICA Y RENDERIZADO DEL MINIJUEGO AR "¿IA O CIBERSEGURIDAD?" (CONTROLADO POR CABEZA) ===
      if (quizRef.current.active && persons.length > 0) {
        const player = persons[0];
        const qState = quizRef.current;
        const dt = Math.min(100, Math.max(8, now - (qState.lastFrameTs || now)));
        qState.lastFrameTs = now;

        const currentQuestion = SIS_QUIZ_QUESTIONS[qState.questionIdx];
        if (currentQuestion) {
          const roll =
            qState.simTiltOverride !== 0
              ? qState.simTiltOverride
              : player.vrAngle || player.shoulderAngle * 1.4;
          const threshold = AR_CONFIG.QUIZ_HEAD_TILT_THRESHOLD_RAD;

          let detectedChoice = null;
          if (roll < -threshold) {
            detectedChoice = 'LEFT';
          } else if (roll > threshold) {
            detectedChoice = 'RIGHT';
          }

          if (detectedChoice && detectedChoice === qState.tiltSide) {
            qState.holdMs += dt;
          } else if (detectedChoice) {
            qState.tiltSide = detectedChoice;
            qState.holdMs = dt;
          } else {
            qState.holdMs = Math.max(0, qState.holdMs - dt * 1.5);
            if (qState.holdMs === 0) qState.tiltSide = null;
          }

          const fillProgress = clamp(qState.holdMs / AR_CONFIG.QUIZ_FILL_DURATION_MS, 0, 1);

          drawHeadTiltQuizHUD(
            ctx,
            player,
            currentQuestion,
            qState.questionIdx,
            SIS_QUIZ_QUESTIONS.length,
            qState.tiltSide,
            fillProgress,
            W,
            H
          );

          if (fillProgress >= 1) {
            if (qState.tiltSide === 'LEFT') {
              qState.aiVotes += 1;
            } else {
              qState.cyberVotes += 1;
            }

            qState.holdMs = 0;
            qState.tiltSide = null;
            qState.questionIdx += 1;

            if (qState.questionIdx < SIS_QUIZ_QUESTIONS.length) {
              triggerEnergyShockwave(
                player.vrCenterX / W,
                player.vrCenterY / H,
                `⚡ RESPUESTA ${qState.questionIdx}/3 REGISTRADA`
              );
            } else {
              // ¡Revelación Épica del Resultado! Equipa Visor Oculus Blanco + Corona Holográfica UNIFRANZ
              const winnerKey = qState.aiVotes >= qState.cyberVotes ? 'IA' : 'CIBERSEGURIDAD';
              qState.active = false;
              qState.winner = winnerKey;

              // Activar modo "Ambos" (Visor Oculus Blanco + Corona UNIFRANZ)
              setAccessoryModeIdx(2);
              setQuizUiState({ active: false, winner: winnerKey });

              triggerParticleExplosion(
                player.shoulderCenterX,
                player.shoulderCenterY,
                winnerKey === 'IA'
                  ? ['AI', 'NEURAL', '10', 'GPT', 'ML', '★', '01']
                  : ['SEC', 'AES-256', '🛡️', 'RSA', '0x7F', 'LOCK', '★']
              );
              triggerEnergyShockwave(
                player.shoulderCenterX / W,
                player.shoulderCenterY / H,
                winnerKey === 'IA'
                  ? '🏆 MENCIÓN ASIGNADA: INTELIGENCIA ARTIFICIAL + OCULUS & CORONA'
                  : '🏆 MENCIÓN ASIGNADA: CIBERSEGURIDAD + OCULUS & CORONA'
              );

              setTimeout(() => {
                startPhotoCountdown(
                  winnerKey === 'IA'
                    ? '👑 FOTO SOUVENIR: MENCIÓN INTELIGENCIA ARTIFICIAL'
                    : '👑 FOTO SOUVENIR: MENCIÓN CIBERSEGURIDAD'
                );
              }, 1600);
            }
          }
        }
      }

      // === 4. HAZ DE SINERGIA MULTI-PERSONA ===
      if (persons.length >= 2) {
        for (let i = 0; i < persons.length - 1; i++) {
          const p1 = persons[i];
          const p2 = persons[i + 1];
          const distBetween = Math.hypot(
            p2.shoulderCenterX - p1.shoulderCenterX,
            p2.shoulderCenterY - p1.shoulderCenterY
          );
          if (distBetween < W * 0.72) {
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
      }

      // === 5. SUPERPODERES EN LAS MANOS, MANDOS DUALSENSE, TECLADO HOLOGRÁFICO Y GESTO DE PAZ ✌️ ===
      const trackedHands = tState.trackedHands;
      const handsByPersonId = new Map();

      for (let i = 0; i < trackedHands.length; i++) {
        const hand = trackedHands[i];
        if (hand.alpha <= 0.02) continue;

        if (!handsByPersonId.has(hand.ownerPersonId)) {
          handsByPersonId.set(hand.ownerPersonId, []);
        }
        handsByPersonId.get(hand.ownerPersonId).push(hand);

        // Nodos cibernéticos sutiles en articulaciones de la mano
        if (showHud && !hand.isMissing && hand.rawLandmarks) {
          ctx.save();
          ctx.globalAlpha = hand.alpha;
          ctx.fillStyle = '#FF6B00';
          const keyPts = [0, 5, 9, 13, 17, 4, 8, 12, 16, 20];
          for (let k = 0; k < keyPts.length; k++) {
            const pt = hand.rawLandmarks[keyPts[k]];
            ctx.beginPath();
            ctx.arc(toScreenX(pt.x), toScreenY(pt.y), 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // Control de Cambio de Accesorios: Gesto de Paz ✌️ (2 dedos levantados)
        if (!sim && !hand.isMissing && hand.gesture === 'PEACE') {
          tState.peaceHoldFrames++;
          if (
            tState.peaceHoldFrames >= 7 &&
            now - tState.lastAccessorySwitchTs > AR_CONFIG.ACCESSORY_SWITCH_COOLDOWN_MS
          ) {
            tState.lastAccessorySwitchTs = now;
            tState.peaceHoldFrames = 0;
            cycleAccessoryMode({ x: hand.x / W, y: hand.y / H }, true);
          }
        }
      }

      // Evaluar poderes por persona
      handsByPersonId.forEach((hands, ownerId) => {
        const person = persons.find((p) => p.id === ownerId) || persons[0];
        if (!person) return;

        // A. Comprobar Fusión "Innovación Digital" (Juntar ambas palmas o puños chocando)
        let isFused = false;
        if (hands.length >= 2) {
          const h1 = hands[0];
          const h2 = hands[1];
          const handDist = Math.hypot(h1.x - h2.x, h1.y - h2.y);
          const fuseThreshold = Math.max(135, person.shoulderWidth * 0.78);

          if (handDist < fuseThreshold) {
            isFused = true;
            const coreX = (h1.x + h2.x) / 2;
            const coreY = (h1.y + h2.y) / 2;
            const coreAlpha = Math.min(h1.alpha, h2.alpha);

            drawDigitalFusionCore(
              ctx,
              coreX,
              coreY,
              Math.max(64, person.shoulderWidth * 0.36),
              now,
              coreAlpha
            );

            // Activar Matriz Cibernética Tron durante 4 segundos con onda de choque
            tState.tronFusionUntilTs = now + AR_CONFIG.TRON_FUSION_DURATION_MS;
            if (now - tState.lastFusionTriggerTs > 2200) {
              tState.lastFusionTriggerTs = now;
              triggerEnergyShockwave(
                coreX / W,
                coreY / H,
                '⚡ FUSIÓN INNOVACIÓN DIGITAL: MATRIZ TRON ACTIVADA (4s)'
              );
              triggerParticleExplosion(coreX, coreY, ['0', '1', 'AI', 'TRON', '{ }', '</>']);
            }
          }
        }

        if (isFused) return;

        // B. Comprobar Teclado Holográfico Flotante (Modo Hacker / Developer)
        // Se activa si extiende ambas manos hacia adelante con palmas hacia abajo ('TYPING'), o si activó el botón Teclado / Modo Hacker HUD
        const bothHandsTyping =
          hands.length >= 2 &&
          hands.every(
            (h) =>
              h.gesture === 'TYPING' ||
              (h.y > person.shoulderCenterY + person.torsoHeight * 0.05 &&
                h.y < person.shoulderCenterY + person.torsoHeight * 0.85 &&
                h.gesture !== 'FIST' &&
                h.gesture !== 'OPEN_PALM')
          );

        if (bothHandsTyping || forceKeyboard || currentAccessory.hackerHud) {
          const kbCenterX = person.shoulderCenterX;
          const kbCenterY = person.shoulderCenterY + person.torsoHeight * 0.42;
          const kbWidth = person.shoulderWidth * AR_CONFIG.KEYBOARD_WIDTH_FACTOR;
          const allFingerTips = hands.flatMap((h) => h.fingerTips || [{ x: h.x, y: h.y }]);

          drawHolographicKeyboard(
            ctx,
            kbCenterX,
            kbCenterY,
            kbWidth,
            allFingerTips,
            now,
            (hitX, hitY) => {
              if (tState.burstParticles.length < 85) {
                const codeWords = ['React', 'AI', 'Cloud', '0101', 'Node', 'Docker', 'PyTorch'];
                tState.burstParticles.push({
                  x: hitX,
                  y: hitY,
                  vx: (Math.random() - 0.5) * 1.8,
                  vy: -3.2 - Math.random() * 3.5,
                  text: codeWords[Math.floor(Math.random() * codeWords.length)],
                  size: 11 + Math.random() * 6,
                  alpha: 1,
                  color: Math.random() > 0.4 ? '#FF6B00' : '#FFFFFF',
                });
              }
            }
          );
        }

        // C. Poderes Individuales en cada Mano
        hands.forEach((h, hIdx) => {
          if (h.gesture === 'FIST') {
            // Cerrar el puño / agarrar en el aire -> Mando de PlayStation DualSense Holográfico vibrando
            drawProceduralDualSenseController(
              ctx,
              h.x,
              h.y - 18,
              Math.max(82, person.shoulderWidth * AR_CONFIG.DUALSENSE_WIDTH_FACTOR),
              h.tiltAngle,
              now,
              true,
              h.alpha
            );

            // Disparar símbolos de PlayStation (△, ○, ✕, □) como partículas luminosas
            if (tState.burstParticles.length < 85 && Math.random() < 0.35) {
              const psSyms = ['△', '○', '✕', '□'];
              const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
              const speed = 3 + Math.random() * 5;
              tState.burstParticles.push({
                x: h.x,
                y: h.y - 25,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                text: psSyms[Math.floor(Math.random() * psSyms.length)],
                size: 14 + Math.random() * 8,
                alpha: 1,
                color: Math.random() > 0.45 ? '#FF6B00' : '#FFFFFF',
              });
            }
          } else if (!bothHandsTyping) {
            // Mano Izquierda abierta -> Esfera de Inteligencia Artificial que lanza sinapsis al Visor Oculus
            // Mano Derecha abierta -> Escudo Hexagonal de Ciberseguridad con Candado Digital
            if (h.anatomicalSide === 'LEFT_HAND') {
              const oculusTarget = person.hasVr
                ? { x: person.vrCenterX, y: person.vrCenterY }
                : null;
              drawNeuralBinarySphere(
                ctx,
                h.x,
                h.y - 24,
                Math.max(44, person.shoulderWidth * AR_CONFIG.NEURAL_SPHERE_RADIUS_FACTOR),
                now + hIdx * 400,
                h.alpha,
                oculusTarget
              );
            } else {
              drawCybersecurityHandShield(
                ctx,
                h.x,
                h.y - 24,
                Math.max(48, person.shoulderWidth * AR_CONFIG.CYBER_SHIELD_RADIUS_FACTOR),
                now + hIdx * 400,
                h.alpha
              );
            }
          }
        });
      });

      // Si el usuario activó el botón de Teclado Holográfico sin manos detectadas aún, mostrarlo frente a la persona
      if (forceKeyboard && persons.length > 0 && trackedHands.length === 0) {
        const p0 = persons[0];
        drawHolographicKeyboard(
          ctx,
          p0.shoulderCenterX,
          p0.shoulderCenterY + p0.torsoHeight * 0.42,
          p0.shoulderWidth * AR_CONFIG.KEYBOARD_WIDTH_FACTOR,
          [{ x: p0.shoulderCenterX, y: p0.shoulderCenterY + p0.torsoHeight * 0.42 }],
          now,
          (hitX, hitY) => {
            if (tState.burstParticles.length < 75) {
              const codeWords = ['React', 'AI', 'Cloud', '0101'];
              tState.burstParticles.push({
                x: hitX,
                y: hitY,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -3 - Math.random() * 3,
                text: codeWords[Math.floor(Math.random() * codeWords.length)],
                size: 12,
                alpha: 1,
                color: Math.random() > 0.4 ? '#FF6B00' : '#FFFFFF',
              });
            }
          }
        );
      }

      // === 6. PARTÍCULAS DE CÓDIGO, SÍMBOLOS PLAYSTATION Y EXPLOSIONES ===
      if (tState.burstParticles.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = tState.burstParticles.length - 1; i >= 0; i--) {
          const bp = tState.burstParticles[i];
          bp.x += bp.vx;
          bp.y += bp.vy;
          bp.alpha -= 0.02;

          if (bp.alpha <= 0.03 || bp.x < -50 || bp.x > W + 50 || bp.y < -50 || bp.y > H + 50) {
            tState.burstParticles.splice(i, 1);
            continue;
          }

          ctx.font = `900 ${Math.round(bp.size)}px "Orbitron", monospace`;
          ctx.fillStyle = bp.color;
          ctx.globalAlpha = bp.alpha;
          ctx.fillText(bp.text, bp.x, bp.y);
        }
        ctx.restore();
      }

      // === 7. PARTÍCULAS AMBIENTALES DE SISTEMAS ===
      if (showHud) {
        const prox = tState.proximity;
        const speedMultiplier = 0.7 + prox * 1.8;
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

          if (p.type === 'DINO') {
            drawPixelDino(
              ctx,
              px,
              py,
              2.2 + prox * 0.9,
              p.color,
              clamp(p.alpha * (0.5 + prox * 0.5), 0.2, 0.9),
              Math.floor(now / 220) % 2
            );
          } else {
            ctx.save();
            ctx.font = `700 ${Math.round(p.size + prox * 4)}px "Orbitron", monospace`;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = clamp(p.alpha * (0.45 + prox * 0.5), 0.15, 0.85);
            ctx.fillText(p.type, px, py);
            ctx.restore();
          }
        });
      }

      // === 8. DETECCIÓN DE SONRISA PARA CAPTURAR FOTO ===
      if (!sim && persons.length > 0 && !quizRef.current.active) {
        const hasSmilingFace = persons.some(
          (p) => p.hasFace && detectSmileFromFace(p.rawFaceLandmarks, p.faceBlendshapes)
        );
        if (hasSmilingFace) {
          tState.smileHoldFrames++;
          if (
            tState.smileHoldFrames >= AR_CONFIG.SMILE_HOLD_FRAMES &&
            now - tState.lastPhotoTriggerTime > AR_CONFIG.PHOTO_TRIGGER_COOLDOWN_MS &&
            !stateRef.current.countdownActive
          ) {
            tState.lastPhotoTriggerTime = now;
            tState.smileHoldFrames = 0;
            startPhotoCountdown('😄 ¡SONRISA UNIFRANZ DETECTADA! CAPTURANDO...');
          }
        }
      }

      // === 9. ONDAS DE CHOQUE (SHOCKWAVES NARANJA NEÓN) ===
      for (let i = tState.shockwaves.length - 1; i >= 0; i--) {
        const sw = tState.shockwaves[i];
        sw.radius += 28;
        sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255, 107, 0, ${sw.alpha})`;
        ctx.lineWidth = 5 * sw.alpha + 1;
        ctx.beginPath();
        ctx.arc(sw.x * W, sw.y * H, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        if (sw.alpha <= 0.03) {
          tState.shockwaves.splice(i, 1);
        }
      }

      // === 10. VIÑETA SUTIL DE BORDE ===
      const vigGrad = ctx.createRadialGradient(
        W * 0.5,
        H * 0.5,
        Math.min(W, H) * 0.38,
        W * 0.5,
        H * 0.5,
        Math.max(W, H) * 0.78
      );
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(1, 'rgba(10, 10, 10, 0.58)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, W, H);
    };

    rafRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [
    isReady,
    startPhotoCountdown,
    triggerEnergyShockwave,
    triggerParticleExplosion,
    cycleAccessoryMode,
  ]);

  const currentAccessoryObj = ACCESSORY_MODES[accessoryModeIdx] || ACCESSORY_MODES[0];

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

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

      <div className="pointer-events-none fixed inset-0 z-10 border-2 border-[#FF6B00]/55" />

      {flashActive && (
        <div className="fixed inset-0 z-40 bg-white/90 pointer-events-none transition-opacity duration-200" />
      )}

      {/* Barra Superior Institucional UNIFRANZ • Ingeniería de Sistemas */}
      <header className="fixed top-0 inset-x-0 z-20 p-3 md:px-6 md:py-4 flex items-center justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto glass-panel px-4 py-2 rounded-2xl flex items-center gap-3.5">
          <UnifranzLogo className="h-8 md:h-10" />
          <div className="hidden sm:flex flex-col border-l border-white/15 pl-3.5">
            <span className="font-display font-bold text-[10px] text-[#FF6B00] tracking-widest uppercase">
              INAUGURACIÓN NUEVA MALLA 2026 • #NuevaMallaSistemas
            </span>
            <span className="font-tech text-xs text-white/95 font-semibold flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-[#FF6B00]" />
              {SISTEMAS_CAREER.fullName}
            </span>
          </div>
        </div>

        {gestureBanner && (
          <div className="hidden xl:flex items-center gap-2 px-4 py-2 rounded-full glass-panel-bright text-[#FF6B00] font-display font-bold text-xs tracking-wider uppercase">
            <Sparkles className="w-4 h-4" />
            <span>{gestureBanner}</span>
          </div>
        )}

        <div className="pointer-events-auto flex items-center gap-2">
          {/* Botón Destacado del Minijuego Interactivo "¿IA o Ciberseguridad?" */}
          <button
            onClick={startSistemasQuiz}
            className={`px-3.5 py-2 rounded-2xl font-display font-extrabold text-[11px] tracking-wider uppercase flex items-center gap-1.5 border transition shadow-neon-orange ${
              quizUiState.active
                ? 'bg-white text-black border-[#FF6B00] animate-pulse'
                : 'bg-gradient-to-r from-[#FF6B00] to-[#FF5500] text-black border-white/30 hover:scale-105'
            }`}
            title="Iniciar Test AR controlado inclinando la cabeza: ¿IA o Ciberseguridad?"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>🎮 TEST AR: ¿IA O CIBERSEGURIDAD?</span>
          </button>

          <button
            onClick={spinRoleRoulette}
            className="glass-panel hover:bg-[#FF6B00] hover:text-black text-white px-3 py-2 rounded-2xl font-display font-bold text-[11px] tracking-wider uppercase flex items-center gap-1.5 transition"
            title="Girar Ruleta de Rol Profesional de Ingeniería de Sistemas"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Nuevo Rol</span>
          </button>

          <button
            onClick={() => setFondoMetaverso((prev) => !prev)}
            className={`px-3 py-2 rounded-2xl font-display font-bold text-[11px] tracking-wider uppercase flex items-center gap-1.5 border transition ${
              fondoMetaverso
                ? 'bg-[#FF6B00] text-black border-[#FF6B00]'
                : 'glass-panel text-white/75 hover:text-white border-white/15'
            }`}
            title="Activar/Desactivar Matriz Cibernética Tron"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Matriz Tron</span>
          </button>

          {isSimulationMode && (
            <>
              <button
                onClick={() =>
                  setSimHandMode((prev) =>
                    prev === 'POWERS'
                      ? 'GAMING'
                      : prev === 'GAMING'
                      ? 'KEYBOARD'
                      : prev === 'KEYBOARD'
                      ? 'FUSION'
                      : 'POWERS'
                  )
                }
                className="px-3 py-2 rounded-2xl font-display font-bold text-[11px] tracking-wider uppercase flex items-center gap-1.5 border glass-panel text-[#FF6B00] border-[#FF6B00]/60"
                title="Alternar gestos de mano en Modo Simulación (Esfera IA/Escudo -> Mandos PS5 -> Teclado -> Fusión Tron)"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Sim: {simHandMode}</span>
              </button>

              <button
                onClick={() => setSimTwoPersons((prev) => !prev)}
                className={`px-3 py-2 rounded-2xl font-display font-bold text-[11px] tracking-wider uppercase flex items-center gap-1.5 border transition ${
                  simTwoPersons
                    ? 'bg-[#FF6B00] text-black border-[#FF6B00]'
                    : 'glass-panel text-[#FF6B00] border-[#FF6B00]/60'
                }`}
                title="Alternar 1 o 2 personas en simulación"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{simTwoPersons ? '2P' : '1P'}</span>
              </button>
            </>
          )}

          <div className="glass-panel px-3.5 py-2 rounded-2xl flex items-center gap-2.5 text-xs font-tech">
            <span
              className="flex items-center gap-1 text-white/80 font-semibold"
              title="Personas detectadas"
            >
              <Users className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span ref={peopleSpanRef}>0</span>
            </span>
            <span className="h-3.5 w-[1px] bg-white/20" />
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF6B00]" />
              <span
                ref={fpsSpanRef}
                className="font-display font-bold text-[11px] tracking-wider text-[#FF6B00]"
              >
                -- FPS
              </span>
            </span>
          </div>
        </div>
      </header>

      {/* Overlay de Cuenta Regresiva */}
      {countdown !== null && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center pointer-events-none bg-black/40">
          <div className="relative flex items-center justify-center w-44 h-44 md:w-56 md:h-56 rounded-full glass-panel-bright border-4 border-[#FF6B00]">
            <span className="font-display font-black text-7xl md:text-8xl text-white">
              {countdown}
            </span>
          </div>
          <p className="mt-5 font-display font-bold text-sm md:text-base tracking-[0.22em] uppercase text-[#FF6B00] bg-black/85 px-5 py-2 rounded-full border border-[#FF6B00]/60">
            ¡POSA CON TU VISOR OCULUS & PODERES DE SISTEMAS!
          </p>
        </div>
      )}

      {/* Panel Inferior: Selector de Accesorios (Gesto Paz ✌️) | Superpoderes Interactivos | Captura */}
      <footer className="fixed bottom-0 inset-x-0 z-20 p-3 md:p-4 flex flex-col items-center pointer-events-none">
        <div className="pointer-events-auto max-w-7xl w-full glass-panel rounded-3xl p-3 md:px-5 md:py-3 flex flex-col xl:flex-row items-center justify-between gap-3">
          {/* Selector de Modo de Accesorios (También cambiable haciendo el gesto ✌️ Paz) */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 bg-black/45 p-1.5 rounded-2xl border border-white/10">
            <span className="hidden 2xl:inline text-[10px] font-display font-bold uppercase tracking-widest text-[#FF6B00] px-2">
              ✌️ Accesorios
            </span>
            {ACCESSORY_MODES.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => {
                  setAccessoryModeIdx(idx);
                  showBanner(`MODO ACTIVO: ${m.label.toUpperCase()}`);
                }}
                aria-pressed={accessoryModeIdx === idx}
                className={`px-3 py-2 rounded-xl font-display font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 transition-colors border ${
                  accessoryModeIdx === idx
                    ? 'bg-[#FF6B00] text-black border-[#FF6B00]'
                    : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                }`}
              >
                {m.id === 'OCULUS' && <Glasses className="w-4 h-4" />}
                {m.id === 'CROWN' && <Crown className="w-4 h-4" />}
                {m.id === 'BOTH' && <Zap className="w-4 h-4" />}
                {m.id === 'HACKER_HUD' && <Terminal className="w-4 h-4" />}
                <span>{m.shortLabel}</span>
              </button>
            ))}
          </div>

          {/* Guía Rápida de Superpoderes de Manos & Botones Interactivos */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 bg-black/45 p-1.5 rounded-2xl border border-white/10">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-[11px] font-tech text-white/80">
              <span className="text-[#FF6B00] font-bold">✋ Izq:</span> Esfera IA
              <span className="text-white/25">|</span>
              <span className="text-[#FF6B00] font-bold">✋ Der:</span> Escudo Ciber
              <span className="text-white/25">|</span>
              <span className="text-[#FF6B00] font-bold">✊ Puño:</span> Mando PS5
              <span className="text-white/25">|</span>
              <span className="text-[#FF6B00] font-bold">🙏 Juntar:</span> Fusión Tron
            </div>

            <button
              onClick={() =>
                setManualKeyboard((prev) => {
                  const next = !prev;
                  showBanner(
                    next
                      ? '⌨️ TECLADO HOLOGRÁFICO DEVELOPER ACTIVADO'
                      : 'TECLADO HOLOGRÁFICO EN MODO AUTOMÁTICO'
                  );
                  return next;
                })
              }
              aria-pressed={manualKeyboard}
              className={`px-3 py-2 rounded-xl font-display font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 transition-colors border ${
                manualKeyboard
                  ? 'bg-[#FF6B00]/25 border-[#FF6B00] text-[#FF6B00]'
                  : 'bg-white/5 border-white/10 text-white/65 hover:text-white'
              }`}
              title="Mostrar Teclado Holográfico Flotante en el Aire"
            >
              <Keyboard className="w-4 h-4" />
              <span>Teclado Dev</span>
            </button>

            <button
              onClick={() =>
                setHudEnabled((prev) => {
                  const next = !prev;
                  showBanner(next ? '✨ ORBITALES & HUD ACTIVADOS' : 'HUD DESACTIVADO');
                  return next;
                })
              }
              aria-pressed={hudEnabled}
              className={`px-3 py-2 rounded-xl font-display font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 transition-colors border ${
                hudEnabled
                  ? 'bg-[#FF6B00]/25 border-[#FF6B00] text-[#FF6B00]'
                  : 'bg-white/5 border-white/10 text-white/65 hover:text-white'
              }`}
              title="Activar/Desactivar Íconos Orbitales de Sistemas y Tarjeta HUD"
            >
              <Sparkles className="w-4 h-4" />
              <span>HUD</span>
            </button>
          </div>

          <button
            onClick={() => startPhotoCountdown('📸 CAPTURANDO MOMENTO #NuevaMallaSistemas...')}
            disabled={countdown !== null}
            className="w-full xl:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#FF5500] hover:from-[#FF7A1A] hover:to-[#FF6B00] text-black font-display font-black text-xs md:text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 animate-cta-pulse transition-transform active:scale-95 disabled:opacity-50"
          >
            <Camera className="w-5 h-5 stroke-[2.5]" />
            <span>Capturar Foto</span>
          </button>
        </div>
      </footer>

      <PhotoModal photoData={capturedPhoto} onClose={() => setCapturedPhoto(null)} />
    </div>
  );
}
