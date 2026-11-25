import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FilesetResolver,
  FaceLandmarker,
  HandLandmarker,
  ImageSegmenter,
} from '@mediapipe/tasks-vision';
import {
  AR_CONFIG,
  ACCESSORY_MODES,
  TECH_STACK_ITEMS,
  OFFICIAL_CAREER_NAME,
  OFFICIAL_MENTIONS,
  SIS_QUIZ_QUESTIONS,
} from './config';
import {
  clamp,
  prewarmTechBadgeSprites,
  getTechBadgeSprite,
  drawTechStackOrbit,
  drawProceduralWhiteOculusQuest,
  drawCyberEngineerFacialHUD,
  drawProceduralDualSenseController,
  drawHolographicKeyboardAndTerminal,
  drawNeuralBinarySphere,
  drawCybersecurityHandShield,
  drawDigitalFusionCore,
  drawHeadTiltQuizHUD,
  drawQuizResultEffects,
  drawCyberBlackBackground,
  drawSynergyConnectionBeam,
} from './utils/arHelpers';
import {
  extractValidFaces,
  updateTrackedPersonsFromFaces,
  updateTrackedHands,
  evaluateFoolproofTwoOpenHands,
  stepTrackedHandsFade,
} from './utils/personTracker';
import LoadingScreen from './components/LoadingScreen';
import UnifranzLogo from './components/UnifranzLogo';
import {
  Code2,
  Glasses,
  Sparkles,
  Users,
  Terminal,
  Gamepad2,
  Zap,
  Cpu,
  Square,
  Keyboard,
} from 'lucide-react';

/**
 * Función smoothstep matemática exacta entre edge0 (0.45) y edge1 (0.75)
 * Elimina por completo las manchas pixeladas del techo/pared manteniendo a la persona 100% nítida.
 */
function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

