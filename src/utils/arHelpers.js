// Renderizadores AR optimizados para UNIFRANZ AR Mirror (Nueva Malla 2026)
import { AR_CONFIG, CAREERS } from '../config.js';

export const lerp = (start, end, factor) => start + (end - start) * factor;

export const lerpAngle = (a, b, t) => {
  const diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + diff * t;
};

export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

export const FUTURE_ROLES = {
  sistemas: CAREERS.sistemas.roles,
  derecho: CAREERS.derecho.roles,
};

// Pixel Art T-Rex frames (Frame 0: paso izquierdo, Frame 1: paso derecho)
export const DINO_WALK_FRAMES = [
  [
    [0,0,0,0,0,0,1,1,1,1,1,0],
    [0,0,0,0,0,1,1,0,1,1,1,1],
    [0,0,0,0,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,1,1,1,1,0,0,0],
    [1,0,0,0,1,1,1,1,1,1,1,0],
    [1,1,0,1,1,1,1,1,1,0,1,0],
    [1,1,1,1,1,1,1,1,1,0,0,0],
    [0,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,0,0,0,0,0,0,0],
    [0,0,0,1,1,0,0,1,0,0,0,0],
  ],
  [
    [0,0,0,0,0,0,1,1,1,1,1,0],
    [0,0,0,0,0,1,1,0,1,1,1,1],
    [0,0,0,0,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,1,1,1,1,0,0,0],
    [1,0,0,0,1,1,1,1,1,1,1,0],
    [1,1,0,1,1,1,1,1,1,0,1,0],
    [1,1,1,1,1,1,1,1,1,0,0,0],
    [0,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,0,0,1,1,0,0,0,0],
    [0,0,0,1,0,0,1,1,0,0,0,0],
  ],
];

export function drawPixelDino(ctx, x, y, pixelSize = 2.5, color = '#FF6B00', alpha = 0.9, frameIdx = 0, flipX = false) {
  ctx.save();
  ctx.translate(x, y);
  if (flipX) ctx.scale(-1, 1);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  const matrix = DINO_WALK_FRAMES[frameIdx % 2];
  const rows = matrix.length;
  const cols = matrix[0].length;
  const startX = -(cols * pixelSize) / 2;
  const startY = -(rows * pixelSize) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(
          startX + c * pixelSize,
          startY + r * pixelSize,
          pixelSize,
          pixelSize
        );
      }
    }
  }
  ctx.restore();
}

// Elemento Sistemas: Dino Pixel caminando sobre el hombro izquierdo
export function drawWalkingShoulderDino(ctx, shoulderCenterX, shoulderCenterY, shoulderWidth, shoulderAngle, time) {
  ctx.save();
  ctx.translate(shoulderCenterX, shoulderCenterY);
  ctx.rotate(shoulderAngle);

  const patrolCenter = shoulderWidth * 0.34;
  const patrolRange = shoulderWidth * 0.14;
  const walkCycle = time * 0.0022;
  const offsetX = patrolCenter + Math.sin(walkCycle) * patrolRange;
  const dir = Math.cos(walkCycle);
  const bounceY = -Math.abs(Math.sin(time * 0.012)) * 4;
  const baseOffsetY = -shoulderWidth * 0.22 + bounceY;

  const frameIdx = Math.floor(time / 160) % 2;
  const pSize = clamp(shoulderWidth * AR_CONFIG.DINO_PIXEL_FACTOR, 2.2, 4.4);

  // Plataforma holográfica bajo el dino (sin shadowBlur costoso)
  ctx.fillStyle = 'rgba(255, 107, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(offsetX, baseOffsetY + pSize * 6, pSize * 6, pSize * 1.4, 0, 0, Math.PI * 2);
  ctx.fill();

  drawPixelDino(ctx, offsetX, baseOffsetY, pSize, '#FFFFFF', 0.98, frameIdx, dir < 0);

  ctx.font = '700 9px "Orbitron", monospace';
  ctx.fillStyle = '#FF6B00';
  ctx.textAlign = 'center';
  ctx.fillText('SIS-BOT', offsetX, baseOffsetY - pSize * 6.8);

  ctx.restore();
}

