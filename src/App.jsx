import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FilesetResolver,
  PoseLandmarker,
  FaceLandmarker,
  HandLandmarker,
  ImageSegmenter,
} from '@mediapipe/tasks-vision';
import { AR_CONFIG, CAREERS, ASSETS_PATHS } from './config';
import {
  lerp,
  clamp,
  drawPixelDino,
  drawWalkingShoulderDino,
  drawShoulderScalesEmblem,
  drawNeuralBinarySphere,
  drawDigitalFusionCore,
  drawHolographicScales,
  drawLegalTechShield,
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
  Scale,
  Glasses,
  Sparkles,
  RefreshCw,
  Users,
  Layers,
} from 'lucide-react';

export default function App() {
  // === Estado de filtros separado en Carrera (única) y Accesorios (independientes) ===
  // La carrera y los accesorios SOLO cambian mediante los botones de la interfaz.
  const [carrera, setCarrera] = useState('sistemas'); // 'derecho' | 'sistemas'
  const [accesorios, setAccesorios] = useState({
    lentesVR: true,
    hud: true,
  });
  const [fondoMetaverso, setFondoMetaverso] = useState(false);
  const [simTwoPersons, setSimTwoPersons] = useState(false);

  // Estados de carga y modal
  const [loadingProgress, setLoadingProgress] = useState(10);
  const [loadingStatus, setLoadingStatus] = useState('Inicializando motor neuronal MediaPipe GPU...');
  const [cameraError, setCameraError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);

  // Feedback de interfaz (solo eventos discretos, nunca por cuadro)
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
    carrera: 'sistemas',
    lentesVR: true,
    hud: true,
    fondoMetaverso: false,
    isSimulationMode: false,
    simTwoPersons: false,
    countdownActive: false,
  });

  useEffect(() => {
    stateRef.current.carrera = carrera;
    stateRef.current.lentesVR = accesorios.lentesVR;
    stateRef.current.hud = accesorios.hud;
    stateRef.current.fondoMetaverso = fondoMetaverso;
    stateRef.current.isSimulationMode = isSimulationMode;
    stateRef.current.simTwoPersons = simTwoPersons;
    stateRef.current.countdownActive = countdown !== null;
    if (!fondoMetaverso) {
      hasSegCacheRef.current = false;
    }
  }, [carrera, accesorios, fondoMetaverso, isSimulationMode, simTwoPersons, countdown]);

  // Modelos MediaPipe
  const landmarkersRef = useRef({
    pose: null,
    face: null,
    hand: null,
    segmenter: null,
  });

  // Imágenes PNG precargadas una sola vez al iniciar
  const assetsRef = useRef({
    shirtSis: null,
    shirtDer: null,
    vrHeadset: null,
    logoImg: null,
  });

  // Estado de seguimiento multi-persona, manos y partículas (100% en useRef)
  const trackingRef = useRef({
    trackedPersons: [],
    trackedHands: [],
    proximity: 0.25,
    lastPhotoTriggerTime: 0,
    peaceOrSmileHoldFrames: 0,
    shockwaves: [],
    particles: [],
    burstParticles: [],
  });

  // Inicializar partículas ambientales ligeras
  useEffect(() => {
    const pts = [];
    for (let i = 0; i < 24; i++) {
      pts.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.001,
        vy: -0.001 - Math.random() * 0.0018,
        size: 10 + Math.random() * 8,
        type: i % 5 === 0 ? 'DINO' : i % 3 === 0 ? 'AI' : i % 2 === 0 ? '0' : '1',
        alpha: 0.25 + Math.random() * 0.55,
        color: Math.random() > 0.35 ? '#FF6B00' : '#FFFFFF',
      });
    }
    trackingRef.current.particles = pts;
  }, []);

  // Precargar assets una sola vez al inicio
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

    const [sisImg, derImg, vrImg, logoImg] = await Promise.all([
      loadImg(CAREERS.sistemas.shirtPath),
      loadImg(CAREERS.derecho.shirtPath),
      loadImg(ASSETS_PATHS.vrHeadset),
      loadImg(ASSETS_PATHS.logoPng, ASSETS_PATHS.logoSvg),
    ]);

    assetsRef.current.shirtSis = sisImg;
    assetsRef.current.shirtDer = derImg;
    assetsRef.current.vrHeadset = vrImg;
    assetsRef.current.logoImg = logoImg;
  }, []);

  // Inicializar cámara y modelos MediaPipe GPU
  const initExperience = useCallback(
    async (useSimulation = false) => {
      setCameraError(null);
      setLoadingProgress(15);
      setLoadingStatus('Precargando filtros PNG optimizados...');
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
      setLoadingStatus('Cargando PoseLandmarker, FaceLandmarker y HandLandmarker (GPU)...');

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
      setLoadingStatus('¡Espejo AR UNIFRANZ • Nueva Malla 2026 Listo!');
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
    setTimeout(() => setGestureBanner(null), 2200);
  }, []);

  const triggerEnergyShockwave = useCallback(
    (normX = 0.5, normY = 0.45, label = '') => {
      trackingRef.current.shockwaves.push({
        x: normX,
        y: normY,
        radius: 12,
        maxRadius: Math.max(window.innerWidth, window.innerHeight) * 0.65,
        alpha: 0.9,
      });
      showBanner(label);
    },
    [showBanner]
  );

  // Girar ruleta de rol profesional para todas las personas rastreadas
  const spinRoleRoulette = useCallback(() => {
    const now = performance.now();
    trackingRef.current.trackedPersons.forEach((p) => {
      p.rouletteStartTime = now;
      p.scanStartTime = now;
      p.roleIndex = (p.roleIndex + 1 + Math.floor(Math.random() * 3)) % 4;
    });
    triggerEnergyShockwave(0.5, 0.35, '🎰 RULETA HOLOGRÁFICA: NUEVO PERFIL ASIGNADO');
  }, [triggerEnergyShockwave]);

  // Cambiar carrera ÚNICAMENTE mediante los botones de la interfaz
  const selectCarrera = useCallback(
    (nextCarrera) => {
      setCarrera(nextCarrera);
      const now = performance.now();
      trackingRef.current.trackedPersons.forEach((p) => {
        p.scanStartTime = now;
        p.rouletteStartTime = now;
      });
      const label =
        nextCarrera === 'derecho'
          ? '⚖️ DERECHO • BALANZA HOLOGRÁFICA & ESCUDO LEGALTECH'
          : '💻 ING. DE SISTEMAS • ESFERAS IA & DINO PIXEL';
      triggerEnergyShockwave(0.5, 0.5, label);
    },
    [triggerEnergyShockwave]
  );

  // Capturar Foto Souvenir directamente desde el canvas en vivo
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

    ctx.fillStyle = 'rgba(10, 10, 10, 0.88)';
    ctx.fillRect(36, 36, 330, 44);
    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 36, 330, 44);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 14px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('INAUGURACIÓN NUEVA MALLA 2026', 201, 63);

    ctx.fillStyle = 'rgba(10, 10, 10, 0.88)';
    ctx.fillRect(W - 310, 36, 270, 44);
    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 2;
    ctx.strokeRect(W - 310, 36, 270, 44);
    ctx.fillStyle = '#FF6B00';
    ctx.font = '800 16px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('#InnovaciónUnifranz', W - 175, 64);

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

    const activeCareer = CAREERS[stateRef.current.carrera] || CAREERS.sistemas;
    const firstPerson = trackingRef.current.trackedPersons[0];
    const roleIdx = firstPerson ? firstPerson.roleIndex % activeCareer.roles.length : 0;
    const assignedRole = activeCareer.roles[roleIdx];
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
    ctx.fillText(activeCareer.fullName.toUpperCase(), W - 48, footerY + 46);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 15px "Space Grotesk", sans-serif';
    ctx.fillText(`ROL DEL FUTURO: ${assignedRole.toUpperCase()}`, W - 48, footerY + 72);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.font = '600 13px "Space Grotesk", sans-serif';
    ctx.fillText(
      `UNIFRANZ AR MIRROR  •  ${activeCareer.shortName.toUpperCase()}  •  ${nowStr}  •  #InnovaciónUnifranz`,
      W - 48,
      footerY + 98
    );

    const framedDataUrl = outCanvas.toDataURL('image/png', 0.92);
    const qrUrl = `${window.location.origin}/?souvenir=UNIFRANZ-AR&carrera=${encodeURIComponent(
      activeCareer.shortName
    )}&rol=${encodeURIComponent(assignedRole)}&fecha=${encodeURIComponent(
      nowStr
    )}&tag=InnovacionUnifranz`;

    setCapturedPhoto({
      framedDataUrl,
      careerShort: activeCareer.shortName,
      careerLabel: `${activeCareer.shortName} • ${assignedRole}`,
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

  // Bucle único de renderizado y detección (requestAnimationFrame)
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
        carrera: activeCarreraKey,
        lentesVR: showVr,
        hud: showHud,
        fondoMetaverso: useSegBg,
        isSimulationMode: sim,
        simTwoPersons: sim2P,
      } = stateRef.current;
      const activeCareer = CAREERS[activeCarreraKey] || CAREERS.sistemas;

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

          if (runHands && useSegBg && landmarkersRef.current.segmenter) {
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
                  d[idx + 3] = conf > 0.3 ? Math.min(255, Math.floor(((conf - 0.25) / 0.5) * 255)) : 0;
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

        // Actualizar desvanecimiento suave de manos que salen de cuadro
        stepTrackedHandsFade(tState.trackedHands, now);

        // === 2. DIBUJAR FONDO + VIDEO ESPEJO ===
        if (useSegBg && hasSegCacheRef.current && fgCanvasRef.current) {
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
        }
      } else if (sim) {
        // === MODO SIMULACIÓN HOLOGRÁFICA ===
        if (useSegBg) {
          drawMetaverseTronGrid(ctx, W, H, now);
        } else {
          const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.45, 50, W * 0.5, H * 0.5, W * 0.8);
          bgGrad.addColorStop(0, '#1C140D');
          bgGrad.addColorStop(0.55, '#0E0E0E');
          bgGrad.addColorStop(1, '#050505');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, W, H);
        }

        const breath = Math.sin(now * 0.0025) * 0.008;
        const sway = Math.sin(now * 0.0014) * 0.014;
        const centers = sim2P ? [0.68, 0.32] : [0.5];

        const simPoses = centers.map((cx, idx) => {
          const p = [];
          const s = sway * (idx === 0 ? 1 : -1);
          p[0] = { x: cx + s, y: 0.27 + breath, z: 0, visibility: 1 };
          p[2] = { x: cx + 0.025 + s, y: 0.25 + breath, z: 0, visibility: 1 };
          p[5] = { x: cx - 0.025 + s, y: 0.25 + breath, z: 0, visibility: 1 };
          p[7] = { x: cx + 0.055 + s, y: 0.25 + breath, z: 0, visibility: 1 };
          p[8] = { x: cx - 0.055 + s, y: 0.25 + breath, z: 0, visibility: 1 };
          p[11] = { x: cx + 0.11 + s, y: 0.43 + breath, z: 0, visibility: 1 };
          p[12] = { x: cx - 0.11 + s, y: 0.43 - breath * 0.5, z: 0, visibility: 1 };
          p[23] = { x: cx + 0.08 + s, y: 0.77 + breath, z: 0, visibility: 1 };
          p[24] = { x: cx - 0.08 + s, y: 0.77 + breath, z: 0, visibility: 1 };
          return p;
        });

        const simFaces = centers.map((cx, idx) => {
          const f = [];
          const s = sway * (idx === 0 ? 1 : -1);
          f[33] = { x: cx + 0.042 + s, y: 0.25 + breath, z: 0 };
          f[263] = { x: cx - 0.042 + s, y: 0.25 - breath * 0.4, z: 0 };
          f[1] = { x: cx + s, y: 0.28 + breath, z: 0 };
          return f;
        });

        const validPoses = extractValidPoses(simPoses, toScreenX, toScreenY);
        const validFaces = extractValidFaces(simFaces, [], toScreenX, toScreenY);
        const detections = pairFacesToBodies(validPoses, validFaces, W);
        updateTrackedPersons(tState.trackedPersons, detections, W, now);

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
        updateTrackedHands(
          tState.trackedHands,
          [
            makeSimHand(c0 - 0.14 + handOsc, 0.46 + breath),
            makeSimHand(c0 + 0.14 - handOsc, 0.46 - breath),
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

      // === 3. RENDERIZAR FILTROS POR CADA PERSONA DETECTADA (hasta MAX_PERSONS) ===
      const shirtImg =
        activeCarreraKey === 'sistemas' ? assetsRef.current.shirtSis : assetsRef.current.shirtDer;
      const vrImg = assetsRef.current.vrHeadset;

      for (let idx = 0; idx < persons.length; idx++) {
        const person = persons[idx];

        // 3A. Polera anclada a hombros (manteniendo proporción original)
        if (person.hasPose && shirtImg) {
          ctx.save();
          ctx.translate(person.shoulderCenterX, person.shoulderCenterY);
          ctx.rotate(person.shoulderAngle);

          const shirtW = person.shoulderWidth * AR_CONFIG.SHIRT_WIDTH_FACTOR;
          const naturalRatio = (shirtImg.naturalHeight || 800) / (shirtImg.naturalWidth || 800);
          const shirtH = shirtW * naturalRatio;
          const collarOffsetY = -shirtH * AR_CONFIG.SHIRT_COLLAR_OFFSET_Y;

          ctx.drawImage(shirtImg, -shirtW / 2, collarOffsetY, shirtW, shirtH);
          ctx.restore();
        }

        // 3B. Elementos exclusivos de la carrera seleccionada (nunca mezclados)
        if (person.hasPose) {
          if (activeCarreraKey === 'sistemas') {
            drawWalkingShoulderDino(
              ctx,
              person.shoulderCenterX,
              person.shoulderCenterY,
              person.shoulderWidth,
              person.shoulderAngle,
              now + person.id * 700
            );
          } else {
            drawShoulderScalesEmblem(
              ctx,
              person.shoulderCenterX,
              person.shoulderCenterY,
              person.shoulderWidth,
              person.shoulderAngle,
              now + person.id * 700
            );
          }
        }

        // 3C. Lentes VR (FaceLandmarker de cerca + respaldo Pose de lejos; siempre visibles con la polera)
        if (showVr && person.hasVr && vrImg) {
          ctx.save();
          ctx.translate(person.vrCenterX, person.vrCenterY);
          ctx.rotate(person.vrAngle);

          const vrW = person.vrWidth;
          const vrRatio = (vrImg.naturalHeight || 800) / (vrImg.naturalWidth || 800);
          const vrH = vrW * vrRatio;

          ctx.drawImage(vrImg, -vrW / 2, -vrH * AR_CONFIG.VR_CENTER_Y_RATIO, vrW, vrH);
          ctx.restore();
        }

        // 3D. HUD Biométrico & Ruleta de Rol Profesional (solo si accesorio HUD activo)
        if (showHud) {
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

          const rolesList = activeCareer.roles;
          const elapsedRoulette = now - person.rouletteStartTime;
          const isSpinningRoulette = elapsedRoulette < 1400;
          const currentRoleText = isSpinningRoulette
            ? rolesList[Math.floor(elapsedRoulette / 95) % rolesList.length]
            : rolesList[person.roleIndex % rolesList.length];

          const cardW = Math.min(310, Math.max(220, W * 0.21));
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
            `${activeCareer.badge}${persons.length > 1 ? ` // P#${idx + 1}` : ''}`,
            cardX + 10,
            cardY + 14.5
          );

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 11.5px "Space Grotesk", sans-serif';
          ctx.fillText(activeCareer.profileTitle, cardX + 10, cardY + 42);

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
          ctx.fillText('ROL DEL FUTURO • NUEVA MALLA', cardX + 10, cardY + 94);
          ctx.restore();
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

      // === 5. ELEMENTOS EN MANOS SUAVIZADOS (ESTRICTAMENTE SEPARADOS POR CARRERA) ===
      // Nota: NUNCA se cambia carrera ni accesorios desde gestos de manos.
      const trackedHands = tState.trackedHands;
      const handsByPersonId = new Map();

      for (let i = 0; i < trackedHands.length; i++) {
        const hand = trackedHands[i];
        if (hand.alpha <= 0.02) continue;

        if (!handsByPersonId.has(hand.ownerPersonId)) {
          handsByPersonId.set(hand.ownerPersonId, []);
        }
        handsByPersonId.get(hand.ownerPersonId).push(hand);

        // Puntos cibernéticos sutiles en dedos (solo si HUD activo y mano visible)
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

        // Gesto Amor y Paz para capturar foto (no modifica carrera ni accesorios)
        if (!sim && !hand.isMissing && hand.gesture === 'PEACE') {
          tState.peaceOrSmileHoldFrames++;
          if (
            tState.peaceOrSmileHoldFrames >= AR_CONFIG.PEACE_OR_SMILE_HOLD_FRAMES &&
            now - tState.lastPhotoTriggerTime > AR_CONFIG.PHOTO_TRIGGER_COOLDOWN_MS &&
            !stateRef.current.countdownActive
          ) {
            tState.lastPhotoTriggerTime = now;
            tState.peaceOrSmileHoldFrames = 0;
            startPhotoCountdown('✌️ GESTO AMOR Y PAZ: FOTO EN 3... 2... 1...');
          }
        }
      }

      // Dibujar elementos propios de cada carrera sobre las manos suavizadas de cada persona
      handsByPersonId.forEach((hands, ownerId) => {
        const person = persons.find((p) => p.id === ownerId) || persons[0];
        if (!person) return;

        if (activeCarreraKey === 'derecho') {
          // SOLO elementos de Derecho: Escudo LegalTech + Balanza Holográfica suavizada
          if (hands.length >= 2) {
            const shieldX = (hands[0].x + hands[1].x) / 2;
            const shieldY = (hands[0].y + hands[1].y) / 2;
            const shieldAlpha = Math.min(hands[0].alpha, hands[1].alpha);
            drawLegalTechShield(
              ctx,
              shieldX,
              shieldY,
              Math.max(105, person.shoulderWidth * AR_CONFIG.SHIELD_RADIUS_FACTOR),
              now,
              shieldAlpha
            );
          }

          hands.forEach((h) => {
            drawHolographicScales(
              ctx,
              h.x,
              h.y - 64,
              Math.max(46, person.shoulderWidth * AR_CONFIG.SCALES_SIZE_FACTOR),
              now,
              h.tiltAngle,
              h.alpha
            );
          });
        } else if (activeCarreraKey === 'sistemas') {
          // SOLO elementos de Sistemas: Núcleo Fusión Digital + Esfera Red Neuronal
          let isFused = false;
          if (hands.length >= 2) {
            const h1 = hands[0];
            const h2 = hands[1];
            const handDist = Math.hypot(h1.x - h2.x, h1.y - h2.y);
            const fuseThreshold = Math.max(140, person.shoulderWidth * 0.85);

            if (handDist < fuseThreshold) {
              isFused = true;
              const coreX = (h1.x + h2.x) / 2;
              const coreY = (h1.y + h2.y) / 2;
              const coreAlpha = Math.min(h1.alpha, h2.alpha);
              drawDigitalFusionCore(
                ctx,
                coreX,
                coreY,
                Math.max(60, person.shoulderWidth * AR_CONFIG.FUSION_CORE_RADIUS_FACTOR),
                now,
                coreAlpha
              );

              const tokens = ['0', '1', '{ }', 'AI', '</>', '01'];
              for (let b = 0; b < 2; b++) {
                if (tState.burstParticles.length < 60) {
                  const angle = Math.random() * Math.PI * 2;
                  const speed = 4 + Math.random() * 7;
                  tState.burstParticles.push({
                    x: coreX,
                    y: coreY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    text: tokens[Math.floor(Math.random() * tokens.length)],
                    size: 12 + Math.random() * 9,
                    alpha: 1,
                    color: Math.random() > 0.35 ? '#FF6B00' : '#FFFFFF',
                  });
                }
              }
            }
          }

          if (!isFused) {
            hands.forEach((h, hIdx) => {
              drawNeuralBinarySphere(
                ctx,
                h.x,
                h.y - 24,
                Math.max(40, person.shoulderWidth * AR_CONFIG.NEURAL_SPHERE_RADIUS_FACTOR),
                now + hIdx * 500,
                h.alpha
              );
            });
          }
        }
      });

      // === 6. PARTÍCULAS DE CÓDIGO (SOLO EN SISTEMAS) ===
      if (activeCarreraKey === 'sistemas' && tState.burstParticles.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = tState.burstParticles.length - 1; i >= 0; i--) {
          const bp = tState.burstParticles[i];
          bp.x += bp.vx;
          bp.y += bp.vy;
          bp.alpha -= 0.022;

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
      } else if (activeCarreraKey !== 'sistemas' && tState.burstParticles.length > 0) {
        tState.burstParticles.length = 0;
      }

      // === 7. PARTÍCULAS AMBIENTALES LIGERAS (SOLO SI HUD ACTIVO) ===
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

          if (activeCarreraKey === 'sistemas') {
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
          } else {
            ctx.save();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = clamp(p.alpha * (0.4 + prox * 0.45), 0.15, 0.8);
            ctx.beginPath();
            ctx.arc(px, py, 2.2 + prox * 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });
      }

      // === 8. DETECCIÓN DE SONRISA PARA FOTO ===
      if (!sim && persons.length > 0) {
        const hasSmilingFace = persons.some(
          (p) => p.hasFace && detectSmileFromFace(p.rawFaceLandmarks, p.faceBlendshapes)
        );
        if (hasSmilingFace) {
          tState.peaceOrSmileHoldFrames++;
          if (
            tState.peaceOrSmileHoldFrames >= 14 &&
            now - tState.lastPhotoTriggerTime > AR_CONFIG.PHOTO_TRIGGER_COOLDOWN_MS &&
            !stateRef.current.countdownActive
          ) {
            tState.lastPhotoTriggerTime = now;
            tState.peaceOrSmileHoldFrames = 0;
            startPhotoCountdown('😄 ¡SONRISA UNIFRANZ DETECTADA! CAPTURANDO...');
          }
        }
      }

      // === 9. ONDAS DE ENERGÍA ===
      for (let i = tState.shockwaves.length - 1; i >= 0; i--) {
        const sw = tState.shockwaves[i];
        sw.radius += 26;
        sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);

        ctx.save();
        ctx.strokeStyle = `rgba(255, 107, 0, ${sw.alpha})`;
        ctx.lineWidth = 4 * sw.alpha + 1;
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
  }, [isReady, startPhotoCountdown]);

  const activeCareerObj = CAREERS[carrera] || CAREERS.sistemas;

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

      {/* Barra Superior Institucional */}
      <header className="fixed top-0 inset-x-0 z-20 p-3 md:px-6 md:py-4 flex items-center justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto glass-panel px-4 py-2 rounded-2xl flex items-center gap-3.5">
          <UnifranzLogo className="h-8 md:h-10" />
          <div className="hidden sm:flex flex-col border-l border-white/15 pl-3.5">
            <span className="font-display font-bold text-[10px] text-[#FF6B00] tracking-widest uppercase">
              INAUGURACIÓN NUEVA MALLA 2026
            </span>
            <span className="font-tech text-xs text-white/90 font-semibold">
              {activeCareerObj.fullName}
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
          <button
            onClick={spinRoleRoulette}
            className="glass-panel hover:bg-[#FF6B00] hover:text-black text-white px-3.5 py-2 rounded-2xl font-display font-bold text-[11px] tracking-wider uppercase flex items-center gap-1.5 transition"
            title="Girar Ruleta de Rol Profesional del Futuro"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nuevo Perfil</span>
          </button>

          <button
            onClick={() => setFondoMetaverso((prev) => !prev)}
            className={`px-3 py-2 rounded-2xl font-display font-bold text-[11px] tracking-wider uppercase flex items-center gap-1.5 border transition ${
              fondoMetaverso
                ? 'bg-[#FF6B00] text-black border-[#FF6B00]'
                : 'glass-panel text-white/75 hover:text-white border-white/15'
            }`}
            title="Activar/Desactivar Fondo Metaverso (segmentación)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Fondo VR</span>
          </button>

          {isSimulationMode && (
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
              <span>{simTwoPersons ? '2P Sim' : '1P Sim'}</span>
            </button>
          )}

          <div className="glass-panel px-3.5 py-2 rounded-2xl flex items-center gap-2.5 text-xs font-tech">
            <span className="flex items-center gap-1 text-white/80 font-semibold" title="Personas detectadas">
              <Users className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span ref={peopleSpanRef}>0</span>
            </span>
            <span className="h-3.5 w-[1px] bg-white/20" />
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF6B00]" />
              <span ref={fpsSpanRef} className="font-display font-bold text-[11px] tracking-wider text-[#FF6B00]">
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
            ¡POSA CON TUS FILTROS UNIFRANZ!
          </p>
        </div>
      )}

      {/* Panel Inferior: Grupo Carrera | Grupo Accesorios | Captura */}
      <footer className="fixed bottom-0 inset-x-0 z-20 p-3 md:p-5 flex flex-col items-center pointer-events-none">
        <div className="pointer-events-auto max-w-6xl w-full glass-panel rounded-3xl p-3 md:px-5 md:py-3 flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2 bg-black/45 p-1.5 rounded-2xl border border-white/10">
            <span className="hidden xl:inline text-[10px] font-display font-bold uppercase tracking-widest text-white/50 px-2">
              Carrera
            </span>
            <button
              onClick={() => selectCarrera('derecho')}
              aria-pressed={carrera === 'derecho'}
              className={`px-4 py-2.5 rounded-xl font-display font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition-colors ${
                carrera === 'derecho'
                  ? 'bg-[#FF6B00] text-black'
                  : 'bg-white/5 hover:bg-white/10 text-white/75 border border-white/10'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Derecho</span>
            </button>

            <button
              onClick={() => selectCarrera('sistemas')}
              aria-pressed={carrera === 'sistemas'}
              className={`px-4 py-2.5 rounded-xl font-display font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition-colors ${
                carrera === 'sistemas'
                  ? 'bg-[#FF6B00] text-black'
                  : 'bg-white/5 hover:bg-white/10 text-white/75 border border-white/10'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Ing. de Sistemas</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 bg-black/45 p-1.5 rounded-2xl border border-white/10">
            <span className="hidden xl:inline text-[10px] font-display font-bold uppercase tracking-widest text-white/50 px-2">
              Accesorios
            </span>
            <button
              onClick={() =>
                setAccesorios((prev) => {
                  const next = !prev.lentesVR;
                  showBanner(next ? '🥽 LENTES VR ACTIVADOS' : 'LENTES VR DESACTIVADOS');
                  return { ...prev, lentesVR: next };
                })
              }
              aria-pressed={accesorios.lentesVR}
              className={`px-3.5 py-2.5 rounded-xl font-display font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition-colors border ${
                accesorios.lentesVR
                  ? 'bg-[#FF6B00]/25 border-[#FF6B00] text-[#FF6B00]'
                  : 'bg-white/5 border-white/10 text-white/55 hover:text-white'
              }`}
              title="Activar/Desactivar Lentes VR sobre los ojos"
            >
              <Glasses className="w-4 h-4" />
              <span>Lentes VR</span>
            </button>

            <button
              onClick={() =>
                setAccesorios((prev) => {
                  const next = !prev.hud;
                  showBanner(next ? '✨ HUD FUTURISTA ACTIVADO' : 'HUD DESACTIVADO');
                  return { ...prev, hud: next };
                })
              }
              aria-pressed={accesorios.hud}
              className={`px-3.5 py-2.5 rounded-xl font-display font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition-colors border ${
                accesorios.hud
                  ? 'bg-[#FF6B00]/25 border-[#FF6B00] text-[#FF6B00]'
                  : 'bg-white/5 border-white/10 text-white/55 hover:text-white'
              }`}
              title="Activar/Desactivar Escáner y Tarjeta HUD"
            >
              <Sparkles className="w-4 h-4" />
              <span>HUD</span>
            </button>
          </div>

          <button
            onClick={() => startPhotoCountdown('📸 CAPTURANDO MOMENTO UNIFRANZ...')}
            disabled={countdown !== null}
            className="w-full lg:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#FF5500] hover:from-[#FF7A1A] hover:to-[#FF6B00] text-black font-display font-black text-xs md:text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 animate-cta-pulse transition-transform active:scale-95 disabled:opacity-50"
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