export default function App() {
  // === 1. Estado del Espejo Interactivo 100% en Vivo ===
  const [accessoryModeIdx, setAccessoryModeIdx] = useState(0);
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const [activeMention, setActiveMention] = useState(null); // null | 'IA' | 'CIBER'
  // Regla estricta: el Fondo Negro SOLO cambia manualmente con este botón
  const [blackBgEnabled, setBlackBgEnabled] = useState(false);
  // Botón manual para fijar/probar el Teclado Holográfico con un clic
  const [manualKeyboardEnabled, setManualKeyboardEnabled] = useState(false);

  const [simTwoPersons, setSimTwoPersons] = useState(false);
  const [simHandMode, setSimHandMode] = useState('POWERS'); // 'POWERS' | 'KEYBOARD' | 'GAMING' | 'ROCK'

  // === Minijuego Interactivo: "¿Qué Mención de Sistemas eres?" ===
  const [quizUiState, setQuizUiState] = useState({
    active: false,
    winner: null, // null | 'IA' | 'CIBER'
  });

  // Estados de carga
  const [loadingProgress, setLoadingProgress] = useState(10);
  const [loadingStatus, setLoadingStatus] = useState(
    'Inicializando motor neuronal MediaPipe GPU...'
  );
  const [cameraError, setCameraError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);

  // Feedback de interfaz
  const [gestureBanner, setGestureBanner] = useState(null);

  // Refs de DOM y Canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const fpsSpanRef = useRef(null);
  const peopleSpanRef = useRef(null);

  // Canvases auxiliares para la Composición en 3 Capas Exactas del Modo Fondo Negro:
  // 1) rawMaskCanvasRef: 256x144 donde se vuelca el smoothstep(0.45, 0.75) de la máscara de persona
  // 2) blurredMaskCanvasRef: 256x144 donde se aplica blur(4px) para bordes de cabello/hombros suaves
  // 3) personLayerCanvasRef: resolución completa del video original recortada con destination-in
  const rawMaskCanvasRef = useRef(null);
  const blurredMaskCanvasRef = useRef(null);
  const personLayerCanvasRef = useRef(null);
  const hasSegCacheRef = useRef(false);

  // Espejo del estado en Ref para lectura instantánea dentro de requestAnimationFrame (60 FPS)
  const stateRef = useRef({
    accessoryModeIdx: 0,
    orbitEnabled: true,
    activeMention: null,
    blackBgEnabled: false,
    manualKeyboardEnabled: false,
    isSimulationMode: false,
    simTwoPersons: false,
    simHandMode: 'POWERS',
  });

  useEffect(() => {
    stateRef.current.accessoryModeIdx = accessoryModeIdx;
    stateRef.current.orbitEnabled = orbitEnabled;
    stateRef.current.activeMention = activeMention;
    stateRef.current.blackBgEnabled = blackBgEnabled;
    stateRef.current.manualKeyboardEnabled = manualKeyboardEnabled;
    stateRef.current.isSimulationMode = isSimulationMode;
    stateRef.current.simTwoPersons = simTwoPersons;
    stateRef.current.simHandMode = simHandMode;
    if (!blackBgEnabled) {
      hasSegCacheRef.current = false;
    }
  }, [
    accessoryModeIdx,
    orbitEnabled,
    activeMention,
    blackBgEnabled,
    manualKeyboardEnabled,
    isSimulationMode,
    simTwoPersons,
    simHandMode,
  ]);

  // Estado del Minijuego en Ref
  const quizRef = useRef({
    active: false,
    questionIdx: 0,
    tiltSide: null,
    holdMs: 0,
    lastFrameTs: 0,
    aiVotes: 0,
    cyberVotes: 0,
    winner: null, // null | 'IA' | 'CIBER'
    simTiltOverride: 0,
  });

  // Modelos MediaPipe Tasks Vision (selfie_segmenter.tflite específico para personas frente a cámara)
  const landmarkersRef = useRef({
    face: null,
    hand: null,
    segmenter: null,
  });

  // Estado de seguimiento a 60 FPS en Ref
  const trackingRef = useRef({
    trackedPersons: [],
    trackedHands: [],
    keyboardAlpha: 0,
    lastValidTypingTs: 0,
    terminalCharsTyped: 8,
    techParticles: [],
    shockwaves: [],
  });

  // Pre-renderizar los 14 logos con sus colores oficiales en OffscreenCanvas al iniciar
  useEffect(() => {
    prewarmTechBadgeSprites();
  }, []);

  // Soporte de flechas Izquierda/Derecha para responder el test en Modo Simulación
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!quizRef.current.active) return;
      if (e.key === 'ArrowLeft') quizRef.current.simTiltOverride = -0.28;
      if (e.key === 'ArrowRight') quizRef.current.simTiltOverride = -0.28;
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

  // Inicializar cámara 854x480 @ 60fps y modelos MediaPipe (FaceLandmarker, HandLandmarker & selfie_segmenter.tflite)
  const initExperience = useCallback(async (useSimulation = false) => {
    setCameraError(null);
    setLoadingProgress(20);
    setLoadingStatus('Pre-renderizando logos oficiales en OffscreenCanvas...');
    prewarmTechBadgeSprites();

    setLoadingProgress(40);
    setLoadingStatus('Iniciando cámara 854x480 @ 60 FPS de ultra-baja latencia...');

    if (!useSimulation) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: AR_CONFIG.CAMERA_IDEAL_WIDTH },
            height: { ideal: AR_CONFIG.CAMERA_IDEAL_HEIGHT },
            frameRate: { ideal: AR_CONFIG.CAMERA_IDEAL_FPS },
            facingMode: 'user',
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

    setLoadingProgress(65);
    setLoadingStatus('Cargando FaceLandmarker, HandLandmarker & SelfieSegmenter (GPU)...');

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm'
      );

      setLoadingProgress(80);
      const [faceLandmarker, handLandmarker] = await Promise.all([
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
          outputFaceBlendshapes: false,
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
        console.warn('SelfieSegmenter GPU fallback a CPU:', segErr);
        try {
          imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
            },
            runningMode: 'VIDEO',
            outputCategoryMask: false,
            outputConfidenceMasks: true,
          });
        } catch (e2) {
          console.warn('SelfieSegmenter no disponible:', e2);
        }
      }

      landmarkersRef.current = {
        face: faceLandmarker,
        hand: handLandmarker,
        segmenter: imageSegmenter,
      };
    } catch (visionErr) {
      console.warn('Error inicializando MediaPipe:', visionErr);
    }

    setLoadingProgress(100);
    setLoadingStatus(`¡${OFFICIAL_CAREER_NAME} • 60 FPS Listo!`);
    setTimeout(() => setIsReady(true), 180);
  }, []);

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

  // Disparar lluvia / explosión de Logos Tech con sus colores reales
  const spawnTechStackParticles = useCallback(
    (originX, originY, count = 8, isRadialExplosion = false) => {
      const list = trackingRef.current.techParticles;
      if (list.length > 48) return;

      for (let i = 0; i < count; i++) {
        const item = TECH_STACK_ITEMS[Math.floor(Math.random() * TECH_STACK_ITEMS.length)];
        const angle = isRadialExplosion
          ? (i / count) * Math.PI * 2 + Math.random() * 0.3
          : -Math.PI / 2 + (Math.random() - 0.5) * 1.45;
        const speed = isRadialExplosion ? 4.5 + Math.random() * 8 : 3.2 + Math.random() * 5.5;

        list.push({
          item,
          x: originX + (Math.random() - 0.5) * 20,
          y: originY + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 46 + Math.random() * 20,
          alpha: 1,
        });
      }
    },
    []
  );

  // Iniciar el Minijuego Interactivo "¿Qué Mención de Sistemas eres?"
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
      '🎮 TEST AR: INCLINA TU CABEZA A IZQUIERDA O DERECHA'
    );
  }, [triggerEnergyShockwave]);

  // ============================================================================
  // BUCLE DE RESPUESTA INSTANTÁNEA (ZERO-LAG) + COMPOSICIÓN EN 3 CAPAS DEL FONDO NEGRO
  // ============================================================================
  useEffect(() => {
    if (!isReady) return;

    let lastFpsUpdate = performance.now();
    let frameCounter = 0;
    let lastVideoTime = -1;
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
        orbitEnabled: showOrbit,
        activeMention: currentMention,
        blackBgEnabled: manualBlackBg,
        manualKeyboardEnabled: forceKeyboard,
        isSimulationMode: sim,
        simTwoPersons: sim2P,
        simHandMode: sHandMode,
      } = stateRef.current;

      const currentAccessory = ACCESSORY_MODES[accIdx] || ACCESSORY_MODES[0];

      let drawX = 0;
      let drawY = 0;
      let drawW = W;
      let drawH = H;
      const vW = video?.videoWidth || 854;
      const vH = video?.videoHeight || 480;

      if (!sim && video && video.readyState >= 2) {
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

      // === 1. DETECCIÓN DIRECTA Y SEGMENTACIÓN LIMPIA DE PERSONA (SELFIE_SEGMENTER) ===
      if (!sim && video && video.readyState >= 2) {
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;

          let ts = Math.max(lastDetectTs + 1, Math.round(now));
          lastDetectTs = ts;

          try {
            let rawFaces = [];
            if (landmarkersRef.current.face) {
              const fRes = landmarkersRef.current.face.detectForVideo(video, ts);
              if (fRes?.faceLandmarks) rawFaces = fRes.faceLandmarks;
            }
            const validFaces = extractValidFaces(rawFaces, toScreenX, toScreenY);
            updateTrackedPersonsFromFaces(tState.trackedPersons, validFaces, W, now);

            if (landmarkersRef.current.hand) {
              ts += 1;
              lastDetectTs = ts;
              const handRes = landmarkersRef.current.hand.detectForVideo(video, ts);
              updateTrackedHands(
                tState.trackedHands,
                handRes?.landmarks || [],
                tState.trackedPersons,
                toScreenX,
                toScreenY,
                W,
                now
              );
            }
          } catch (e) {
            // Continuar en el siguiente frame
          }

          // REGLA ESTRICTA: selfie_segmenter.tflite SOLO corre cuando el botón [ ⬛ Fondo Negro / Modo Real ] está activo
          if (manualBlackBg && landmarkersRef.current.segmenter) {
            try {
              ts += 1;
              lastDetectTs = ts;
              const segResult = landmarkersRef.current.segmenter.segmentForVideo(video, ts);
              if (segResult?.confidenceMasks?.length > 0) {
                // En selfie_segmenter, si hay más de una máscara, el índice final corresponde a la persona en primer plano;
                // si solo hay 1 máscara (256x144), confidenceMasks[0] tiene la confianza [0.0..1.0] de la persona.
                const masks = segResult.confidenceMasks;
                const personMask = masks[masks.length - 1];
                const mW = personMask.width;
                const mH = personMask.height;
                const maskFloat = personMask.getAsFloat32Array();

                if (!rawMaskCanvasRef.current) {
                  rawMaskCanvasRef.current = document.createElement('canvas');
                  blurredMaskCanvasRef.current = document.createElement('canvas');
                  personLayerCanvasRef.current = document.createElement('canvas');
                }
                const rawMaskCanvas = rawMaskCanvasRef.current;
                const blurredMaskCanvas = blurredMaskCanvasRef.current;
                const personLayerCanvas = personLayerCanvasRef.current;

                if (rawMaskCanvas.width !== mW || rawMaskCanvas.height !== mH) {
                  rawMaskCanvas.width = mW;
                  rawMaskCanvas.height = mH;
                  blurredMaskCanvas.width = mW;
                  blurredMaskCanvas.height = mH;
                }
                if (personLayerCanvas.width !== vW || personLayerCanvas.height !== vH) {
                  personLayerCanvas.width = vW;
                  personLayerCanvas.height = vH;
                }

                // Paso 1: Umbral suave (smoothstep entre 0.45 y 0.75) para eliminar manchas y fantasmas del techo/pared
                const rCtx = rawMaskCanvas.getContext('2d');
                const imgData = rCtx.createImageData(mW, mH);
                const d = imgData.data;

                for (let i = 0; i < maskFloat.length; i++) {
                  const alphaVal = smoothstep(0.45, 0.75, maskFloat[i]);
                  const idx = i * 4;
                  d[idx] = 255;
                  d[idx + 1] = 255;
                  d[idx + 2] = 255;
                  d[idx + 3] = Math.round(alphaVal * 255);
                }
                rCtx.putImageData(imgData, 0, 0);

                // Paso 2: Suavizado de bordes (Feathering con blur(4px) solo en el canvas pequeño 256x144 de la máscara)
                const bCtx = blurredMaskCanvas.getContext('2d');
                bCtx.clearRect(0, 0, mW, mH);
                bCtx.filter = 'blur(4px)';
                bCtx.drawImage(rawMaskCanvas, 0, 0, mW, mH);
                bCtx.filter = 'none';

                // Paso 3: En el canvas temporal de persona (a resolución completa vW x vH del video),
                // dibujamos el <video> original a todo color/brillo real y lo recortamos con 'destination-in'
                const pCtx = personLayerCanvas.getContext('2d');
                pCtx.globalCompositeOperation = 'source-over';
                pCtx.clearRect(0, 0, vW, vH);
                pCtx.drawImage(video, 0, 0, vW, vH);
                pCtx.globalCompositeOperation = 'destination-in';
                pCtx.drawImage(blurredMaskCanvas, 0, 0, vW, vH);
                pCtx.globalCompositeOperation = 'source-over';

                masks.forEach((m) => m.close());
                hasSegCacheRef.current = true;
              }
            } catch (segErr) {
              // Ignorar error transitorio de máscara
            }
          }
        }

        stepTrackedHandsFade(tState.trackedHands, now);

        // === 2. COMPOSICIÓN EN 3 CAPAS EXACTAS (CAPA 1: FONDO -> CAPA 2: PERSONA 100% NÍTIDA -> CAPA 3: ELEMENTOS AR) ===
        if (manualBlackBg) {
          // CAPA 1 (Fondo): Fondo negro profundo (#050505) + retícula de perspectiva naranja UNIFRANZ (#FF6B00)
          drawCyberBlackBackground(ctx, W, H, now);

          // CAPA 2 (Persona 100% nítida y brillante): Misma orientación espejo scale(-1, 1) y tamaño que el video
          const sourceToDraw =
            hasSegCacheRef.current && personLayerCanvasRef.current
              ? personLayerCanvasRef.current
              : video;

          ctx.save();
          ctx.translate(W, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(sourceToDraw, W - drawX - drawW, drawY, drawW, drawH);
          ctx.restore();
        } else {
          // Modo Real (Cámara directa en espejo con 0% procesamiento de segmentación)
          ctx.save();
          ctx.translate(W, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, W - drawX - drawW, drawY, drawW, drawH);
          ctx.restore();
        }
      } else if (sim) {
        // === MODO SIMULACIÓN HOLOGRÁFICA A 60 FPS ===
        if (manualBlackBg) {
          drawCyberBlackBackground(ctx, W, H, now);
        } else {
          ctx.fillStyle = '#0E0E0E';
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

        const validFaces = extractValidFaces(simFaces, toScreenX, toScreenY);
        updateTrackedPersonsFromFaces(tState.trackedPersons, validFaces, W, now);

        const handOsc = Math.sin(now * 0.002) * 0.025;
        const c0 = centers[0];

        const makeSimHandByMode = (hx, hy, modeType) => {
          const arr = Array.from({ length: 21 }, () => ({ x: hx, y: hy, z: 0 }));
          arr[0] = { x: hx, y: hy + 0.05, z: 0 };
          arr[5] = { x: hx - 0.025, y: hy, z: 0 };
          arr[9] = { x: hx, y: hy, z: 0 };
          arr[13] = { x: hx + 0.015, y: hy, z: 0 };
          arr[17] = { x: hx + 0.03, y: hy, z: 0 };

          if (modeType === 'GAMING') {
            [8, 6, 12, 10, 16, 14, 20, 18].forEach((k) => {
              arr[k] = { x: hx, y: hy + 0.015, z: 0 };
            });
          } else if (modeType === 'ROCK') {
            arr[6] = { x: hx - 0.025, y: hy - 0.03, z: 0 };
            arr[8] = { x: hx - 0.025, y: hy - 0.08, z: 0 };
            arr[10] = { x: hx, y: hy + 0.01, z: 0 };
            arr[12] = { x: hx, y: hy + 0.02, z: 0 };
            arr[14] = { x: hx + 0.015, y: hy + 0.01, z: 0 };
            arr[16] = { x: hx + 0.015, y: hy + 0.02, z: 0 };
            arr[18] = { x: hx + 0.03, y: hy - 0.03, z: 0 };
            arr[20] = { x: hx + 0.03, y: hy - 0.075, z: 0 };
          } else {
            // 4 dedos extendidos hacia arriba (punta 8, 12, 16, 20 por encima de nudillo medio 6, 10, 14, 18)
            const tap = Math.sin(now * 0.022 + hx * 12) * 0.012;
            arr[6] = { x: hx - 0.025, y: hy - 0.03, z: 0 };
            arr[8] = { x: hx - 0.025, y: hy - 0.08 + tap, z: 0 };
            arr[10] = { x: hx, y: hy - 0.03, z: 0 };
            arr[12] = { x: hx, y: hy - 0.085 - tap, z: 0 };
            arr[14] = { x: hx + 0.015, y: hy - 0.03, z: 0 };
            arr[16] = { x: hx + 0.015, y: hy - 0.08 + tap, z: 0 };
            arr[18] = { x: hx + 0.03, y: hy - 0.03, z: 0 };
            arr[20] = { x: hx + 0.03, y: hy - 0.075 - tap, z: 0 };
          }
          return arr;
        };

        // En modo POWERS simulamos 1 sola mano abierta para ver la Esfera IA; en KEYBOARD simulamos las 2 manos abiertas
        const simHandsList =
          sHandMode === 'POWERS'
            ? [makeSimHandByMode(c0 + 0.16 + handOsc, 0.48 + breath, 'POWERS')]
            : [
                makeSimHandByMode(c0 - 0.15 + handOsc, 0.52 + breath, sHandMode),
                makeSimHandByMode(c0 + 0.15 - handOsc, 0.52 - breath, sHandMode),
              ];

        updateTrackedHands(
          tState.trackedHands,
          simHandsList,
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
      const effectiveMention = currentMention || quizRef.current.winner;

      // === CAPA 3 (Elementos AR): ÓRBITA TECH A TODO COLOR, VISOR OCULUS QUEST BLANCO & HUD CIBER-INGENIERO ===
      for (let idx = 0; idx < persons.length; idx++) {
        const person = persons[idx];

        if (showOrbit) {
          drawTechStackOrbit(ctx, person, effectiveMention, now + idx * 600);
        }

        if (currentAccessory.oculus && person.hasVr) {
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

        if (currentAccessory.cyberHud && person.hasVr) {
          drawCyberEngineerFacialHUD(ctx, person, now);
        }

        if (idx === 0 && effectiveMention) {
          drawQuizResultEffects(ctx, person, effectiveMention, W, H);
        }
      }

      // === 3D. MINIJUEGO AR "¿QUÉ MENCIÓN DE SISTEMAS ERES?" ===
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
              const winnerKey = qState.aiVotes >= qState.cyberVotes ? 'IA' : 'CIBER';
              const officialTitle =
                winnerKey === 'IA' ? OFFICIAL_MENTIONS.IA : OFFICIAL_MENTIONS.CIBER;

              qState.active = false;
              qState.winner = winnerKey;

              setAccessoryModeIdx(2);
              setActiveMention(winnerKey);
              setQuizUiState({ active: false, winner: winnerKey });

              spawnTechStackParticles(player.shoulderCenterX, player.shoulderCenterY, 16, true);
              triggerEnergyShockwave(
                player.shoulderCenterX / W,
                player.shoulderCenterY / H,
                `🏆 ${officialTitle.toUpperCase()}`
              );
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

      // === 5. GESTOS INFALIBLES DE MANOS: 🖐️🖐️ 2 MANOS ABIERTAS = TECLADO | ✊✊ 2 PUÑOS = MANDO PS5 | 🖐️ 1 MANO = PODER MENCIÓN ===
      const trackedHands = tState.trackedHands;
      const handsByPersonId = new Map();

      for (let i = 0; i < trackedHands.length; i++) {
        const hand = trackedHands[i];
        if (hand.alpha <= 0.02) continue;

        if (!handsByPersonId.has(hand.ownerPersonId)) {
          handsByPersonId.set(hand.ownerPersonId, []);
        }
        handsByPersonId.get(hand.ownerPersonId).push(hand);

        if (!hand.isMissing && hand.rawLandmarks) {
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
      }

      let anyKeyboardActive = forceKeyboard;

      handsByPersonId.forEach((hands, ownerId) => {
        const person = persons.find((p) => p.id === ownerId) || persons[0];
        if (!person) return;

        // A. GESTO INFALIBLE 1: ✊✊ AMBOS PUÑOS CERRADOS -> MANDO GAMING PLAYSTATION DUALSENSE
        const bothFistsClosed =
          hands.length >= 2 && hands.every((h) => h.gesture === 'FIST');

        if (bothFistsClosed) {
          const ctrlX = (hands[0].x + hands[1].x) / 2;
          const ctrlY = (hands[0].y + hands[1].y) / 2;
          const ctrlTilt =
            Math.atan2(
              hands[1].y - hands[0].y,
              Math.max(20, Math.abs(hands[1].x - hands[0].x))
            ) * (hands[1].x >= hands[0].x ? 1 : -1);

          drawProceduralDualSenseController(
            ctx,
            ctrlX,
            ctrlY,
            Math.max(120, person.shoulderWidth * 0.65),
            clamp(ctrlTilt, -0.5, 0.5),
            now,
            true,
            Math.min(hands[0].alpha, hands[1].alpha)
          );
          return;
        }

        // B. GESTO INFALIBLE 2: 🖐️🖐️ DOS MANOS ABIERTAS AL FRENTE (4 dedos extendidos en cada mano) -> TECLADO HOLOGRÁFICO + TERMINAL
        const twoOpenEval = evaluateFoolproofTwoOpenHands(hands);
        if (twoOpenEval.isTwoOpenHands || forceKeyboard) {
          anyKeyboardActive = true;
          tState.lastValidTypingTs = now;
          tState.keyboardAlpha = Math.min(1, tState.keyboardAlpha + 0.25);

          // Escribir código en vivo en la mini-terminal conforme mueve los dedos
          const speedBoost = twoOpenEval.motionSpeed > 1.2 ? 0.55 : 0.18;
          tState.terminalCharsTyped += speedBoost;
        }

        if (tState.keyboardAlpha > 0.02) {
          const kbCenterX =
            hands[0]?.x && hands[1]?.x
              ? (hands[0].x + hands[1].x) / 2
              : person.shoulderCenterX;
          const kbCenterY =
            hands[0]?.y && hands[1]?.y
              ? (hands[0].y + hands[1].y) / 2 + 16
              : person.shoulderCenterY + person.torsoHeight * 0.36;
          const kbWidth = Math.max(
            320,
            person.shoulderWidth * AR_CONFIG.KEYBOARD_WIDTH_FACTOR
          );
          const allFingerTips = hands.flatMap((h) => h.fingerTips || []);

          drawHolographicKeyboardAndTerminal(
            ctx,
            kbCenterX,
            kbCenterY,
            kbWidth,
            allFingerTips,
            tState.terminalCharsTyped,
            tState.keyboardAlpha,
            () => {
              tState.terminalCharsTyped += 0.35;
            }
          );
        }

        if (twoOpenEval.isTwoOpenHands) return;

        // C. GESTO 3: 🖐️ UNA MANO ABIERTA (Izquierda = Inteligencia Artificial y Ciencia de Datos | Derecha = Ciberseguridad y Blockchain)
        hands.forEach((h, hIdx) => {
          if (h.gesture === 'FIST') {
            drawProceduralDualSenseController(
              ctx,
              h.x,
              h.y - 16,
              Math.max(85, person.shoulderWidth * 0.48),
              h.tiltAngle,
              now,
              true,
              h.alpha
            );
          } else if (h.isOpenHand4Fingers || h.gesture === 'ROCK' || h.gesture === 'OPEN_PALM') {
            const emitProb = h.gesture === 'ROCK' ? 0.45 : 0.24;
            if (Math.random() < emitProb) {
              spawnTechStackParticles(h.x, h.y - 24, 1, false);
            }

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

      // Si el usuario activó el botón manual "⌨️ Teclado Holográfico" incluso sin manos en pantalla, mostrarlo frente a la persona
      if (forceKeyboard && persons.length > 0 && trackedHands.length === 0) {
        tState.lastValidTypingTs = now;
        tState.keyboardAlpha = 1;
        tState.terminalCharsTyped += 0.22;
        const p0 = persons[0];
        drawHolographicKeyboardAndTerminal(
          ctx,
          p0.shoulderCenterX,
          p0.shoulderCenterY + p0.torsoHeight * 0.36,
          Math.max(320, p0.shoulderWidth * AR_CONFIG.KEYBOARD_WIDTH_FACTOR),
          [
            {
              x: p0.shoulderCenterX + Math.sin(now * 0.008) * 110,
              y: p0.shoulderCenterY + p0.torsoHeight * 0.36,
            },
          ],
          tState.terminalCharsTyped,
          1
        );
      }

      // Desvanecer el teclado suavemente en 0.3s cuando baja las manos y el botón manual no está activo
      if (!anyKeyboardActive && tState.keyboardAlpha > 0) {
        const elapsedSinceTyping = now - tState.lastValidTypingTs;
        tState.keyboardAlpha = clamp(
          1 - elapsedSinceTyping / AR_CONFIG.KEYBOARD_FADE_DURATION_MS,
          0,
          1
        );
      }

      // === 6. RENDERIZAR PARTÍCULAS DE LOGOS DE TECNOLOGÍAS (COLORES OFICIALES PRE-CACHEADOS) ===
      if (tState.techParticles.length > 0) {
        for (let i = tState.techParticles.length - 1; i >= 0; i--) {
          const tp = tState.techParticles[i];
          tp.x += tp.vx;
          tp.y += tp.vy;
          tp.vy -= 0.04;
          tp.alpha -= 0.016;

          if (tp.alpha <= 0.03 || tp.x < -80 || tp.x > W + 80 || tp.y < -80 || tp.y > H + 80) {
            tState.techParticles.splice(i, 1);
            continue;
          }

          const sprite = getTechBadgeSprite(tp.item);
          ctx.save();
          ctx.globalAlpha = tp.alpha;
          ctx.drawImage(sprite, tp.x - tp.size / 2, tp.y - tp.size / 2, tp.size, tp.size);
          ctx.restore();
        }
      }

      // === 7. ONDAS DE CHOQUE (SHOCKWAVES NARANJA NEÓN) ===
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
    };

    rafRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isReady, triggerEnergyShockwave, spawnTechStackParticles]);

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

      {/* Barra Superior Institucional UNIFRANZ • Ingeniería de Sistemas e Innovación Digital */}
      <header className="fixed top-0 inset-x-0 z-20 p-3 md:px-6 md:py-4 flex items-center justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto glass-panel px-4 py-2 rounded-2xl flex items-center gap-3.5">
          <UnifranzLogo className="h-8 md:h-10" />
          <div className="hidden sm:flex flex-col border-l border-white/15 pl-3.5">
            <span className="font-display font-bold text-[10px] text-[#FF6B00] tracking-widest uppercase">
              UNIFRANZ AR MIRROR EXPERIENCE
            </span>
            <span className="font-tech text-xs md:text-sm text-white font-bold flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-[#FF6B00]" />
              {OFFICIAL_CAREER_NAME}
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
          {/* Botón Destacado del Minijuego Interactivo */}
          <button
            onClick={startSistemasQuiz}
            className={`px-3.5 py-2 rounded-2xl font-display font-extrabold text-[11px] tracking-wider uppercase flex items-center gap-1.5 border transition ${
              quizUiState.active
                ? 'bg-white text-black border-[#FF6B00] animate-pulse'
                : 'bg-gradient-to-r from-[#FF6B00] to-[#FF5500] text-black border-white/30 hover:scale-105'
            }`}
            title="Iniciar Test AR controlado inclinando la cabeza"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>🎮 TEST AR DE MENCIÓN</span>
          </button>

          {/* Selector de Mención Oficial en el Encabezado */}
          <button
            onClick={() =>
              setActiveMention((prev) =>
                prev === null ? 'IA' : prev === 'IA' ? 'CIBER' : null
              )
            }
            className="glass-panel hover:border-[#FF6B00] px-3 py-2 rounded-2xl font-display font-bold text-[11px] tracking-wider uppercase flex items-center gap-1.5 text-white transition"
            title="Alternar Mención Oficial en Órbita"
          >
            <Cpu className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span className="hidden md:inline">
              {activeMention === 'IA'
                ? OFFICIAL_MENTIONS.IA
                : activeMention === 'CIBER'
                ? OFFICIAL_MENTIONS.CIBER
                : 'Ambas Menciones'}
            </span>
          </button>

          {isSimulationMode && (
            <>
              <button
                onClick={() =>
                  setSimHandMode((prev) =>
                    prev === 'POWERS'
                      ? 'KEYBOARD'
                      : prev === 'KEYBOARD'
                      ? 'GAMING'
                      : prev === 'GAMING'
                      ? 'ROCK'
                      : 'POWERS'
                  )
                }
                className="px-3 py-2 rounded-2xl font-display font-bold text-[11px] tracking-wider uppercase flex items-center gap-1.5 border glass-panel text-[#FF6B00] border-[#FF6B00]/60"
                title="Alternar gestos en Simulación (POWERS 1 Mano -> KEYBOARD 2 Manos Abiertas -> GAMING 2 Puños -> ROCK)"
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

      {/* Panel Inferior: Visor Facial | Teclado Manual & Fondo Negro Manual | Guía Clara de los 4 Gestos */}
      <footer className="fixed bottom-0 inset-x-0 z-20 p-3 md:p-4 flex flex-col items-center pointer-events-none">
        <div className="pointer-events-auto max-w-[1440px] w-full glass-panel rounded-3xl p-3 md:px-5 md:py-3 flex flex-col xl:flex-row items-center justify-between gap-3">
          {/* Grupo Izquierdo: Visor Facial + Órbita Tech */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 bg-black/45 p-1.5 rounded-2xl border border-white/10">
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
                {m.id === 'CYBER_HUD' && <Terminal className="w-4 h-4" />}
                {m.id === 'BOTH' && <Zap className="w-4 h-4" />}
                <span>{m.shortLabel}</span>
              </button>
            ))}

            <button
              onClick={() =>
                setOrbitEnabled((prev) => {
                  const next = !prev;
                  showBanner(next ? '✨ ÓRBITA TECH ACTIVADA' : 'ÓRBITA TECH OCULTA');
                  return next;
                })
              }
              aria-pressed={orbitEnabled}
              className={`px-3 py-2 rounded-xl font-display font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 transition-colors border ${
                orbitEnabled
                  ? 'bg-[#FF6B00]/25 border-[#FF6B00] text-[#FF6B00]'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
              title="Activar/Desactivar Órbita 3D de Logos con Colores Oficiales"
            >
              <Sparkles className="w-4 h-4" />
              <span>Órbita Tech</span>
            </button>
          </div>

          {/* Grupo Central: Botones Manuales [ ⌨️ Teclado Holográfico ] y [ ⬛ Fondo Negro / Modo Real ] */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() =>
                setManualKeyboardEnabled((prev) => {
                  const next = !prev;
                  showBanner(
                    next
                      ? '⌨️ TECLADO HOLOGRÁFICO FIJADO MANUALMENTE'
                      : '🖐️🖐️ TECLADO EN MODO GESTO (DOS MANOS ABIERTAS)'
                  );
                  return next;
                })
              }
              aria-pressed={manualKeyboardEnabled}
              className={`px-4 py-2.5 rounded-2xl font-display font-extrabold text-xs tracking-wider uppercase flex items-center gap-2 transition-all border ${
                manualKeyboardEnabled
                  ? 'bg-[#FF6B00] text-black border-[#FF6B00]'
                  : 'bg-black/80 hover:bg-black text-white border-[#FF6B00]/60'
              }`}
              title="Activar/Desactivar Teclado Holográfico manualmente con un clic (o levanta ambas manos abiertas)"
            >
              <Keyboard className="w-4 h-4" />
              <span>⌨️ Teclado Holográfico</span>
            </button>

            <button
              onClick={() =>
                setBlackBgEnabled((prev) => {
                  const next = !prev;
                  showBanner(
                    next
                      ? '⬛ FONDO NEGRO (RECORTE LIMPIO SELFIE SEGMENTER) ACTIVADO'
                      : '🎥 MODO REAL (CÁMARA DIRECTA SIN SEGMENTACIÓN) ACTIVADO'
                  );
                  return next;
                })
              }
              aria-pressed={blackBgEnabled}
              className={`px-4 py-2.5 rounded-2xl font-display font-extrabold text-xs tracking-wider uppercase flex items-center gap-2 transition-all border ${
                blackBgEnabled
                  ? 'bg-[#FF6B00] text-black border-[#FF6B00]'
                  : 'bg-black/80 hover:bg-black text-white border-[#FF6B00]/60'
              }`}
              title="Cambiar manualmente entre Modo Real y Fondo Negro con recorte limpio de persona"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>⬛ Fondo Negro / Modo Real</span>
            </button>
          </div>

          {/* Grupo Derecho: Tarjeta de Guía Clara con los 4 Gestos Activos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 bg-black/60 px-4 py-2 rounded-2xl border border-[#FF6B00]/40 text-[11px] font-tech text-white/90">
            <div className="flex items-center gap-1.5">
              <strong className="text-[#FF6B00] whitespace-nowrap">🖐️ Izq. Abierta:</strong>
              <span className="truncate">{OFFICIAL_MENTIONS.IA}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <strong className="text-[#FF6B00] whitespace-nowrap">🖐️ Der. Abierta:</strong>
              <span className="truncate">{OFFICIAL_MENTIONS.CIBER}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <strong className="text-[#FF6B00] whitespace-nowrap">🖐️🖐️ Ambas Abiertas:</strong>
              <span className="truncate">Teclado Holográfico en el Aire</span>
            </div>
            <div className="flex items-center gap-1.5">
              <strong className="text-[#FF6B00] whitespace-nowrap">✊✊ Ambos Puños:</strong>
              <span className="truncate">Mandos Gaming PlayStation</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
