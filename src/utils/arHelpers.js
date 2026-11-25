// Renderizadores de Ultra-Alto Rendimiento (Zero-Lag) para UNIFRANZ AR Mirror Experience
// CERO ctx.shadowBlur, CERO ctx.filter y CERO creación de gradientes dentro de requestAnimationFrame.
// Todos los logos con sus colores oficiales y sprites luminosos se pre-renderizan en OffscreenCanvas al iniciar.
import {
  AR_CONFIG,
  TECH_STACK_ITEMS,
  TERMINAL_COMMANDS,
  OFFICIAL_MENTIONS,
} from '../config.js';

export const lerp = (start, end, factor) => start + (end - start) * factor;

export const lerpAngle = (a, b, t) => {
  const diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + diff * t;
};

export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

/**
 * Doble trazo neón ultra rápido SIN ctx.shadowBlur ni gradientes en tiempo real.
 */
function strokeNeonPath(
  ctx,
  coreColor = '#FF6B00',
  glowRgba = 'rgba(255, 107, 0, 0.34)',
  coreWidth = 2,
  glowWidth = 6
) {
  ctx.strokeStyle = glowRgba;
  ctx.lineWidth = glowWidth;
  ctx.stroke();
  ctx.strokeStyle = coreColor;
  ctx.lineWidth = coreWidth;
  ctx.stroke();
}

// ============================================================================
// 1. SPRITES PRE-CACHEADOS EN OFFSCREENCANVAS (HALOS Y LOGOS CON COLORES REALES OFICIALES)
// ============================================================================
const techSpriteCache = new Map();
let cachedOrangeGlowSprite = null;
let cachedWhiteCoreSprite = null;