// Elemento Derecho: Emblema de Balanza Holográfica anclado al hombro de la persona
export function drawShoulderScalesEmblem(ctx, shoulderCenterX, shoulderCenterY, shoulderWidth, shoulderAngle, time) {
  ctx.save();
  ctx.translate(shoulderCenterX, shoulderCenterY);
  ctx.rotate(shoulderAngle);

  const offsetX = -shoulderWidth * 0.36;
  const bounceY = Math.sin(time * 0.004) * 3.5;
  const offsetY = -shoulderWidth * 0.24 + bounceY;
  const size = clamp(shoulderWidth * 0.16, 18, 36);
  const tilt = Math.sin(time * 0.0028) * 0.16;

  ctx.translate(offsetX, offsetY);

  // Base luminosa
  ctx.fillStyle = 'rgba(255, 107, 0, 0.22)';
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pilar central y base de balanza
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-size * 0.35, size * 0.48);
  ctx.lineTo(size * 0.35, size * 0.48);
  ctx.moveTo(0, size * 0.48);
  ctx.lineTo(0, -size * 0.42);
  ctx.stroke();

  // Brazo basculante
  ctx.save();
  ctx.translate(0, -size * 0.34);
  ctx.rotate(tilt);
  const beamHalf = size * 0.52;
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-beamHalf, 0);
  ctx.lineTo(beamHalf, 0);
  ctx.stroke();

  [-beamHalf, beamHalf].forEach((bx) => {
    ctx.save();
    ctx.translate(bx, 0);
    ctx.rotate(-tilt);
    const drop = size * 0.38;
    const panW = size * 0.22;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-panW, drop);
    ctx.moveTo(0, 0);
    ctx.lineTo(panW, drop);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 107, 0, 0.65)';
    ctx.beginPath();
    ctx.arc(0, drop, panW, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();

  ctx.font = '700 9px "Orbitron", monospace';
  ctx.fillStyle = '#FF6B00';
  ctx.textAlign = 'center';
  ctx.fillText('LEX-AR', 0, size * 1.25);

  ctx.restore();
}

// Calcula centro de palma e inclinación a partir de landmarks 0, 5, 9, 13, 17
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

// Poder Sistemas 1: Esfera holográfica de red neuronal y código binario
export function drawNeuralBinarySphere(ctx, x, y, radius = 48, time = 0, opacity = 1) {
  if (opacity <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);

  const coreGrad = ctx.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius * 1.25);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  coreGrad.addColorStop(0.28, 'rgba(255, 107, 0, 0.58)');
  coreGrad.addColorStop(0.7, 'rgba(255, 85, 0, 0.16)');
  coreGrad.addColorStop(1, 'rgba(255, 107, 0, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.25, 0, Math.PI * 2);
  ctx.fill();

  const nodeCount = 12;
  const nodes = [];
  const rotY = time * 0.0024;
  const rotX = time * 0.0016;

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
        const alpha = clamp((nodes[i].z + nodes[j].z + 2) * 0.22, 0.12, 0.7);
        ctx.strokeStyle = i % 2 === 0 ? `rgba(255, 107, 0, ${alpha})` : `rgba(255, 255, 255, ${alpha * 0.75})`;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }
  }

  ctx.save();
  ctx.rotate(rotY);
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([10, 6]);
  ctx.beginPath();
  ctx.ellipse(0, 0, radius, radius * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.rotate(-rotY * 1.2 + 1.1);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.92, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.font = '800 10px "Orbitron", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    ctx.fillStyle = n.z > 0 ? '#FFFFFF' : '#FF6B00';
    ctx.fillText(n.bit, n.x, n.y);
  }

  ctx.restore();
}

