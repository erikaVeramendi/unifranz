/**
 * Configuración centralizada de ultra-baja latencia para UNIFRANZ AR Mirror Experience
 * Carrera Oficial: Ingeniería de Sistemas e Innovación Digital
 * Menciones Oficiales:
 *  - Inteligencia Artificial y Ciencia de Datos
 *  - Ciberseguridad y Blockchain
 */

export const AR_CONFIG = {
  // === 1. CÁMARA Y TRACKING DE ULTRA BAJA LATENCIA (ZERO LAG) ===
  CAMERA_IDEAL_WIDTH: 854, // 16:9 ligero (480p) -> reduce >60% la latencia en MediaPipe
  CAMERA_IDEAL_HEIGHT: 480,
  CAMERA_IDEAL_FPS: 60,

  // === 2. SOPORTE MULTI-ROSTRO Y MANOS (SIN POSELANDMARKER PESADO) ===
  MAX_PERSONS: 2,
  MAX_HANDS: 4,
  FACE_DETECTION_CONFIDENCE: 0.35,
  FACE_PRESENCE_CONFIDENCE: 0.35,
  FACE_TRACKING_CONFIDENCE: 0.35,
  PERSON_TIMEOUT_MS: 450,
  HAND_TIMEOUT_MS: 260,
  BODY_TRACK_MAX_DIST_NORM: 0.28,
  HAND_TRACK_MAX_DIST_NORM: 0.25,

  // === 3. FAST LERP (RESPUESTA INSTANTÁNEA SIN EFECTO ELÁSTICO) ===
  FAST_LERP_FACE: 0.72,
  FAST_LERP_HAND: 0.74,

  // === 4. VISOR OCULUS QUEST BLANCO PROCEDURAL ===
  VR_WIDTH_FACTOR: 2.15,
  VR_MAX_ROLL_RAD: 0.65,

  // === 5. PODERES INTERACTIVOS EN MANOS Y TECLADO HOLOGRÁFICO INFALIBLE ===
  NEURAL_SPHERE_RADIUS_FACTOR: 0.25,
  CYBER_SHIELD_RADIUS_FACTOR: 0.28,
  DUALSENSE_WIDTH_FACTOR: 0.56,
  KEYBOARD_WIDTH_FACTOR: 1.42,
  KEYBOARD_FADE_DURATION_MS: 300, // Desaparición suave en 0.3s
  ACCESSORY_SWITCH_COOLDOWN_MS: 1600,

  // === 6. MINIJUEGO AR: ¿QUÉ MENCIÓN DE SISTEMAS ERES? ===
  QUIZ_HEAD_TILT_THRESHOLD_RAD: 0.115,
  QUIZ_FILL_DURATION_MS: 1400,
};

// Nombres Oficiales Exactos de la Carrera y las 2 Menciones Oficiales
export const OFFICIAL_CAREER_NAME = 'Ingeniería de Sistemas e Innovación Digital';

export const OFFICIAL_MENTIONS = {
  IA: 'Inteligencia Artificial y Ciencia de Datos',
  CIBER: 'Ciberseguridad y Blockchain',
};

// Modos de Accesorios en el Rostro
export const ACCESSORY_MODES = [
  {
    id: 'OCULUS',
    label: '🥽 Visor Oculus Blanco',
    shortLabel: 'Visor Oculus',
    oculus: true,
    cyberHud: false,
  },
  {
    id: 'CYBER_HUD',
    label: '🎯 HUD Ciber-Ingeniero',
    shortLabel: 'HUD Ciber-Ingeniero',
    oculus: false,
    cyberHud: true,
  },
  {
    id: 'BOTH',
    label: '⚡ Oculus + HUD Ciber',
    shortLabel: 'Oculus + HUD',
    oculus: true,
    cyberHud: true,
  },
];