function createOffscreen(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(w, h);
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Pre-genera los sprites radiales de luz una sola vez fuera del loop de animación.
 */
export function getPreRenderedGlowSprite(type = 'ORANGE') {
  if (type === 'ORANGE' && cachedOrangeGlowSprite) return cachedOrangeGlowSprite;
  if (type === 'WHITE' && cachedWhiteCoreSprite) return cachedWhiteCoreSprite;

  const S = 128;
  const half = S / 2;
  const sprite = createOffscreen(S, S);
  const sctx = sprite.getContext('2d');
  const grad = sctx.createRadialGradient(half, half, 4, half, half, half);

  if (type === 'WHITE') {
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
    grad.addColorStop(0.3, 'rgba(255, 140, 0, 0.65)');
    grad.addColorStop(0.65, 'rgba(255, 107, 0, 0.25)');
    grad.addColorStop(1, 'rgba(255, 107, 0, 0)');
    cachedWhiteCoreSprite = sprite;
  } else {
    grad.addColorStop(0, 'rgba(255, 107, 0, 0.65)');
    grad.addColorStop(0.5, 'rgba(255, 107, 0, 0.22)');
    grad.addColorStop(1, 'rgba(255, 107, 0, 0)');
    cachedOrangeGlowSprite = sprite;
  }

  sctx.fillStyle = grad;
  sctx.beginPath();
  sctx.arc(half, half, half, 0, Math.PI * 2);
  sctx.fill();
  return sprite;
}

/**
 * Dibuja cada logo vectorial con sus COLORES REALES Y OFICIALES (una sola vez al iniciar la app).
 */
function drawOfficialColorTechIcon(ctx, item) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (item.iconType) {
    case 'PYTHON': {
      // Python Oficial: Azul (#3776AB) arriba/izquierda y Amarillo (#FFD43B) abajo/derecha
      ctx.fillStyle = '#3776AB';
      ctx.beginPath();
      ctx.roundRect(-14, -16, 17, 14, 5);
      ctx.fill();
      ctx.fillStyle = '#FFD43B';
      ctx.beginPath();
      ctx.roundRect(-3, -1, 17, 14, 5);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-8, -11, 1.8, 0, Math.PI * 2);
      ctx.arc(8, 8, 1.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'REACT': {
      // React Oficial: Celeste (#61DAFB) sobre fondo oscuro
      ctx.strokeStyle = '#61DAFB';
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 3);
        ctx.beginPath();
        ctx.ellipse(0, -1, 17, 6.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#61DAFB';
      ctx.beginPath();
      ctx.arc(0, -1, 3.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'DOCKER': {
      // Docker Oficial: Celeste/Azul (#2496ED) y contenedores blancos (#FFFFFF)
      ctx.fillStyle = '#FFFFFF';
      [-10, -4, 2].forEach((gx) => {
        ctx.fillRect(gx, -7, 4.8, 4.5);
        ctx.fillRect(gx, -12.5, 4.8, 4.5);
      });
      ctx.fillRect(8, -7, 4.8, 4.5);

      ctx.fillStyle = '#2496ED';
      ctx.beginPath();
      ctx.moveTo(-16, -1);
      ctx.lineTo(13, -1);
      ctx.quadraticCurveTo(17, -4, 19, -8);
      ctx.quadraticCurveTo(17, 12, -2, 12);
      ctx.quadraticCurveTo(-16, 12, -16, -1);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-8, 4, 1.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'POSTGRES': {
      // PostgreSQL Oficial: Azul acero (#336791) y Blanco
      ctx.fillStyle = '#336791';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-13, -10);
      ctx.lineTo(-13, 6);
      ctx.quadraticCurveTo(0, 14, 13, 6);
      ctx.lineTo(13, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#336791';
      ctx.beginPath();
      ctx.ellipse(0, -10, 13, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-13, -2);
      ctx.quadraticCurveTo(0, 4, 13, -2);
      ctx.stroke();
      break;
    }
    case 'GITHUB': {
      // GitHub Oficial: Blanco y Negro de alto contraste
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, -1, 13, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0A0A0A';
      ctx.beginPath();
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
      ctx.moveTo(-8, -4);
      ctx.lineTo(-10, -11);
      ctx.lineTo(-3, -7);
      ctx.moveTo(8, -4);
      ctx.lineTo(10, -11);
      ctx.lineTo(3, -7);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-3.2, 0, 1.6, 0, Math.PI * 2);
      ctx.arc(3.2, 0, 1.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'KALI': {
      // Kali Linux Oficial: Azul Cian (#367BF0) y Blanco
      ctx.fillStyle = 'rgba(54, 123, 240, 0.28)';
      ctx.strokeStyle = '#367BF0';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(14, -10);
      ctx.lineTo(11, 6);
      ctx.lineTo(0, 14);
      ctx.lineTo(-11, 6);
      ctx.lineTo(-14, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 10px "Orbitron", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('KALI', 0, -1);
      break;
    }
    case 'UBUNTU': {
      // Ubuntu Oficial: Círculo Naranja (#E95420) y Nodos Blancos
      ctx.fillStyle = '#E95420';
      ctx.beginPath();
      ctx.arc(0, -1, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -1, 7.5, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
        const nx = Math.cos(a) * 11.2;
        const ny = -1 + Math.sin(a) * 11.2;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(nx, ny, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'JAVA': {
      // Java Oficial: Taza Azul (#5382A1) y Vapor Rojo/Naranja (#ED8B00)
      ctx.strokeStyle = '#5382A1';
      ctx.fillStyle = 'rgba(83, 130, 161, 0.35)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-10, -2);
      ctx.lineTo(8, -2);
      ctx.quadraticCurveTo(7, 10, -1, 10);
      ctx.quadraticCurveTo(-9, 10, -10, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(8, 3, 3.5, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();

      ctx.strokeStyle = '#ED8B00';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-4, -6);
      ctx.quadraticCurveTo(-1, -11, -4, -15);
      ctx.moveTo(2, -6);
      ctx.quadraticCurveTo(5, -11, 2, -15);
      ctx.stroke();
      break;
    }
    case 'CPP': {
      // C++ Oficial: Hexágono Azul (#00599C) con texto Blanco
      ctx.fillStyle = '#00599C';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const hx = Math.cos(a) * 15;
        const hy = -1 + Math.sin(a) * 15;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 11px "Orbitron", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C++', 0, -0.5);
      break;
    }
    case 'CSHARP': {
      // C# Oficial: Hexágono Morado (#68217A) con texto Blanco
      ctx.fillStyle = '#68217A';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const hx = Math.cos(a) * 15;
        const hy = -1 + Math.sin(a) * 15;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 12px "Orbitron", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C#', 0, -0.5);
      break;
    }
    case 'HTML5': {
      // HTML5 Oficial: Escudo Naranja (#E34F26) y Número 5 Blanco
      ctx.fillStyle = '#E34F26';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-13, -14);
      ctx.lineTo(13, -14);
      ctx.lineTo(10, 8);
      ctx.lineTo(0, 13);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 13px "Orbitron", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('5', 0, -1);
      break;
    }
    case 'RUBY': {
      // Ruby Oficial: Gema Rojo Rubí (#CC342D) con facetas blancas
      ctx.fillStyle = '#CC342D';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-8, -12);
      ctx.lineTo(8, -12);
      ctx.lineTo(15, -3);
      ctx.lineTo(0, 12);
      ctx.lineTo(-15, -3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-15, -3);
      ctx.lineTo(15, -3);
      ctx.moveTo(-8, -12);
      ctx.lineTo(0, 12);
      ctx.moveTo(8, -12);
      ctx.lineTo(0, 12);
      ctx.stroke();
      break;
    }
    case 'TENSORFLOW': {
      // TensorFlow Oficial: Naranja Ámbar (#FF6F00 / #FFA800)
      ctx.strokeStyle = '#FF6F00';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-11, -9);
      ctx.lineTo(11, -9);
      ctx.moveTo(-3, -9);
      ctx.lineTo(-3, 10);
      ctx.stroke();
      ctx.strokeStyle = '#FFA800';
      ctx.beginPath();
      ctx.moveTo(3, -3);
      ctx.lineTo(11, -3);
      ctx.moveTo(3, -9);
      ctx.lineTo(3, 10);
      ctx.stroke();
      break;
    }
    case 'K8S':
    default: {
      // Kubernetes Oficial: Azul (#326CE5) y Timón Blanco
      ctx.fillStyle = '#326CE5';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i * Math.PI * 2) / 7 - Math.PI / 2;
        const hx = Math.cos(a) * 15;
        const hy = -1 + Math.sin(a) * 15;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -1, 7, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const a = (i * Math.PI * 2) / 7 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(0, -1);
        ctx.lineTo(Math.cos(a) * 11, -1 + Math.sin(a) * 11);
        ctx.stroke();
      }
      break;
    }
  }

  ctx.restore();
}

/**
 * Pre-renderiza un badge hexagonal con los COLORES OFICIALES en un OffscreenCanvas de 112x112 px.
 * En el loop de 60 FPS solo se ejecuta ctx.drawImage(sprite, ...) -> 0% costo de CPU/GPU.
 */
export function getTechBadgeSprite(techItem) {
  if (techSpriteCache.has(techItem.id)) {
    return techSpriteCache.get(techItem.id);
  }

  const S = 112;
  const half = S / 2;
  const sprite = createOffscreen(S, S);
  const sctx = sprite.getContext('2d');

  // Halo suave con el color oficial de la tecnología (generado una sola vez al inicio)
  const halo = sctx.createRadialGradient(half, half, 14, half, half, half);
  halo.addColorStop(0, `${techItem.primaryColor}55`);
  halo.addColorStop(0.65, `${techItem.primaryColor}22`);
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sctx.fillStyle = halo;
  sctx.beginPath();
  sctx.arc(half, half, half, 0, Math.PI * 2);
  sctx.fill();

  // Hexágono oscuro #0A0A0A semitransparente con borde del color oficial
  const R = 43;
  sctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const hx = half + Math.cos(a) * R;
    const hy = half + Math.sin(a) * R;
    if (i === 0) sctx.moveTo(hx, hy);
    else sctx.lineTo(hx, hy);
  }
  sctx.closePath();
  sctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
  sctx.fill();

  sctx.strokeStyle = techItem.primaryColor;
  sctx.lineWidth = 2.6;
  sctx.stroke();

  // Ícono oficial a todo color
  sctx.save();
  sctx.translate(half, half - 7);
  drawOfficialColorTechIcon(sctx, techItem);
  sctx.restore();

  // Nombre nítido debajo
  sctx.fillStyle = '#FFFFFF';
  sctx.font = '800 9.5px "Orbitron", sans-serif';
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillText(techItem.name.toUpperCase(), half, half + 21);

  techSpriteCache.set(techItem.id, sprite);
  return sprite;
}

/**
 * Pre-genera todos los logos y halos al iniciar la aplicación.
 */
export function prewarmTechBadgeSprites() {
  getPreRenderedGlowSprite('ORANGE');
  getPreRenderedGlowSprite('WHITE');
  TECH_STACK_ITEMS.forEach((item) => getTechBadgeSprite(item));
}

// ============================================================================
// 2. ÓRBITA TECH 3D ALREDEDOR DEL ESTUDIANTE (0% GRADIENTES EN LOOP)
// ============================================================================
export function drawTechStackOrbit(ctx, person, activeMention = null, time = 0) {
  if (!person) return;

  let orbitPool = TECH_STACK_ITEMS;
  if (activeMention === 'IA') {
    const priority = ['Python', 'TensorFlow', 'React', 'PostgreSQL', 'Docker', 'GitHub', 'Kubernetes'];
    orbitPool = priority.map((id) => TECH_STACK_ITEMS.find((t) => t.id === id)).filter(Boolean);
  } else if (activeMention === 'CIBER') {
    const priority = ['Kali Linux', 'Ubuntu', 'Docker', 'C++', 'GitHub', 'Python', 'Kubernetes'];
    orbitPool = priority.map((id) => TECH_STACK_ITEMS.find((t) => t.id === id)).filter(Boolean);
  } else {
    orbitPool = TECH_STACK_ITEMS.slice(0, 8);
  }

  const count = orbitPool.length;
  const cx = person.shoulderCenterX;
  const cy = person.shoulderCenterY - person.shoulderWidth * 0.08;
  const rx = Math.max(150, person.shoulderWidth * 1.16);
  const ry = Math.max(85, person.torsoHeight * 0.45);
  const baseSize = clamp(person.shoulderWidth * 0.34, 58, 92);

  const nodes = [];
  for (let i = 0; i < count; i++) {
    const angle = time * 0.00085 + (i * Math.PI * 2) / count;
    const depth = Math.sin(angle);
    const ix = cx + Math.cos(angle) * rx;
    const iy = cy + Math.sin(angle) * ry * 0.52 + Math.cos(angle * 2) * 12;
    const scale = 0.72 + (depth + 1) * 0.22;
    const alpha = clamp(0.45 + (depth + 1) * 0.28, 0.38, 0.98);
    nodes.push({ item: orbitPool[i], ix, iy, depth, scale, alpha });
  }

  nodes.sort((a, b) => a.depth - b.depth);

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const sprite = getTechBadgeSprite(n.item);
    const drawSize = baseSize * n.scale;

    ctx.save();
    ctx.globalAlpha = n.alpha;
    ctx.drawImage(sprite, n.ix - drawSize / 2, n.iy - drawSize / 2, drawSize, drawSize);
    ctx.restore();
  }
}

// ============================================================================
// 3. PROYECCIÓN HOLOGRÁFICA DE LOS TÍTULOS EXACTOS DE LAS 2 MENCIONES OFICIALES AL ACTIVAR PODERES
// ============================================================================
export function drawFloatingMentionTitleHUD(ctx, x, y, mentionTitle, isFusionBoth = false) {
  ctx.save();

  if (isFusionBoth) {
    // Al juntar ambas manos, proyecta limpiamente los dos títulos oficiales arriba del núcleo
    const titles = [OFFICIAL_MENTIONS.IA, OFFICIAL_MENTIONS.CIBER];
    titles.forEach((title, idx) => {
      const ty = y - 105 - idx * 42;
      const bw = 390;
      const bh = 34;

      ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
      ctx.beginPath();
      ctx.roundRect(x - bw / 2, ty - bh / 2, bw, bh, 17);
      ctx.fill();
      strokeNeonPath(ctx, idx === 0 ? '#FF6B00' : '#FFFFFF', 'rgba(255, 107, 0, 0.35)', 2, 5);

      ctx.fillStyle = idx === 0 ? '#FF6B00' : '#FFFFFF';
      ctx.font = '800 12.5px "Orbitron", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, x, ty);
    });
  } else {
    // Sobre la mano activa proyecta únicamente el título oficial de esa mención
    const bw = 375;
    const bh = 34;
    const ty = y - 82;

    ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
    ctx.beginPath();
    ctx.roundRect(x - bw / 2, ty - bh / 2, bw, bh, 17);
    ctx.fill();
    strokeNeonPath(ctx, '#FF6B00', 'rgba(255, 107, 0, 0.38)', 2, 5);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 12px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mentionTitle, x, ty);
  }

  ctx.restore();
}

// ============================================================================
// 4. VISOR OCULUS QUEST BLANCO FUTURISTA (CERO GRADIENTES EN LOOP, 100% COLORES SÓLIDOS 3D)
// ============================================================================
export function drawProceduralWhiteOculusQuest(
  ctx,
  centerX,
  centerY,
  width,
  rollAngle = 0,
  yaw = 0,
  time = 0
) {
  const W = Math.max(80, width);
  const H = W * 0.46;
  const hw = W / 2;
  const hh = H / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rollAngle);

  const yawShift = clamp(yaw || 0, -0.6, 0.6) * W * 0.06;

  const traceVisorPath = (scale = 1, offsetX = 0, offsetY = 0) => {
    const sw = hw * scale;
    const sh = hh * scale;
    const noseW = sw * 0.24;
    const noseDepth = sh * 0.34;

    ctx.beginPath();
    ctx.moveTo(offsetX - sw * 0.72, offsetY - sh);
    ctx.lineTo(offsetX + sw * 0.72, offsetY - sh);
    ctx.bezierCurveTo(
      offsetX + sw * 0.98,
      offsetY - sh,
      offsetX + sw,
      offsetY - sh * 0.62,
      offsetX + sw,
      offsetY
    );
    ctx.bezierCurveTo(
      offsetX + sw,
      offsetY + sh * 0.78,
      offsetX + sw * 0.88,
      offsetY + sh,
      offsetX + noseW * 1.45,
      offsetY + sh
    );
    ctx.bezierCurveTo(
      offsetX + noseW * 0.75,
      offsetY + sh,
      offsetX + noseW * 0.55,
      offsetY + sh - noseDepth,
      offsetX,
      offsetY + sh - noseDepth
    );
    ctx.bezierCurveTo(
      offsetX - noseW * 0.55,
      offsetY + sh - noseDepth,
      offsetX - noseW * 0.75,
      offsetY + sh,
      offsetX - noseW * 1.45,
      offsetY + sh
    );
    ctx.bezierCurveTo(
      offsetX - sw * 0.88,
      offsetY + sh,
      offsetX - sw,
      offsetY + sh * 0.78,
      offsetX - sw,
      offsetY
    );
    ctx.bezierCurveTo(
      offsetX - sw,
      offsetY - sh * 0.62,
      offsetX - sw * 0.98,
      offsetY - sh,
      offsetX - sw * 0.72,
      offsetY - sh
    );
    ctx.closePath();
  };

  // A. Bisagras laterales blancas/grises (SIN correa superior)
  [-1, 1].forEach((side) => {
    const hx = side * (hw * 0.96);
    const armW = W * 0.11;
    const armH = H * 0.42;

    ctx.fillStyle = '#E2E8F0';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(
      side < 0 ? hx - armW * 0.85 : hx - armW * 0.15,
      -armH * 0.48,
      armW,
      armH,
      armH * 0.35
    );
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FF6B00';
    ctx.beginPath();
    ctx.roundRect(
      side < 0 ? hx - armW * 0.55 : hx + armW * 0.15,
      -armH * 0.22,
      armW * 0.24,
      armH * 0.44,
      3
    );
    ctx.fill();
  });

  // B. Almohadilla facial interna en negro mate (#111111)
  traceVisorPath(1.06, 0, H * 0.05);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.fill();

  traceVisorPath(1.03, 0, H * 0.03);
  ctx.fillStyle = '#111111';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.5)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // C. Cuerpo principal exterior blanco minimalista con volumen 3D por capas sólidas
  traceVisorPath(1.0, yawShift * 0.35, 0);
  ctx.fillStyle = '#E2E8F0';
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();

  traceVisorPath(0.95, yawShift * 0.42, -H * 0.02);
  ctx.fillStyle = '#F8FAFC';
  ctx.fill();

  // D. Placa frontal curva blanca con reflejo holográfico animado
  ctx.save();
  traceVisorPath(0.86, yawShift * 0.55, -H * 0.015);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.clip();

  const sweepPos = ((time * 0.00075) % 1.8) - 0.9;
  const sweepX = sweepPos * W;
  ctx.fillStyle = 'rgba(255, 107, 0, 0.14)';
  ctx.fillRect(sweepX - W * 0.14, -hh, W * 0.28, H);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillRect(sweepX - W * 0.04, -hh, W * 0.08, H);

  ctx.font = `700 ${Math.max(7, Math.round(H * 0.13))}px "Orbitron", monospace`;
  ctx.fillStyle = 'rgba(255, 107, 0, 0.28)';
  ctx.textAlign = 'center';
  ctx.fillText(
    '0101 // AI.SYS // UNIFRANZ.XR // 1010',
    yawShift + Math.sin(time * 0.002) * 14,
    H * 0.06
  );
  ctx.restore();

  traceVisorPath(0.86, yawShift * 0.55, -H * 0.015);
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.65)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // E. Las 4 Micro-Cámaras de Rastreo en las esquinas
  const camPositions = [
    { x: -hw * 0.74 + yawShift * 0.3, y: -hh * 0.56 },
    { x: hw * 0.74 + yawShift * 0.3, y: -hh * 0.56 },
    { x: -hw * 0.72 + yawShift * 0.3, y: hh * 0.52 },
    { x: hw * 0.72 + yawShift * 0.3, y: hh * 0.52 },
  ];
  const camR = clamp(W * 0.038, 4, 9);

  camPositions.forEach((cam) => {
    ctx.fillStyle = 'rgba(255, 107, 0, 0.28)';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, camR * 1.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0A0A0A';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, camR * 1.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FF6B00';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, camR * 0.72, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cam.x - camR * 0.22, cam.y - camR * 0.22, camR * 0.26, 0, Math.PI * 2);
    ctx.fill();
  });

  // F. Grabado central superior "UNIFRANZ XR"
  ctx.font = `900 ${clamp(Math.round(W * 0.062), 8, 14)}px "Orbitron", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0A0A0A';
  ctx.fillText('UNIFRANZ', yawShift * 0.5 - W * 0.055, -hh * 0.52);
  ctx.fillStyle = '#FF6B00';
  ctx.fillText('XR', yawShift * 0.5 + W * 0.165, -hh * 0.52);

  ctx.restore();
}

// ============================================================================
// 5. MODO HUD CIBER-INGENIERO (CERO GRADIENTES EN LOOP)
// ============================================================================
export function drawCyberEngineerFacialHUD(ctx, person, time = 0) {
  const rightEyeX = person.rightEyeX ?? person.vrCenterX - person.vrWidth * 0.22;
  const rightEyeY = person.rightEyeY ?? person.vrCenterY;
  const leftEyeX = person.leftEyeX ?? person.vrCenterX + person.vrWidth * 0.22;
  const leftEyeY = person.leftEyeY ?? person.vrCenterY;
  const radius = clamp(person.vrWidth * 0.22, 20, 46);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const fx = person.foreheadX ?? person.vrCenterX;
  const fy = person.foreheadY ?? person.vrCenterY - person.vrWidth * 0.32;
  const cx = person.chinX ?? person.vrCenterX;
  const cy = person.chinY ?? person.vrCenterY + person.vrWidth * 0.55;

  ctx.strokeStyle = 'rgba(255, 107, 0, 0.38)';
  ctx.lineWidth = 1.3;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(rightEyeX, rightEyeY);
  ctx.lineTo(cx, cy);
  ctx.lineTo(leftEyeX, leftEyeY);
  ctx.closePath();
  ctx.moveTo(rightEyeX, rightEyeY);
  ctx.lineTo(leftEyeX, leftEyeY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.save();
  ctx.translate(rightEyeX, rightEyeY);
  ctx.rotate(person.vrAngle);

  ctx.fillStyle = 'rgba(255, 107, 0, 0.2)';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate(time * 0.0028);
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2.2;
  ctx.setLineDash([12, 6, 4, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.56, 0, Math.PI * 2);
  ctx.moveTo(-radius * 1.25, 0);
  ctx.lineTo(-radius * 0.68, 0);
  ctx.moveTo(radius * 0.68, 0);
  ctx.lineTo(radius * 1.15, 0);
  ctx.stroke();

  const sideX = -radius * 1.32;
  ctx.fillStyle = '#FF6B00';
  for (let b = 0; b < 4; b++) {
    const barW = (0.4 + Math.abs(Math.sin(time * 0.005 + b * 1.1)) * 0.7) * radius * 0.85;
    ctx.fillRect(sideX - barW, -radius * 0.45 + b * 8, barW, 4);
  }
  ctx.font = '700 8.5px "Orbitron", monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'right';
  ctx.fillText(`SYS.ENG // ${Math.round(95 + Math.sin(time * 0.004) * 4)}%`, sideX, -radius * 0.62);
  ctx.restore();

  ctx.save();
  ctx.translate(leftEyeX, leftEyeY);
  ctx.rotate(person.vrAngle);
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.7)';
  ctx.lineWidth = 1.5;
  const r2 = radius * 0.65;
  ctx.beginPath();
  ctx.arc(0, 0, r2, -0.4, 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r2, Math.PI - 0.4, Math.PI + 0.8);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// ============================================================================
