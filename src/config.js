/**
 * Configuración centralizada para UNIFRANZ AR Mirror Experience
 * Inauguración 100% Nueva Malla Curricular: Ingeniería de Sistemas e Innovación Digital
 * (100% Renderizado Vectorial / Procedural en Canvas 2D — Cero PNGs de ropa o lentes)
 */

export const AR_CONFIG = {
  // === 1. RENDIMIENTO Y DETECCIÓN ===
  DETECTION_MAX_WIDTH: 640,
  DETECTION_MAX_HEIGHT: 480,
  DETECTION_STRIDE_FRAMES: 2,
  HAND_STRIDE_FRAMES: 2,

  // === 2. SOPORTE MULTI-PERSONA Y MANOS ===
  MAX_PERSONS: 4,
  MAX_HANDS: 4,
  VISIBILITY_THRESHOLD: 0.45,
  HIP_VISIBILITY_THRESHOLD: 0.25,
  FACE_DETECTION_CONFIDENCE: 0.3,
  FACE_PRESENCE_CONFIDENCE: 0.3,
  FACE_TRACKING_CONFIDENCE: 0.3,
  POSE_EYE_VISIBILITY_THRESHOLD: 0.35,
  PERSON_TIMEOUT_MS: 500,
  FACE_TIMEOUT_MS: 350,
  HAND_TIMEOUT_MS: 340,
  BODY_TRACK_MAX_DIST_NORM: 0.25,
  FACE_BODY_MAX_DIST_NORM: 0.28,
  HAND_TRACK_MAX_DIST_NORM: 0.22,

  // === 3. SUAVIZADO EXPONENCIAL ===
  SMOOTHING_PREV_WEIGHT: 0.6,
  SMOOTHING_NEW_WEIGHT: 0.4,

  // === 4. VISOR OCULUS QUEST BLANCO PROCEDURAL Y CORONA UNIFRANZ ===
  VR_WIDTH_FACTOR: 2.15,
  VR_WIDTH_FROM_EARS: 1.28,
  VR_WIDTH_FROM_SHOULDERS: 0.54,
  VR_MAX_ROLL_RAD: 0.65,
  CROWN_ELEVATION_FACTOR: 0.38,

  // === 5. PODERES INTERACTIVOS EN MANOS (SISTEMAS) ===
  NEURAL_SPHERE_RADIUS_FACTOR: 0.25,
  CYBER_SHIELD_RADIUS_FACTOR: 0.28,
  DUALSENSE_WIDTH_FACTOR: 0.48,
  KEYBOARD_WIDTH_FACTOR: 1.38,
  TRON_FUSION_DURATION_MS: 4000, // 4 segundos de Matriz Tron al fusionar ambas manos
  ACCESSORY_SWITCH_COOLDOWN_MS: 1800, // Cooldown al cambiar accesorio con gesto Paz ✌️

  // === 6. MINIJUEGO AR: ¿QUÉ MENCIÓN DE SISTEMAS ERES? (IA vs. Ciberseguridad) ===
  QUIZ_HEAD_TILT_THRESHOLD_RAD: 0.12,
  QUIZ_FILL_DURATION_MS: 1500,

  // === 7. CAPTURA POR SONRISA ===
  SMILE_HOLD_FRAMES: 14,
  PHOTO_TRIGGER_COOLDOWN_MS: 5500,
};

// Modos de Accesorios que se alternan con el Gesto de Paz (✌️) o desde el panel inferior
export const ACCESSORY_MODES = [
  {
    id: 'OCULUS',
    label: '🥽 Visor Oculus Blanco',
    shortLabel: 'Visor Oculus',
    oculus: true,
    crown: false,
    hackerHud: false,
  },
  {
    id: 'CROWN',
    label: '👑 Corona UNIFRANZ',
    shortLabel: 'Corona UNIFRANZ',
    oculus: false,
    crown: true,
    hackerHud: false,
  },
  {
    id: 'BOTH',
    label: '⚡ Ambos (Oculus + Corona)',
    shortLabel: 'Ambos',
    oculus: true,
    crown: true,
    hackerHud: false,
  },
  {
    id: 'HACKER_HUD',
    label: '💻 Modo Hacker HUD',
    shortLabel: 'Modo Hacker HUD',
    oculus: false,
    crown: false,
    hackerHud: true,
  },
];

export const SIS_QUIZ_QUESTIONS = [
  {
    id: 1,
    question: '¿Qué prefieres crear?',
    leftOption: '🤖 Modelos de IA que aprenden',
    rightOption: '🛡️ Escudos contra Hackers',
  },
  {
    id: 2,
    question: 'Tu herramienta favorita:',
    leftOption: '⚡ Redes Neuronales & Deep Learning',
    rightOption: '🔐 Criptografía & Firewall',
  },
  {
    id: 3,
    question: 'Tu misión en el futuro:',
    leftOption: '🧠 Automatización Inteligente',
    rightOption: '🕵️ Pentesting & Ciberseguridad',
  },
];

export const SISTEMAS_CAREER = {
  id: 'sistemas',
  shortName: 'Ing. de Sistemas',
  fullName: 'Ingeniería de Sistemas e Innovación Digital',
  profileTitle: 'PERFIL: Futuro Ingeniero de Sistemas',
  badge: 'NUEVA MALLA 2026 // SISTEMAS',
  hashtags: '#NuevaMallaSistemas #Unifranz',
  roles: [
    'Arquitecto de Inteligencia Artificial',
    'Especialista en Ciberseguridad & Pentesting',
    'Ingeniero Cloud & DevOps Global',
    'Lead Game Developer & XR Innovator',
  ],
};

export const ASSETS_PATHS = {
  logoPng: '/assets/logo-unifranz.png',
  logoSvg: '/assets/logo-unifranz.svg',
};