// Stack Oficial de Tecnologías con sus Colores Reales y Oficiales (Pre-renderizadas en OffscreenCanvas)
export const TECH_STACK_ITEMS = [
  {
    id: 'Python',
    name: 'Python',
    tag: 'IA',
    primaryColor: '#3776AB',
    secondaryColor: '#FFD43B',
    iconType: 'PYTHON',
  },
  {
    id: 'React',
    name: 'React',
    tag: 'IA',
    primaryColor: '#61DAFB',
    secondaryColor: '#20232A',
    iconType: 'REACT',
  },
  {
    id: 'Docker',
    name: 'Docker',
    tag: 'CIBER',
    primaryColor: '#2496ED',
    secondaryColor: '#FFFFFF',
    iconType: 'DOCKER',
  },
  {
    id: 'PostgreSQL',
    name: 'PostgreSQL',
    tag: 'IA',
    primaryColor: '#336791',
    secondaryColor: '#FFFFFF',
    iconType: 'POSTGRES',
  },
  {
    id: 'GitHub',
    name: 'GitHub',
    tag: 'CIBER',
    primaryColor: '#FFFFFF',
    secondaryColor: '#0A0A0A',
    iconType: 'GITHUB',
  },
  {
    id: 'Kali Linux',
    name: 'Kali Linux',
    tag: 'CIBER',
    primaryColor: '#367BF0',
    secondaryColor: '#FFFFFF',
    iconType: 'KALI',
  },
  {
    id: 'Ubuntu',
    name: 'Ubuntu',
    tag: 'CIBER',
    primaryColor: '#E95420',
    secondaryColor: '#FFFFFF',
    iconType: 'UBUNTU',
  },
  {
    id: 'Java',
    name: 'Java',
    tag: 'CORE',
    primaryColor: '#ED8B00',
    secondaryColor: '#5382A1',
    iconType: 'JAVA',
  },
  {
    id: 'C++',
    name: 'C++',
    tag: 'CIBER',
    primaryColor: '#00599C',
    secondaryColor: '#FFFFFF',
    iconType: 'CPP',
  },
  {
    id: 'C#',
    name: 'C#',
    tag: 'CORE',
    primaryColor: '#68217A',
    secondaryColor: '#FFFFFF',
    iconType: 'CSHARP',
  },
  {
    id: 'HTML5',
    name: 'HTML5',
    tag: 'CORE',
    primaryColor: '#E34F26',
    secondaryColor: '#FFFFFF',
    iconType: 'HTML5',
  },
  {
    id: 'Ruby',
    name: 'Ruby',
    tag: 'CORE',
    primaryColor: '#CC342D',
    secondaryColor: '#FFFFFF',
    iconType: 'RUBY',
  },
  {
    id: 'TensorFlow',
    name: 'TensorFlow',
    tag: 'IA',
    primaryColor: '#FF6F00',
    secondaryColor: '#FFA800',
    iconType: 'TENSORFLOW',
  },
  {
    id: 'Kubernetes',
    name: 'Kubernetes',
    tag: 'CIBER',
    primaryColor: '#326CE5',
    secondaryColor: '#FFFFFF',
    iconType: 'K8S',
  },
];

// Comandos que se escriben en vivo en la mini-terminal del Teclado Holográfico
export const TERMINAL_COMMANDS = [
  'npm run dev',
  'python ai_model.py',
  'docker build -t unifranz .',
  'git push origin nueva-malla',
];

export const SIS_QUIZ_QUESTIONS = [
  {
    id: 1,
    question: '¿Qué prefieres dominar?',
    leftOption: '🤖 Machine Learning & Ciencia de Datos',
    rightOption: '🛡️ Ciberseguridad & Redes Seguras',
  },
  {
    id: 2,
    question: 'Tu tecnología favorita:',
    leftOption: '⚡ Python, TensorFlow & Big Data',
    rightOption: '🔐 Kali Linux, Criptografía & Blockchain',
  },
  {
    id: 3,
    question: 'Tu misión en el futuro:',
    leftOption: '🧠 Crear Inteligencia Artificial',
    rightOption: '🕵️ Ethical Hacking & Contratos Inteligentes',
  },
];

export const ASSETS_PATHS = {
  logoPng: '/assets/logo-unifranz.png',
  logoSvg: '/assets/logo-unifranz.svg',
};