// 6. MANDO PLAYSTATION DUALSENSE HOLOGRÁFICO (CERO GRADIENTES EN LOOP)
// ============================================================================
export function drawProceduralDualSenseController(
  ctx,
  x,
  y,
  width = 95,
  tiltAngle = 0,
  time = 0,
  isGrabbed = false,
  opacity = 1
) {
  if (opacity <= 0.02) return;
  const W = Math.max(58, width);
  const H = W * 0.66;
  const hw = W / 2;
  const hh = H / 2;

  const vibX = isGrabbed ? Math.sin(time * 0.08) * 2.2 : 0;
  const vibY = isGrabbed ? Math.cos(time * 0.09) * 1.8 : Math.sin(time * 0.004) * 4;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x + vibX, y + vibY);
  ctx.rotate(tiltAngle);

  if (isGrabbed) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let r = 0; r < 2; r++) {
      const waveProg = (time * 0.0022 + r * 0.5) % 1;
      const waveRad = W * (0.45 + waveProg * 0.55);
      ctx.strokeStyle = `rgba(255, 107, 0, ${(1 - waveProg) * 0.72})`;
      ctx.lineWidth = 2.4 * (1 - waveProg);
      ctx.beginPath();
      ctx.arc(0, 0, waveRad, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.moveTo(-hw * 0.42, -hh * 0.72);
  ctx.lineTo(hw * 0.42, -hh * 0.72);
  ctx.bezierCurveTo(hw * 0.78, -hh * 0.72, hw * 0.96, -hh * 0.35, hw * 0.98, hh * 0.15);
  ctx.bezierCurveTo(hw * 1.0, hh * 0.65, hw * 0.85, hh * 0.98, hw * 0.66, hh * 0.95);
  ctx.bezierCurveTo(hw * 0.5, hh * 0.92, hw * 0.44, hh * 0.38, hw * 0.28, hh * 0.22);
  ctx.lineTo(-hw * 0.28, hh * 0.22);
  ctx.bezierCurveTo(-hw * 0.44, hh * 0.38, -hw * 0.5, hh * 0.92, -hw * 0.66, hh * 0.95);
  ctx.bezierCurveTo(-hw * 0.85, hh * 0.98, -hw * 1.0, hh * 0.65, -hw * 0.98, hh * 0.15);
  ctx.bezierCurveTo(-hw * 0.96, -hh * 0.35, -hw * 0.78, -hh * 0.72, -hw * 0.42, -hh * 0.72);
  ctx.closePath();
  ctx.fill();
  strokeNeonPath(ctx, '#FF6B00', 'rgba(255, 107, 0, 0.35)', 2, 5.5);

  ctx.fillStyle = '#0A0A0A';
  ctx.beginPath();
  ctx.moveTo(-hw * 0.45, -hh * 0.1);
  ctx.lineTo(hw * 0.45, -hh * 0.1);
  ctx.lineTo(hw * 0.65, hh * 0.82);
  ctx.bezierCurveTo(hw * 0.55, hh * 0.72, hw * 0.45, hh * 0.24, hw * 0.26, hh * 0.22);
  ctx.lineTo(-hw * 0.26, hh * 0.22);
  ctx.bezierCurveTo(-hw * 0.45, hh * 0.24, -hw * 0.55, hh * 0.72, -hw * 0.65, hh * 0.82);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1E293B';
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-hw * 0.34, -hh * 0.68, hw * 0.68, hh * 0.48, 5);
  ctx.fill();
  ctx.stroke();

  const stickR = W * 0.085;
  [-hw * 0.28, hw * 0.28].forEach((sx) => {
    ctx.fillStyle = '#0A0A0A';
    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(sx, hh * 0.05, stickR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  const dpadX = -hw * 0.58;
  const dpadY = -hh * 0.24;
  const dSize = W * 0.055;
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(dpadX - dSize * 1.4, dpadY - dSize * 0.45, dSize * 2.8, dSize * 0.9);
  ctx.fillRect(dpadX - dSize * 0.45, dpadY - dSize * 1.4, dSize * 0.9, dSize * 2.8);

  const btnX = hw * 0.58;
  const btnY = -hh * 0.24;
  const btnSpread = W * 0.095;
  ctx.font = `900 ${Math.max(8, Math.round(W * 0.095))}px "Orbitron", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const psSymbols = [
    { sym: '△', dx: 0, dy: -btnSpread, color: '#FF6B00' },
    { sym: '○', dx: btnSpread, dy: 0, color: '#FFFFFF' },
    { sym: '✕', dx: 0, dy: btnSpread, color: '#FF6B00' },
    { sym: '□', dx: -btnSpread, dy: 0, color: '#FFFFFF' },
  ];

  psSymbols.forEach((b) => {
    ctx.fillStyle = '#0A0A0A';
    ctx.beginPath();
    ctx.arc(btnX + b.dx, btnY + b.dy, W * 0.052, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = b.color;
    ctx.fillText(b.sym, btnX + b.dx, btnY + b.dy + 0.5);
  });

  ctx.restore();
}

// ============================================================================
// 7. TECLADO HOLOGRÁFICO ESTRICTO + TERMINAL FLOTANTE EN VIVO (CERO GRADIENTES EN LOOP)
// ============================================================================
export function drawHolographicKeyboardAndTerminal(
  ctx,
  centerX,
  centerY,
  width,
  fingerTips = [],
  typedCharsCount = 0,
  opacity = 1,
  onKeyHitCallback = null
) {
  if (opacity <= 0.02) return;
  const W = clamp(width, 290, 560);
  const H = W * 0.26;
  const left = centerX - W / 2;
  const top = centerY - H / 2;

  ctx.save();
  ctx.globalAlpha = opacity;

  const termW = W * 0.92;
  const termH = 92;
  const termX = centerX - termW / 2;
  const termY = top - termH - 14;

  ctx.fillStyle = 'rgba(10, 10, 10, 0.92)';
  ctx.beginPath();
  ctx.roundRect(termX, termY, termW, termH, 10);
  ctx.fill();
  strokeNeonPath(ctx, '#FF6B00', 'rgba(255, 107, 0, 0.35)', 1.8, 5);

  ctx.fillStyle = 'rgba(255, 107, 0, 0.22)';
  ctx.beginPath();
  ctx.roundRect(termX, termY, termW, 20, [10, 10, 0, 0]);
  ctx.fill();

  ['#FF6B00', '#FFFFFF', '#FF6B00'].forEach((c, idx) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(termX + 12 + idx * 11, termY + 10, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 9px "Orbitron", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('unifranz@sistemas-dev:~/nueva-malla-2026$', termX + 50, termY + 13);

  ctx.font = '700 11px "Space Grotesk", monospace';
  const totalCycleChars = TERMINAL_COMMANDS.reduce((acc, cmd) => acc + cmd.length + 12, 0);
  const currentTotal = Math.floor(typedCharsCount) % totalCycleChars;

  let rem = currentTotal;
  let activeLineIdx = 0;
  for (let i = 0; i < TERMINAL_COMMANDS.length; i++) {
    const len = TERMINAL_COMMANDS[i].length + 12;
    if (rem < len) {
      activeLineIdx = i;
      break;
    }
    rem -= len;
  }

  const prevCmd =
    TERMINAL_COMMANDS[(activeLineIdx + TERMINAL_COMMANDS.length - 1) % TERMINAL_COMMANDS.length];
  const activeCmd = TERMINAL_COMMANDS[activeLineIdx].slice(0, Math.max(1, rem));

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText(`$ ${prevCmd}  [OK]`, termX + 14, termY + 42);

  ctx.fillStyle = '#FF6B00';
  ctx.fillText(`$ `, termX + 14, termY + 66);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`${activeCmd}█`, termX + 28, termY + 66);

  ctx.fillStyle = 'rgba(10, 10, 10, 0.88)';
  ctx.beginPath();
  ctx.roundRect(left, top, W, H, 14);
  ctx.fill();
  strokeNeonPath(ctx, '#FF6B00', 'rgba(255, 107, 0, 0.38)', 2.2, 6);

  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '{}'],
    ['AI', 'Z', 'X', 'C', 'V', 'SPACE // DEPLOY', 'B', 'N', '/>'],
  ];

  const padX = 10;
  const padY = 10;
  const availH = H - padY * 2;
  const rowH = availH / 3;

  rows.forEach((rowKeys, rIdx) => {
    const numKeys = rowKeys.length;
    const availW = W - padX * 2;
    const keyW = availW / numKeys;

    rowKeys.forEach((kLabel, kIdx) => {
      const kx = left + padX + kIdx * keyW + 2;
      const ky = top + padY + rIdx * rowH + 2;
      const kw = keyW - 4;
      const kh = rowH - 4;
      const kCenterX = kx + kw / 2;
      const kCenterY = ky + kh / 2;

      let isPressed = false;
      for (let f = 0; f < fingerTips.length; f++) {
        const ft = fingerTips[f];
        if (Math.abs(ft.x - kCenterX) < kw * 0.65 && Math.abs(ft.y - kCenterY) < kh * 0.9) {
          isPressed = true;
          break;
        }
      }

      if (isPressed && onKeyHitCallback && Math.random() < 0.12) {
        onKeyHitCallback(kCenterX, ky);
      }

      ctx.fillStyle = isPressed ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = isPressed ? '#FF6B00' : 'rgba(255, 107, 0, 0.55)';
      ctx.lineWidth = isPressed ? 2 : 1.1;

      ctx.beginPath();
      ctx.roundRect(kx, ky, kw, kh, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isPressed ? '#0A0A0A' : '#FFFFFF';
      ctx.font = `800 ${Math.max(8, Math.round(kh * 0.34))}px "Orbitron", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(kLabel, kCenterX, kCenterY);
    });
  });

  ctx.restore();
}

