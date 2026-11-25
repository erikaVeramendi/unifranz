/**
 * Configuración centralizada de constantes ajustables para UNIFRANZ AR Mirror.
 * Modifica estos valores para calibrar tamaño, posición, suavizado y rendimiento.
 */

export const AR_CONFIG = {
  // === 1. RENDIMIENTO Y DETECCIÓN ===
  DETECTION_MAX_WIDTH: 640, // Ancho máximo del frame enviado a MediaPipe (px)
  DETECTION_MAX_HEIGHT: 480, // Alto máximo del frame enviado a MediaPipe (px)
  DETECTION_STRIDE_FRAMES: 2, // Ejecutar Pose+Face cada N cuadros (2 = cuadros alternos)
  HAND_STRIDE_FRAMES: 2, // Ejecutar HandLandmarker en cuadros alternos a Pose+Face

  // === 2. SOPORTE MULTI-PERSONA Y MANOS ===
  MAX_PERSONS: 4, // Límite simultáneo de personas (numPoses y numFaces)
  MAX_HANDS: 4, // Límite simultáneo de manos detectadas (numHands)
  VISIBILITY_THRESHOLD: 0.5, // Umbral mínimo de visibilidad para hombros (ignorar si < 0.5)
  FACE_DETECTION_CONFIDENCE: 0.3, // Confianza mínima de FaceLandmarker para detectar caras lejanas
  FACE_PRESENCE_CONFIDENCE: 0.3, // Confianza mínima de presencia facial en FaceLandmarker
  FACE_TRACKING_CONFIDENCE: 0.3, // Confianza mínima de tracking facial en FaceLandmarker
  POSE_EYE_VISIBILITY_THRESHOLD: 0.35, // Umbral mínimo de visibilidad para ojos/orejas de Pose (respaldo VR lejano)
  PERSON_TIMEOUT_MS: 500, // Tiempo (ms) antes de eliminar el estado de una persona que desapareció
  FACE_TIMEOUT_MS: 350, // Tiempo (ms) antes de pasar a respaldo de Pose si FaceLandmarker pierde la cara
  HAND_TIMEOUT_MS: 320, // Tiempo (ms) para desvanecer suavemente la balanza/esfera si la mano sale de cuadro
  BODY_TRACK_MAX_DIST_NORM: 0.25, // Distancia máx. normalizada para asociar una persona entre cuadros
  FACE_BODY_MAX_DIST_NORM: 0.28, // Distancia máx. normalizada nariz-hombros para emparejar cara con cuerpo
  HAND_TRACK_MAX_DIST_NORM: 0.22, // Distancia máx. normalizada para asociar una mano entre cuadros

  // === 3. SUAVIZADO EXPONENCIAL (posición = anterior * 0.6 + nueva * 0.4) ===
  SMOOTHING_PREV_WEIGHT: 0.6,
  SMOOTHING_NEW_WEIGHT: 0.4, // Factor alpha aplicado a posición, escala y rotación

  // === 4. AJUSTE DE POLERA (anclada a hombros: landmarks 11 y 12) ===
  SHIRT_WIDTH_FACTOR: 1.7, // Ancho = distancia entre hombros * factor
  SHIRT_COLLAR_OFFSET_Y: 0.15, // Desplazamiento vertical del cuello sobre la línea de hombros (proporción de altura)
  SHIRT_MAX_TILT_RAD: 0.55, // Rotación máxima permitida (radianes)

  // === 5. AJUSTE DE LENTES VR (FaceLandmarker principal + respaldo Pose lejano) ===
  VR_WIDTH_FACTOR: 2.2, // Ancho con FaceLandmarker = distancia extremos exteriores de ojos (33-263) * factor
  VR_WIDTH_FROM_EARS: 1.3, // Ancho con respaldo Pose = distancia entre orejas (7-8) * factor
  VR_WIDTH_FROM_SHOULDERS: 0.55, // Ancho estimado con respaldo Pose si orejas no visibles = ancho hombros * factor
  VR_CENTER_Y_RATIO: 0.58, // Centro vertical del visor dentro de LENTES-VR.png (cubre solo ojos)
  VR_MAX_ROLL_RAD: 0.65, // Inclinación máxima permitida (radianes)

  // === 6. ELEMENTOS POR CARRERA (escala relativa al ancho de hombros) ===
  SCALES_SIZE_FACTOR: 0.26, // Balanza holográfica en mano (Derecho)
  SHIELD_RADIUS_FACTOR: 0.62, // Escudo LegalTech con 2 manos (Derecho)
  NEURAL_SPHERE_RADIUS_FACTOR: 0.24, // Esfera red neuronal en mano (Sistemas)
  FUSION_CORE_RADIUS_FACTOR: 0.36, // Núcleo fusión digital con 2 manos (Sistemas)
  DINO_PIXEL_FACTOR: 0.016, // Tamaño de píxel del Dino en hombro (Sistemas)

  // === 7. CAPTURA POR SONRISA / GESTO PAZ ===
  PEACE_OR_SMILE_HOLD_FRAMES: 8,
  PHOTO_TRIGGER_COOLDOWN_MS: 5500,
};

export const CAREERS = {
  derecho: {
    id: 'derecho',
    shortName: 'Derecho',
    fullName: 'Derecho, Justicia & Liderazgo Global',
    profileTitle: 'PERFIL: Futuro Abogado UNIFRANZ',
    badge: 'NUEVA MALLA 2026 // DER',
    shirtPath: '/assets/POLERA-DER.png',
    roles: [
      'Especialista en Derecho Digital & LegalTech',
      'Experto en Litigación Estratégica',
      'Consultor en Derecho Corporativo Global',
      'Defensor de Derechos Humanos & Tecnología',
    ],
  },
  sistemas: {
    id: 'sistemas',
    shortName: 'Ing. de Sistemas',
    fullName: 'Ingeniería de Sistemas e Innovación Digital',
    profileTitle: 'PERFIL: Futuro Ingeniero de Sistemas',
    badge: 'NUEVA MALLA 2026 // SIS',
    shirtPath: '/assets/POLERA-SIS.png',
    roles: [
      'Arquitecto de Inteligencia Artificial',
      'Ingeniero Cloud & DevOps',
      'Especialista en Ciberseguridad',
      'Líder en Innovación Digital',
    ],
  },
};

export const ASSETS_PATHS = {
  vrHeadset: '/assets/LENTES-VR.png',
  logoPng: '/assets/logo-unifranz.png',
  logoSvg: '/assets/logo-unifranz.svg',
};