// Poder Sistemas 2: Núcleo de Fusión Digital cuando ambas manos se acercan
export function drawDigitalFusionCore(ctx, x, y, radius = 82, time = 0, opacity = 1) {
  if (opacity <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);

  const pulse = 1 + Math.sin(time * 0.015) * 0.12;
  const r = radius * pulse;

  const aura = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.6);
  aura.addColorStop(0, '#FFFFFF');
  aura.addColorStop(0.25, '#FF8C00');
  aura.addColorStop(0.55, 'rgba(255, 107, 0, 0.5)');
  aura.addColorStop(1, 'rgba(255, 85, 0, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate(time * (0.004 + i * 0.002) * (i % 2 === 0 ? 1 : -1));
    ctx.strokeStyle = i === 0 ? '#FFFFFF' : '#FF6B00';
    ctx.lineWidth = 3 - i * 0.6;
    ctx.setLineDash([18, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, r * (0.65 + i * 0.2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 13px "Orbitron", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AI CORE // FUSIÓN DIGITAL', 0, r + 22);

  ctx.restore();
}

// Poder Derecho 1: Balanza Holográfica sobre palma que se inclina con la mano
export function drawHolographicScales(ctx, x, y, size = 56, time = 0, dynamicTilt = null, opacity = 1) {
  if (opacity <= 0.02) return;
  const hoverOffset = Math.sin(time * 0.005) * 5;
  const tilt = dynamicTilt !== null ? clamp(dynamicTilt, -0.55, 0.55) : Math.sin(time * 0.003) * 0.14;
  const cy = y + hoverOffset;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, cy);

  const grad = ctx.createRadialGradient(0, 0, size * 0.15, 0, 0, size * 1.15);
  grad.addColorStop(0, 'rgba(255, 107, 0, 0.42)');
  grad.addColorStop(0.6, 'rgba(255, 185, 50, 0.14)');
  grad.addColorStop(1, 'rgba(255, 107, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, size * 1.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate(time * 0.0018);
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.85)';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.88, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(-size * 0.36, size * 0.55);
  ctx.lineTo(size * 0.36, size * 0.55);
  ctx.moveTo(-size * 0.22, size * 0.46);
  ctx.lineTo(size * 0.22, size * 0.46);
  ctx.moveTo(0, size * 0.46);
  ctx.lineTo(0, -size * 0.48);
  ctx.stroke();

  ctx.fillStyle = '#FF6B00';
  ctx.beginPath();
  ctx.arc(0, -size * 0.52, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(0, -size * 0.38);
  ctx.rotate(tilt);

  const beamHalf = size * 0.58;
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-beamHalf, 0);
  ctx.lineTo(beamHalf, 0);
  ctx.stroke();

  [-beamHalf, beamHalf].forEach((bx) => {
    ctx.save();
    ctx.translate(bx, 0);
    ctx.rotate(-tilt);

    const dropH = size * 0.42;
    const panW = size * 0.25;

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-panW, dropH);
    ctx.moveTo(0, 0);
    ctx.lineTo(panW, dropH);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 107, 0, 0.55)';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, dropH, panW, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  });

  ctx.restore();

  ctx.font = '800 10px "Orbitron", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText('BALANZA HOLOGRÁFICA', 0, size * 0.82);

  ctx.restore();
}

// Poder Derecho 2: Escudo LegalTech hexagonal cuando ambas manos están levantadas
export function drawLegalTechShield(ctx, centerX, centerY, radius = 130, time = 0, opacity = 1) {
  if (opacity <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(centerX, centerY);

  const pulse = 1 + Math.sin(time * 0.006) * 0.03;
  const R = radius * pulse;

  const drawHex = (rad) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const hx = Math.cos(angle) * rad;
      const hy = Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
  };

  const hexGrad = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R);
  hexGrad.addColorStop(0, 'rgba(255, 107, 0, 0.12)');
  hexGrad.addColorStop(0.7, 'rgba(255, 107, 0, 0.28)');
  hexGrad.addColorStop(1, 'rgba(255, 255, 255, 0.42)');

  drawHex(R);
  ctx.fillStyle = hexGrad;
  ctx.fill();

  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 3.2;
  ctx.stroke();

  drawHex(R * 0.82);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([14, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * R, Math.sin(angle) * R, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(10, 10, 10, 0.86)';
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 1.8;
  const bw = R * 1.65;
  const bh = 36;
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${Math.max(11, Math.round(R * 0.11))}px "Orbitron", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('JUSTICIA & INNOVACIÓN', 0, 0);

  ctx.fillStyle = '#FF6B00';
  ctx.font = '700 10px "Orbitron", sans-serif';
  ctx.fillText('ESCUDO LEGALTECH • UNIFRANZ', 0, -bh / 2 - 12);

  ctx.restore();
}

// Fondo Metaverso Tron (ligero, sin shadowBlur)
export function drawMetaverseTronGrid(ctx, W, H, time = 0) {
  ctx.save();

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#050505');
  bg.addColorStop(0.45, '#0A0A0A');
  bg.addColorStop(0.5, '#180B02');
  bg.addColorStop(1, '#080808');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const horizonY = H * 0.48;

  ctx.strokeStyle = 'rgba(255, 107, 0, 0.65)';
  ctx.lineWidth = 1.5;

  const vpX = W * 0.5;
  const numRays = 16;
  ctx.beginPath();
  for (let i = -numRays; i <= numRays; i++) {
    const spread = (i / numRays) * W * 1.45;
    ctx.moveTo(vpX, horizonY);
    ctx.lineTo(vpX + spread, H);
    ctx.moveTo(vpX, horizonY);
    ctx.lineTo(vpX + spread, 0);
  }
  ctx.stroke();

  const speedOffset = (time * 0.00085) % 1;
  const numRows = 10;
  for (let r = 0; r < numRows; r++) {
    const t = (r + speedOffset) / numRows;
    const perspective = Math.pow(t, 2.25);

    const fy = horizonY + perspective * (H - horizonY);
    ctx.strokeStyle = `rgba(255, 107, 0, ${clamp(perspective * 0.8, 0.08, 0.8)})`;
    ctx.lineWidth = 1 + perspective * 1.5;
    ctx.beginPath();
    ctx.moveTo(0, fy);
    ctx.lineTo(W, fy);
    ctx.stroke();

    const cy = horizonY - perspective * horizonY;
    ctx.strokeStyle = `rgba(255, 107, 0, ${clamp(perspective * 0.45, 0.05, 0.45)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(W, cy);
    ctx.stroke();
  }

  ctx.restore();
}

// Haz de Sinergia entre personas detectadas
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
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bx = lerp(x1, x2, t);
    const by = lerp(y1, y2, t) + Math.sin(t * Math.PI * 5 + time * 0.014) * 12 * Math.sin(t * Math.PI);
    if (i === 0) ctx.moveTo(bx, by);
    else ctx.lineTo(bx, by);
  }
  ctx.stroke();

  ctx.globalCompositeOperation = 'source-over';
  const badgeW = 290;
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
  ctx.fillText('⚡ SINERGIA UNIFRANZ • MALLA 2026', midX, midY);

  ctx.restore();
}

// Detecta gestos de mano a partir de los 21 landmarks
export function analyzeHandGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;

  const wrist = landmarks[0];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const indexExtended = dist(landmarks[8], wrist) > dist(landmarks[6], wrist) * 1.18 && landmarks[8].y < landmarks[6].y;
  const middleExtended = dist(landmarks[12], wrist) > dist(landmarks[10], wrist) * 1.18 && landmarks[12].y < landmarks[10].y;
  const ringExtended = dist(landmarks[16], wrist) > dist(landmarks[14], wrist) * 1.15 && landmarks[16].y < landmarks[14].y;
  const pinkyExtended = dist(landmarks[20], wrist) > dist(landmarks[18], wrist) * 1.15 && landmarks[20].y < landmarks[18].y;
  const thumbExtended = dist(landmarks[4], landmarks[17]) > dist(landmarks[3], landmarks[17]) * 1.12;

  const ringFolded = dist(landmarks[16], wrist) < dist(landmarks[14], wrist) * 1.08;
  const pinkyFolded = dist(landmarks[20], wrist) < dist(landmarks[18], wrist) * 1.08;

  const isRaised = wrist.y < 0.82;

  if (isRaised && indexExtended && middleExtended && ringExtended && pinkyExtended && thumbExtended) {
    return 'OPEN_PALM';
  }

  const indexMiddleSpread = dist(landmarks[8], landmarks[12]) > 0.032;
  if (isRaised && indexExtended && middleExtended && ringFolded && pinkyFolded && indexMiddleSpread) {
    return 'PEACE';
  }

  if (isRaised) {
    return 'RAISED_PALM';
  }

  return null;
}

// Detecta sonrisa amplia desde blendshapes o landmarks faciales
export function detectSmileFromFace(faceLandmarks, faceBlendshapes) {
  if (faceBlendshapes?.categories) {
    const categories = faceBlendshapes.categories;
    const smileLeft = categories.find((c) => c.categoryName === 'mouthSmileLeft')?.score || 0;
    const smileRight = categories.find((c) => c.categoryName === 'mouthSmileRight')?.score || 0;
    if ((smileLeft + smileRight) / 2 > 0.68) {
      return true;
    }
  }

  if (faceLandmarks && faceLandmarks.length > 291) {
    const leftMouth = faceLandmarks[61];
    const rightMouth = faceLandmarks[291];
    const leftEye = faceLandmarks[33];
    const rightEye = faceLandmarks[263];
    const upperLip = faceLandmarks[13];
    const lowerLip = faceLandmarks[14];

    const mouthWidth = Math.hypot(rightMouth.x - leftMouth.x, rightMouth.y - leftMouth.y);
    const eyeWidth = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
    const mouthOpen = Math.hypot(lowerLip.x - upperLip.x, lowerLip.y - upperLip.y);

    if (eyeWidth > 0 && mouthWidth / eyeWidth > 0.66 && mouthOpen / eyeWidth > 0.08) {
      return true;
    }
  }

  return false;
}