// ============================================================================
// 8. SUPERPODERES EN LAS MANOS CON PROYECCIÓN DE TÍTULOS OFICIALES DE MENCIONES
// ============================================================================

export function drawNeuralBinarySphere(
  ctx,
  x,
  y,
  radius = 48,
  time = 0,
  opacity = 1,
  oculusTarget = null
) {
  if (opacity <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'lighter';

  if (oculusTarget) {
    const tx = oculusTarget.x;
    const ty = oculusTarget.y;
    const midX = (x + tx) / 2 + Math.sin(time * 0.005) * 24;
    const midY = (y + ty) / 2 - 22;

    ctx.strokeStyle = 'rgba(255, 107, 0, 0.5)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(midX, midY, tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Usar el sprite radial pre-cacheado (cero createRadialGradient en el loop)
  const glowSprite = getPreRenderedGlowSprite('WHITE');
  const glowDiam = radius * 2.5;
  ctx.drawImage(glowSprite, x - glowDiam / 2, y - glowDiam / 2, glowDiam, glowDiam);

  ctx.translate(x, y);

  const nodeCount = 10;
  const nodes = [];
  const rotY = time * 0.0026;
  const rotX = time * 0.0018;

  for (let i = 0; i < nodeCount; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / nodeCount);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i + rotY;

    const nx = Math.sin(phi) * Math.cos(theta);
    const ny = Math.sin(phi) * Math.sin(theta) * Math.cos(rotX) - Math.cos(phi) * Math.sin(rotX);
    const nz = Math.sin(phi) * Math.sin(theta) * Math.sin(rotX) + Math.cos(phi) * Math.cos(rotX);

    nodes.push({
      x: nx * radius * 0.85,
      y: ny * radius * 0.85,
      z: nz,
      bit: i % 3 === 0 ? 'AI' : i % 2 === 0 ? '1' : '0',
    });
  }

  ctx.lineWidth = 1.2;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (dist < radius * 0.82) {
        const alpha = clamp((nodes[i].z + nodes[j].z + 2) * 0.22, 0.12, 0.72);
        ctx.strokeStyle =
          i % 2 === 0
            ? `rgba(255, 107, 0, ${alpha})`
            : `rgba(255, 255, 255, ${alpha * 0.75})`;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }
  }

  ctx.font = '800 10px "Orbitron", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    ctx.fillStyle = n.z > 0 ? '#FFFFFF' : '#FF6B00';
    ctx.fillText(n.bit, n.x, n.y);
  }

  ctx.restore();

  // Proyectar únicamente el título oficial de la Mención 1
  drawFloatingMentionTitleHUD(ctx, x, y, OFFICIAL_MENTIONS.IA, false);
}

export function drawCybersecurityHandShield(ctx, x, y, radius = 54, time = 0, opacity = 1) {
  if (opacity <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'lighter';

  const glowSprite = getPreRenderedGlowSprite('ORANGE');
  const glowDiam = radius * 2.4;
  ctx.drawImage(glowSprite, x - glowDiam / 2, y - glowDiam / 2, glowDiam, glowDiam);

  ctx.translate(x, y);

  const pulse = 1 + Math.sin(time * 0.008) * 0.05;
  const R = radius * pulse;

  const traceHex = (rad) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const hx = Math.cos(a) * rad;
      const hy = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
  };

  ctx.save();
  ctx.rotate(time * 0.0022);
  traceHex(R);
  ctx.fillStyle = 'rgba(255, 107, 0, 0.22)';
  ctx.fill();
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.rotate(-time * 0.0018);
  traceHex(R * 0.78);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([10, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  const lockW = R * 0.38;
  const lockH = R * 0.32;
  ctx.strokeStyle = '#FFFFFF';
  ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(0, -lockH * 0.35, lockW * 0.34, Math.PI, 0, false);
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(-lockW / 2, -lockH * 0.35, lockW, lockH, 4);
  ctx.fill();
  ctx.strokeStyle = '#FF6B00';
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, -lockH * 0.02, 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Proyectar únicamente el título oficial de la Mención 2
  drawFloatingMentionTitleHUD(ctx, x, y, OFFICIAL_MENTIONS.CIBER, false);
}

export function drawDigitalFusionCore(ctx, x, y, radius = 82, time = 0, opacity = 1) {
  if (opacity <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'lighter';

  const pulse = 1 + Math.sin(time * 0.015) * 0.12;
  const r = radius * pulse;

  const glowSprite = getPreRenderedGlowSprite('WHITE');
  const glowDiam = r * 3.0;
  ctx.drawImage(glowSprite, x - glowDiam / 2, y - glowDiam / 2, glowDiam, glowDiam);

  ctx.translate(x, y);

  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate(time * (0.004 + i * 0.002) * (i % 2 === 0 ? 1 : -1));
    ctx.strokeStyle = i === 0 ? '#FFFFFF' : '#FF6B00';
    ctx.lineWidth = 2.8 - i * 0.5;
    ctx.setLineDash([18, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, r * (0.65 + i * 0.2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  // Al juntar las manos, proyecta limpiamente los dos títulos oficiales de las menciones
  drawFloatingMentionTitleHUD(ctx, x, y, '', true);
}

// ============================================================================
// 9. MINIJUEGO AR: HUD FLOTANTE "¿QUÉ MENCIÓN DE SISTEMAS ERES?"
// ============================================================================
export function drawHeadTiltQuizHUD(
  ctx,
  person,
  questionObj,
  questionIdx,
  totalQuestions,
  tiltChoice,
  fillProgress,
  W,
  H
) {
  if (!person || !questionObj) return;

  const headTopY =
    (person.foreheadY ?? person.vrCenterY - person.vrWidth * 0.4) -
    (person.faceHeight || person.vrWidth * 0.85) * 0.55;

  const panelW = clamp(W * 0.5, 350, 610);
  const panelH = 136;
  const cx = clamp(
    person.vrCenterX || person.shoulderCenterX,
    panelW / 2 + 16,
    W - panelW / 2 - 16
  );
  const cy = clamp(headTopY - panelH * 0.65, 88, H * 0.42);

  ctx.save();

  ctx.strokeStyle = 'rgba(255, 107, 0, 0.75)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(person.vrCenterX || cx, headTopY + 18);
  ctx.lineTo(cx, cy + panelH);
  ctx.stroke();
  ctx.setLineDash([]);

  const left = cx - panelW / 2;
  const top = cy;
  ctx.fillStyle = 'rgba(10, 10, 10, 0.92)';
  ctx.beginPath();
  ctx.roundRect(left, top, panelW, panelH, 16);
  ctx.fill();
  strokeNeonPath(ctx, '#FF6B00', 'rgba(255, 107, 0, 0.35)', 2.2, 6);

  ctx.fillStyle = '#FF6B00';
  ctx.beginPath();
  ctx.roundRect(left, top, panelW, 28, [16, 16, 0, 0]);
  ctx.fill();

  ctx.fillStyle = '#0A0A0A';
  ctx.font = '900 11px "Orbitron", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `🎮 TEST AR DE MENCIÓN (${questionIdx + 1}/${totalQuestions}) • INCLINA TU CABEZA ⬅️ ➡️`,
    cx,
    top + 18
  );

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 15.5px "Orbitron", sans-serif';
  ctx.fillText(questionObj.question.toUpperCase(), cx, top + 52);

  const optW = (panelW - 36) / 2;
  const optH = 58;
  const optY = top + 66;
  const leftOptX = left + 12;
  const rightOptX = left + 24 + optW;

  const drawOptionBox = (bx, label, sideKey, arrowText) => {
    const isSelected = tiltChoice === sideKey;
    const progress = isSelected ? clamp(fillProgress, 0, 1) : 0;

    ctx.save();
    ctx.fillStyle = isSelected ? 'rgba(255, 107, 0, 0.22)' : 'rgba(255, 255, 255, 0.06)';
    ctx.strokeStyle = isSelected ? '#FFFFFF' : 'rgba(255, 107, 0, 0.55)';
    ctx.lineWidth = isSelected ? 2.4 : 1.4;
    ctx.beginPath();
    ctx.roundRect(bx, optY, optW, optH, 10);
    ctx.fill();

    if (progress > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bx, optY, optW, optH, 10);
      ctx.clip();
      ctx.fillStyle = 'rgba(255, 107, 0, 0.85)';
      ctx.fillRect(bx, optY, optW * progress, optH);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.roundRect(bx, optY, optW, optH, 10);
    ctx.stroke();

    ctx.fillStyle = isSelected ? '#FFFFFF' : '#FF6B00';
    ctx.font = '800 9.5px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(arrowText, bx + optW / 2, optY + 18);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 11.5px "Space Grotesk", sans-serif';
    ctx.fillText(label, bx + optW / 2, optY + 40);

    ctx.restore();
  };

  drawOptionBox(leftOptX, questionObj.leftOption, 'LEFT', '⬅️ INCLINA A LA IZQUIERDA');
  drawOptionBox(rightOptX, questionObj.rightOption, 'RIGHT', 'INCLINA A LA DERECHA ➡️');

  ctx.restore();
}

/**
 * Muestra sobre el estudiante únicamente el título oficial exacto de la mención asignada.
 */
export function drawQuizResultEffects(ctx, person, winnerKey, W, H) {
  if (!person || !winnerKey) return;

  const officialTitle =
    winnerKey === 'IA' ? OFFICIAL_MENTIONS.IA : OFFICIAL_MENTIONS.CIBER;

  const badgeW = 420;
  const badgeH = 44;
  const bx = clamp(person.shoulderCenterX - badgeW / 2, 16, W - badgeW - 16);
  const by = clamp(
    (person.foreheadY ?? person.vrCenterY - person.vrWidth * 0.4) - 82,
    84,
    H - 180
  );

  ctx.save();
  ctx.fillStyle = 'rgba(10, 10, 10, 0.94)';
  ctx.beginPath();
  ctx.roundRect(bx, by, badgeW, badgeH, 22);
  ctx.fill();
  strokeNeonPath(ctx, '#FF6B00', 'rgba(255, 107, 0, 0.42)', 2.4, 6);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 13.5px "Orbitron", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(officialTitle, bx + badgeW / 2, by + badgeH / 2);
  ctx.restore();
}

// ============================================================================
// 10. FONDO NEGRO PROFUNDO (#050505) CON RETÍCULA NARANJA UNIFRANZ (CERO GRADIENTES EN LOOP)
// ============================================================================
export function drawCyberBlackBackground(ctx, W, H, time = 0) {
  ctx.save();

  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, W, H);

  const horizonY = H * 0.48;
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.42)';
  ctx.lineWidth = 1.3;

  const vpX = W * 0.5;
  const numRays = 14;
  ctx.beginPath();
  for (let i = -numRays; i <= numRays; i++) {
    const spread = (i / numRays) * W * 1.4;
    ctx.moveTo(vpX, horizonY);
    ctx.lineTo(vpX + spread, H);
    ctx.moveTo(vpX, horizonY);
    ctx.lineTo(vpX + spread, 0);
  }
  ctx.stroke();

  const speedOffset = (time * 0.00075) % 1;
  const numRows = 8;
  for (let r = 0; r < numRows; r++) {
    const t = (r + speedOffset) / numRows;
    const perspective = t * t;

    const fy = horizonY + perspective * (H - horizonY);
    ctx.strokeStyle = `rgba(255, 107, 0, ${clamp(perspective * 0.65, 0.08, 0.65)})`;
    ctx.lineWidth = 1 + perspective;
    ctx.beginPath();
    ctx.moveTo(0, fy);
    ctx.lineTo(W, fy);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawSynergyConnectionBeam(ctx, x1, y1, x2, y2, time = 0) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  ctx.strokeStyle = 'rgba(255, 107, 0, 0.85)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bx = lerp(x1, x2, t);
    const by =
      lerp(y1, y2, t) + Math.sin(t * Math.PI * 5 + time * 0.014) * 12 * Math.sin(t * Math.PI);
    if (i === 0) ctx.moveTo(bx, by);
    else ctx.lineTo(bx, by);
  }
  ctx.stroke();

  ctx.globalCompositeOperation = 'source-over';
  const badgeW = 355;
  const badgeH = 34;
  ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH, 17);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 11px "Orbitron", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡ Ingeniería de Sistemas e Innovación Digital', midX, midY);

  ctx.restore();
}

// ============================================================================
// 11. DETECCIÓN DE GESTOS DE MANO (SIN DISPARADOR DE FOTOS)
// ============================================================================
export function computePalmCenterAndTilt(handLm, toScreenX, toScreenY) {
  const indices = [0, 5, 9, 13, 17];
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    sumX += toScreenX(handLm[idx].x);
    sumY += toScreenY(handLm[idx].y);
  }
  const cx = sumX / indices.length;
  const cy = sumY / indices.length;

  const p5x = toScreenX(handLm[5].x);
  const p5y = toScreenY(handLm[5].y);
  const p17x = toScreenX(handLm[17].x);
  const p17y = toScreenY(handLm[17].y);

  const wristX = toScreenX(handLm[0].x);
  const middleX = toScreenX(handLm[9].x);
  const palmSpan = Math.hypot(p17x - p5x, p17y - p5y);

  const knuckleTilt = Math.atan2(p17y - p5y, Math.abs(p17x - p5x) + 1);
  const lateralLean = clamp((middleX - wristX) / (palmSpan + 20), -0.65, 0.65);
  const tiltAngle = clamp(lateralLean * 0.7 + knuckleTilt * 0.35, -0.6, 0.6);

  return { x: cx, y: cy, tiltAngle, palmSpan };
}

export function analyzeHandGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;

  const wrist = landmarks[0];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const indexExt = dist(landmarks[8], wrist) > dist(landmarks[6], wrist) * 1.15;
  const middleExt = dist(landmarks[12], wrist) > dist(landmarks[10], wrist) * 1.15;
  const ringExt = dist(landmarks[16], wrist) > dist(landmarks[14], wrist) * 1.14;
  const pinkyExt = dist(landmarks[20], wrist) > dist(landmarks[18], wrist) * 1.14;

  const indexUp = indexExt && landmarks[8].y < landmarks[6].y;
  const middleUp = middleExt && landmarks[12].y < landmarks[10].y;
  const ringUp = ringExt && landmarks[16].y < landmarks[14].y;
  const pinkyUp = pinkyExt && landmarks[20].y < landmarks[18].y;

  const indexFolded = dist(landmarks[8], wrist) < dist(landmarks[6], wrist) * 1.12;
  const middleFolded = dist(landmarks[12], wrist) < dist(landmarks[10], wrist) * 1.12;
  const ringFolded = dist(landmarks[16], wrist) < dist(landmarks[14], wrist) * 1.12;
  const pinkyFolded = dist(landmarks[20], wrist) < dist(landmarks[18], wrist) * 1.12;

  if (indexFolded && middleFolded && ringFolded && pinkyFolded) {
    return 'FIST';
  }

  if (indexUp && pinkyUp && middleFolded && ringFolded) {
    return 'ROCK';
  }

  if (indexUp && middleUp && ringUp && pinkyUp) {
    return 'OPEN_PALM';
  }

  return 'RAISED_PALM';
}
