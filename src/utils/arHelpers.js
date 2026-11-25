// Renderizadores 100% Vectoriales / Procedurales en Canvas 2D para UNIFRANZ AR Mirror Experience
// Inauguración Nueva Malla Curricular: Ingeniería de Sistemas e Innovación Digital
import { AR_CONFIG } from '../config.js';

export const lerp = (start, end, factor) => start + (end - start) * factor;

export const lerpAngle = (a, b, t) => {
  const diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + diff * t;
};

export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

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

// ============================================================================
// 1. VISOR OCULUS QUEST BLANCO FUTURISTA DIBUJADO 100% POR CÓDIGO (SIN CORREA SUPERIOR)
// ============================================================================
export function drawProceduralWhiteOculusQuest(ctx, centerX, centerY, width, rollAngle = 0, yaw = 0, time = 0) {
  const W = Math.max(80, width);
  const H = W * 0.46;
  const hw = W / 2;
  const hh = H / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rollAngle);

  // Efecto sutil de perspectiva horizontal 2.5D con el giro de la cabeza (yaw)
  const yawShift = clamp(yaw || 0, -0.6, 0.6) * W * 0.06;

  // Helper para trazar la silueta curva del visor con escote ergonómico para el puente nasal
  const traceVisorPath = (scale = 1, offsetX = 0, offsetY = 0) => {
    const sw = hw * scale;
    const sh = hh * scale;
    const noseW = sw * 0.24;
    const noseDepth = sh * 0.34;

    ctx.beginPath();
    ctx.moveTo(offsetX - sw * 0.72, offsetY - sh);
    ctx.lineTo(offsetX + sw * 0.72, offsetY - sh);
    // Esquina superior derecha curva
    ctx.bezierCurveTo(
      offsetX + sw * 0.98,
      offsetY - sh,
      offsetX + sw,
      offsetY - sh * 0.62,
      offsetX + sw,
      offsetY
    );
    // Esquina inferior derecha curva
    ctx.bezierCurveTo(
      offsetX + sw,
      offsetY + sh * 0.78,
      offsetX + sw * 0.88,
      offsetY + sh,
      offsetX + noseW * 1.45,
      offsetY + sh
    );
    // Arco ergonómico negro mate para el puente de la nariz
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
    // Esquina inferior izquierda curva
    ctx.bezierCurveTo(
      offsetX - sw * 0.88,
      offsetY + sh,
      offsetX - sw,
      offsetY + sh * 0.78,
      offsetX - sw,
      offsetY
    );
    // Esquina superior izquierda curva
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

  // A. Bisagras laterales articuladas blancas/negras (SIN correa superior de tela)
  [-1, 1].forEach((side) => {
    ctx.save();
    const hx = side * (hw * 0.96);
    const armW = W * 0.11;
    const armH = H * 0.42;

    // Brazo lateral blanco con degradado 3D
    const armGrad = ctx.createLinearGradient(hx - armW / 2, -armH / 2, hx + armW / 2, armH / 2);
    armGrad.addColorStop(0, '#FFFFFF');
    armGrad.addColorStop(0.55, '#E2E8F0');
    armGrad.addColorStop(1, '#94A3B8');

    ctx.fillStyle = armGrad;
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

    // Detalle LED naranja neón en la bisagra lateral
    ctx.fillStyle = '#FF6B00';
    ctx.shadowColor = '#FF6B00';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(
      side < 0 ? hx - armW * 0.55 : hx + armW * 0.15,
      -armH * 0.22,
      armW * 0.24,
      armH * 0.44,
      3
    );
    ctx.fill();
    ctx.restore();
  });

  // B. Almohadilla facial interna e interfaz del puente nasal en negro mate (#111111)
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  traceVisorPath(1.05, 0, H * 0.04);
  ctx.fillStyle = '#111111';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.45)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();

  // C. Cuerpo principal exterior blanco minimalista con volumen 3D (#FFFFFF a #E2E8F0)
  ctx.save();
  traceVisorPath(1.0, yawShift * 0.35, 0);
  const bodyGrad = ctx.createLinearGradient(0, -hh, 0, hh);
  bodyGrad.addColorStop(0, '#FFFFFF');
  bodyGrad.addColorStop(0.45, '#F8FAFC');
  bodyGrad.addColorStop(0.82, '#E2E8F0');
  bodyGrad.addColorStop(1, '#CBD5E1');
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // D. Placa frontal curva con bisel 3D y reflejo holográfico animado en naranja UNIFRANZ
  ctx.save();
  traceVisorPath(0.86, yawShift * 0.55, -H * 0.015);
  const plateGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  plateGrad.addColorStop(0, '#F1F5F9');
  plateGrad.addColorStop(0.35, '#FFFFFF');
  plateGrad.addColorStop(0.75, '#E2E8F0');
  plateGrad.addColorStop(1, '#CBD5E1');
  ctx.fillStyle = plateGrad;
  ctx.fill();

  // Recortar dentro de la placa frontal para dibujar el reflejo holográfico y líneas de código
  ctx.clip();

  // Banda de brillo holográfico naranja que recorre el frente del visor
  const sweepPos = ((time * 0.0007) % 1.8) - 0.9;
  const sweepX = sweepPos * W;
  const holoGrad = ctx.createLinearGradient(sweepX - W * 0.25, -hh, sweepX + W * 0.25, hh);
  holoGrad.addColorStop(0, 'rgba(255, 107, 0, 0)');
  holoGrad.addColorStop(0.45, 'rgba(255, 107, 0, 0.22)');
  holoGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.68)');
  holoGrad.addColorStop(0.55, 'rgba(255, 107, 0, 0.22)');
  holoGrad.addColorStop(1, 'rgba(255, 107, 0, 0)');
  ctx.fillStyle = holoGrad;
  ctx.fillRect(-hw, -hh, W, H);

  // Sutil flujo de código binario reflejado en el cristal blanco del visor
  ctx.font = `700 ${Math.max(7, Math.round(H * 0.13))}px "Orbitron", monospace`;
  ctx.fillStyle = 'rgba(255, 107, 0, 0.26)';
  ctx.textAlign = 'center';
  const codeLine = '0101 // AI.SYS // UNIFRANZ.XR // 1010';
  ctx.fillText(codeLine, yawShift + Math.sin(time * 0.002) * 14, H * 0.06);

  ctx.restore();

  // Contorno naranja neón sutil en el bisel de la placa frontal
  ctx.save();
  traceVisorPath(0.86, yawShift * 0.55, -H * 0.015);
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.65)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();

  // E. Las 4 Micro-Cámaras de Rastreo en las esquinas con destello neón naranja (#FF6B00)
  const camPositions = [
    { x: -hw * 0.74 + yawShift * 0.3, y: -hh * 0.56 },
    { x: hw * 0.74 + yawShift * 0.3, y: -hh * 0.56 },
    { x: -hw * 0.72 + yawShift * 0.3, y: hh * 0.52 },
    { x: hw * 0.72 + yawShift * 0.3, y: hh * 0.52 },
  ];
  const camR = clamp(W * 0.038, 4, 9);

  camPositions.forEach((cam, idx) => {
    ctx.save();
    // Alojamiento negro mate del sensor
    ctx.fillStyle = '#0A0A0A';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, camR * 1.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Lente interior con brillo neón naranja UNIFRANZ (#FF6B00)
    const pulse = 0.75 + Math.sin(time * 0.006 + idx) * 0.25;
    ctx.shadowColor = '#FF6B00';
    ctx.shadowBlur = 10 * pulse;
    ctx.fillStyle = '#FF6B00';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, camR * 0.72, 0, Math.PI * 2);
    ctx.fill();

    // Punto especular blanco en la lente
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cam.x - camR * 0.22, cam.y - camR * 0.22, camR * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // F. Grabado central superior "UNIFRANZ XR"
  ctx.save();
  ctx.font = `900 ${clamp(Math.round(W * 0.062), 8, 14)}px "Orbitron", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0A0A0A';
  ctx.fillText('UNIFRANZ', yawShift * 0.5 - W * 0.055, -hh * 0.52);
  ctx.fillStyle = '#FF6B00';
  ctx.fillText('XR', yawShift * 0.5 + W * 0.165, -hh * 0.52);
  ctx.restore();

  ctx.restore();
}

// ============================================================================
// 2. CORONA HOLOGRÁFICA UNIFRANZ ("LÍDER DEL FUTURO")
// ============================================================================
export function drawUnifranzHolographicCrown(ctx, foreheadX, foreheadY, faceHeight, templeWidth, headRoll, time = 0) {
  const elevation = faceHeight * (AR_CONFIG.CROWN_ELEVATION_FACTOR || 0.38);
  const floatOffset = Math.sin(time * 0.0045) * 4;
  const totalUp = elevation - floatOffset;

  const crownX = foreheadX + Math.sin(headRoll) * totalUp;
  const crownY = foreheadY - Math.cos(headRoll) * totalUp;
  const W = Math.max(85, templeWidth * 1.15);
  const H = Math.max(46, faceHeight * 0.42);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(crownX, crownY);
  ctx.rotate(headRoll);

  const glow = ctx.createRadialGradient(0, -H * 0.2, H * 0.1, 0, -H * 0.2, W * 0.72);
  glow.addColorStop(0, 'rgba(255, 107, 0, 0.55)');
  glow.addColorStop(0.5, 'rgba(255, 85, 0, 0.2)');
  glow.addColorStop(1, 'rgba(255, 107, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -H * 0.2, W * 0.72, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, H * 0.18, W * 0.48, H * 0.16, 0, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();

  const peaks = [
    { x: -W * 0.44, y: -H * 0.22, baseX: -W * 0.36 },
    { x: -W * 0.24, y: -H * 0.56, baseX: -W * 0.18 },
    { x: 0, y: -H * 0.88, baseX: 0 },
    { x: W * 0.24, y: -H * 0.56, baseX: W * 0.18 },
    { x: W * 0.44, y: -H * 0.22, baseX: W * 0.36 },
  ];

  const crownFill = ctx.createLinearGradient(0, -H * 0.88, 0, H * 0.15);
  crownFill.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  crownFill.addColorStop(0.45, 'rgba(255, 107, 0, 0.42)');
  crownFill.addColorStop(1, 'rgba(255, 107, 0, 0.08)');

  ctx.fillStyle = crownFill;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(-W * 0.46, H * 0.1);
  ctx.lineTo(peaks[0].x, peaks[0].y);
  ctx.lineTo(-W * 0.29, -H * 0.05);
  ctx.lineTo(peaks[1].x, peaks[1].y);
  ctx.lineTo(-W * 0.11, -H * 0.15);
  ctx.lineTo(peaks[2].x, peaks[2].y);
  ctx.lineTo(W * 0.11, -H * 0.15);
  ctx.lineTo(peaks[3].x, peaks[3].y);
  ctx.lineTo(W * 0.29, -H * 0.05);
  ctx.lineTo(peaks[4].x, peaks[4].y);
  ctx.lineTo(W * 0.46, H * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 1.6;
  peaks.forEach((pk, idx) => {
    ctx.beginPath();
    ctx.moveTo(pk.baseX, H * 0.04);
    ctx.lineTo(pk.x, pk.y);
    ctx.stroke();

    const nodeR = idx === 2 ? 5.5 : 3.8;
    ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#FF6B00';
    ctx.beginPath();
    ctx.arc(pk.x, pk.y, nodeR, 0, Math.PI * 2);
    ctx.fill();
  });

  for (let i = 0; i < 7; i++) {
    const px = ((i - 3) / 3.2) * (W * 0.42);
    const cycle = (time * 0.0015 + i * 0.27) % 1;
    const py = -H * 0.25 - cycle * H * 0.85;
    const pAlpha = (1 - cycle) * 0.85;
    ctx.fillStyle = i % 2 === 0 ? `rgba(255, 107, 0, ${pAlpha})` : `rgba(255, 255, 255, ${pAlpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 2.2 * (1 - cycle * 0.4), 0, Math.PI * 2);
    ctx.fill();
  }

  const emblemR = clamp(H * 0.26, 12, 22);
  const emblemY = -H * 0.24;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#0A0A0A';
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const hx = Math.cos(a) * emblemR;
    const hy = emblemY + Math.sin(a) * emblemR;
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${Math.round(emblemR * 1.15)}px "Orbitron", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('U', 0, emblemY + 1);

  const arcText = '★ LÍDER DEL FUTURO ★';
  ctx.font = `800 ${clamp(Math.round(W * 0.068), 8, 12)}px "Orbitron", sans-serif`;
  const arcRadius = W * 0.56;
  const arcCenterY = H * 0.72;
  const totalAngle = 0.58;
  const startAngle = -Math.PI / 2 - totalAngle / 2;
  const stepAngle = totalAngle / (arcText.length - 1);

  for (let i = 0; i < arcText.length; i++) {
    const ch = arcText[i];
    const theta = startAngle + i * stepAngle;
    ctx.save();
    ctx.translate(Math.cos(theta) * arcRadius, arcCenterY + Math.sin(theta) * arcRadius);
    ctx.rotate(theta + Math.PI / 2);
    ctx.fillStyle = ch === '★' ? '#FF6B00' : '#FFFFFF';
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

// ============================================================================
// 3. MODO HACKER HUD (VISOR CIBER-ANALÍTICO + COLLAR NEÓN DE CIRCUITOS)
// ============================================================================
export function drawHackerHudVisor(ctx, person, time = 0) {
  const eyeX = person.rightEyeX ?? person.vrCenterX - person.vrWidth * 0.22;
  const eyeY = person.rightEyeY ?? person.vrCenterY;
  const radius = clamp(person.vrWidth * 0.24, 22, 50);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(eyeX, eyeY);
  ctx.rotate(person.vrAngle);

  const lensGrad = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
  lensGrad.addColorStop(0, 'rgba(255, 107, 0, 0.14)');
  lensGrad.addColorStop(0.75, 'rgba(255, 107, 0, 0.38)');
  lensGrad.addColorStop(1, 'rgba(255, 255, 255, 0.58)');
  ctx.fillStyle = lensGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate(time * 0.0028);
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2.4;
  ctx.setLineDash([12, 6, 4, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.4;
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
  ctx.font = '700 9px "Orbitron", monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'right';
  ctx.fillText(`ROOT@UNIFRANZ // ${Math.round(94 + Math.sin(time * 0.004) * 5)}%`, sideX, -radius * 0.62);

  ctx.restore();
}

// ============================================================================
// 4. MANDO PLAYSTATION DUALSENSE HOLOGRÁFICO (100% VECTORIAL EN CANVAS 2D)
// ============================================================================
export function drawProceduralDualSenseController(ctx, x, y, width = 95, tiltAngle = 0, time = 0, isGrabbed = false, opacity = 1) {
  if (opacity <= 0.02) return;
  const W = Math.max(58, width);
  const H = W * 0.66;
  const hw = W / 2;
  const hh = H / 2;

  // Si el usuario cierra el puño ("agarrando" el mando), vibra con energía naranja
  const vibX = isGrabbed ? Math.sin(time * 0.08) * 2.5 : 0;
  const vibY = isGrabbed ? Math.cos(time * 0.09) * 2.0 : Math.sin(time * 0.004) * 4;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x + vibX, y + vibY);
  ctx.rotate(tiltAngle);

  // Ondas de energía naranja cuando el mando está activo en la mano
  if (isGrabbed) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let r = 0; r < 2; r++) {
      const waveProg = ((time * 0.0022 + r * 0.5) % 1);
      const waveRad = W * (0.45 + waveProg * 0.55);
      ctx.strokeStyle = `rgba(255, 107, 0, ${(1 - waveProg) * 0.75})`;
      ctx.lineWidth = 2.5 * (1 - waveProg);
      ctx.beginPath();
      ctx.arc(0, 0, waveRad, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Cuerpo blanco exterior del DualSense (curvas Bézier ergonómicas)
  ctx.save();
  ctx.shadowColor = '#FF6B00';
  ctx.shadowBlur = isGrabbed ? 18 : 10;

  const bodyGrad = ctx.createLinearGradient(0, -hh, 0, hh);
  bodyGrad.addColorStop(0, '#FFFFFF');
  bodyGrad.addColorStop(0.55, '#F1F5F9');
  bodyGrad.addColorStop(1, '#CBD5E1');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2;

  ctx.beginPath();
  // Borde superior central (touchpad)
  ctx.moveTo(-hw * 0.42, -hh * 0.72);
  ctx.lineTo(hw * 0.42, -hh * 0.72);
  // Hombro derecho (R1/R2) y mango derecho
  ctx.bezierCurveTo(hw * 0.78, -hh * 0.72, hw * 0.96, -hh * 0.35, hw * 0.98, hh * 0.15);
  ctx.bezierCurveTo(hw * 1.0, hh * 0.65, hw * 0.85, hh * 0.98, hw * 0.66, hh * 0.95);
  ctx.bezierCurveTo(hw * 0.5, hh * 0.92, hw * 0.44, hh * 0.38, hw * 0.28, hh * 0.22);
  // Puente inferior negro entre los sticks
  ctx.lineTo(-hw * 0.28, hh * 0.22);
  // Mango izquierdo y hombro izquierdo (L1/L2)
  ctx.bezierCurveTo(-hw * 0.44, hh * 0.38, -hw * 0.5, hh * 0.92, -hw * 0.66, hh * 0.95);
  ctx.bezierCurveTo(-hw * 0.85, hh * 0.98, -hw * 1.0, hh * 0.65, -hw * 0.98, hh * 0.15);
  ctx.bezierCurveTo(-hw * 0.96, -hh * 0.35, -hw * 0.78, -hh * 0.72, -hw * 0.42, -hh * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Sección inferior e interior negra característica del DualSense
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

  // Touchpad central con borde LED naranja neón (lightbar)
  ctx.fillStyle = '#1E293B';
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-hw * 0.34, -hh * 0.68, hw * 0.68, hh * 0.48, 5);
  ctx.fill();
  ctx.stroke();

  // Sticks analógicos simétricos con anillos naranjas
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

  // D-Pad direccional a la izquierda
  const dpadX = -hw * 0.58;
  const dpadY = -hh * 0.24;
  const dSize = W * 0.055;
  ctx.fillStyle = '#0A0A0A';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.2;
  ctx.fillRect(dpadX - dSize * 1.4, dpadY - dSize * 0.45, dSize * 2.8, dSize * 0.9);
  ctx.fillRect(dpadX - dSize * 0.45, dpadY - dSize * 1.4, dSize * 0.9, dSize * 2.8);

  // Botones icónicos de PlayStation iluminados a la derecha: △, ○, ✕, □
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

  // Etiqueta holográfica debajo del mando cuando lo agarra
  if (isGrabbed) {
    ctx.fillStyle = '#FF6B00';
    ctx.font = '800 10px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎮 GAME DEV & XR ENGINE', 0, hh + 16);
  }

  ctx.restore();
}

// ============================================================================
// 5. TECLADO HOLOGRÁFICO CURVO FLOTANTE (MODO HACKER / DEVELOPER)
// ============================================================================
export function drawHolographicKeyboard(ctx, centerX, centerY, width, fingerTips = [], time = 0, onKeyHitCallback = null) {
  const W = clamp(width, 280, 560);
  const H = W * 0.28;
  const left = centerX - W / 2;
  const top = centerY - H / 2;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Panel base translúcido con perspectiva tecnológica
  const bgGrad = ctx.createLinearGradient(left, top, left + W, top + H);
  bgGrad.addColorStop(0, 'rgba(255, 107, 0, 0.14)');
  bgGrad.addColorStop(0.5, 'rgba(10, 10, 10, 0.82)');
  bgGrad.addColorStop(1, 'rgba(255, 107, 0, 0.18)');

  ctx.fillStyle = bgGrad;
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2.4;
  ctx.shadowColor = '#FF6B00';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.roundRect(left, top, W, H, 14);
  ctx.fill();
  ctx.stroke();

  // Encabezado del teclado holográfico
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 10px "Orbitron", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('⌨️ UNIFRANZ DEV TERMINAL // FULL-STACK & AI KEYBOARD', left + 14, top - 8);

  // Grilla de teclas en 3 filas
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '{}'],
    ['AI', 'Z', 'X', 'C', 'V', 'SPACE // DEPLOY', 'B', 'N', '/>'],
  ];

  const padX = 12;
  const padY = 12;
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

      // Comprobar si algún dedo está tocando o pasando sobre esta tecla
      let isPressed = false;
      for (let f = 0; f < fingerTips.length; f++) {
        const ft = fingerTips[f];
        if (Math.abs(ft.x - kCenterX) < kw * 0.65 && Math.abs(ft.y - kCenterY) < kh * 0.85) {
          isPressed = true;
          break;
        }
      }

      // Simulación de tipeo activo si las manos están sobre el teclado
      if (!isPressed && fingerTips.length > 0) {
        const autoPulse = Math.floor(time / 110 + rIdx * 3 + kIdx * 7) % 19 === 0;
        if (autoPulse) isPressed = true;
      }

      if (isPressed && onKeyHitCallback && Math.random() < 0.14) {
        onKeyHitCallback(kCenterX, ky);
      }

      ctx.fillStyle = isPressed ? 'rgba(255, 107, 0, 0.85)' : 'rgba(255, 255, 255, 0.07)';
      ctx.strokeStyle = isPressed ? '#FFFFFF' : 'rgba(255, 107, 0, 0.55)';
      ctx.lineWidth = isPressed ? 2 : 1.1;

      ctx.beginPath();
      ctx.roundRect(kx, ky, kw, kh, 5);
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
// 6. ELEMENTOS AMBIENTALES ORBITALES DE INGENIERÍA DE SISTEMAS (DIBUJADOS POR CÓDIGO)
// ============================================================================
export function drawSistemasOrbitalIcons(ctx, person, W, H, time = 0) {
  if (!person) return;

  const cx = person.shoulderCenterX;
  const cy = person.shoulderCenterY + person.torsoHeight * 0.12;
  const rx = Math.max(155, person.shoulderWidth * 1.18);
  const ry = Math.max(95, person.torsoHeight * 0.55);

  // 5 Íconos icónicos orbitando alrededor de la silueta sin tapar la cara:
  // 0: Cubo 3D Wireframe, 1: Microchip / CPU, 2: Mando DualSense Mini, 3: Nodos Red Neuronal, 4: Llaves de Código { </> }
  const numIcons = 5;

  for (let i = 0; i < numIcons; i++) {
    const angle = time * 0.0009 + (i * Math.PI * 2) / numIcons;
    const ix = cx + Math.cos(angle) * rx;
    const iy = cy + Math.sin(angle) * ry * 0.55;
    const depth = Math.sin(angle); // -1 atrás, +1 adelante
    const scale = 0.78 + (depth + 1) * 0.22;
    const alpha = clamp(0.45 + (depth + 1) * 0.28, 0.35, 0.95);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(ix, iy);
    ctx.scale(scale, scale);

    // Halo circular sutil detrás de cada ícono orbital
    const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, 32);
    halo.addColorStop(0, 'rgba(255, 107, 0, 0.35)');
    halo.addColorStop(1, 'rgba(255, 107, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();

    if (i === 0) {
      // A. Cubo 3D Wireframe Giratorio
      const s = 16;
      const rot = time * 0.0022;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      const verts = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
      ].map(([vx, vy, vz]) => {
        const x1 = vx * cosR - vz * sinR;
        const z1 = vx * sinR + vz * cosR;
        const y1 = vy * Math.cos(0.45) - z1 * Math.sin(0.45);
        return { x: x1 * s, y: y1 * s };
      });
      const edges = [
        [0,1],[1,2],[2,3],[3,0],
        [4,5],[5,6],[6,7],[7,4],
        [0,4],[1,5],[2,6],[3,7],
      ];
      ctx.strokeStyle = '#FF6B00';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      edges.forEach(([a, b]) => {
        ctx.moveTo(verts[a].x, verts[a].y);
        ctx.lineTo(verts[b].x, verts[b].y);
      });
      ctx.stroke();

      verts.forEach((v) => {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(v.x, v.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (i === 1) {
      // B. Microchip / Procesador AI
      const cs = 24;
      ctx.strokeStyle = '#FF6B00';
      ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-cs / 2, -cs / 2, cs, cs, 4);
      ctx.fill();
      ctx.stroke();

      // Pines del procesador en los 4 lados
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      [-7, 0, 7].forEach((p) => {
        ctx.beginPath();
        ctx.moveTo(p, -cs / 2);
        ctx.lineTo(p, -cs / 2 - 6);
        ctx.moveTo(p, cs / 2);
        ctx.lineTo(p, cs / 2 + 6);
        ctx.moveTo(-cs / 2, p);
        ctx.lineTo(-cs / 2 - 6, p);
        ctx.moveTo(cs / 2, p);
        ctx.lineTo(cs / 2 + 6, p);
        ctx.stroke();
      });

      ctx.fillStyle = '#FF6B00';
      ctx.font = '800 8px "Orbitron", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CPU', 0, 0);
    } else if (i === 2) {
      // C. Mando PlayStation DualSense Orbital
      drawProceduralDualSenseController(ctx, 0, 0, 56, Math.sin(time * 0.002) * 0.18, time, false, alpha);
    } else if (i === 3) {
      // D. Nodos de Red Neuronal
      const nPts = [
        { x: -14, y: -10 }, { x: -14, y: 10 },
        { x: 0, y: -15 }, { x: 0, y: 0 }, { x: 0, y: 15 },
        { x: 15, y: -7 }, { x: 15, y: 7 },
      ];
      ctx.strokeStyle = 'rgba(255, 107, 0, 0.7)';
      ctx.lineWidth = 1.3;
      [0, 1].forEach((a) => {
        [2, 3, 4].forEach((b) => {
          ctx.beginPath();
          ctx.moveTo(nPts[a].x, nPts[a].y);
          ctx.lineTo(nPts[b].x, nPts[b].y);
          ctx.stroke();
        });
      });
      [2, 3, 4].forEach((b) => {
        [5, 6].forEach((c) => {
          ctx.beginPath();
          ctx.moveTo(nPts[b].x, nPts[b].y);
          ctx.lineTo(nPts[c].x, nPts[c].y);
          ctx.stroke();
        });
      });
      nPts.forEach((pt, idx) => {
        ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#FF6B00';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (i === 4) {
      // E. Llaves de Código { </> }
      ctx.fillStyle = 'rgba(10, 10, 10, 0.8)';
      ctx.strokeStyle = '#FF6B00';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(-26, -14, 52, 28, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 12px "Orbitron", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('{ </> }', 0, 1);
    }

    ctx.restore();
  }

  // F. Dino Pixelado saltando sobre una barra de datos en la esquina inferior izquierda
  drawCornerJumpingDinoWidget(ctx, 28, H - 122, time);
}

// Widget del Dino Pixelado saltando obstáculos de datos en la esquina inferior
export function drawCornerJumpingDinoWidget(ctx, x, y, time = 0) {
  const boxW = 175;
  const boxH = 54;

  ctx.save();
  ctx.fillStyle = 'rgba(10, 10, 10, 0.82)';
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.65)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, 12);
  ctx.fill();
  ctx.stroke();

  // Pista de datos horizontal y bloques que avanzan
  const groundY = y + boxH - 12;
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 12, groundY);
  ctx.lineTo(x + boxW - 12, groundY);
  ctx.stroke();

  // Bloque de datos acercándose al Dino
  const cycle = (time * 0.00095) % 1;
  const blockX = x + boxW - 22 - cycle * (boxW - 44);
  ctx.fillStyle = '#FF6B00';
  ctx.fillRect(blockX, groundY - 11, 7, 11);

  // Salto automático del Dino cuando el bloque pasa debajo
  const distToDino = Math.abs(blockX - (x + 36));
  const jumpHeight = distToDino < 28 ? Math.sin(((28 - distToDino) / 28) * Math.PI) * 16 : 0;
  const frameIdx = Math.floor(time / 130) % 2;

  drawPixelDino(ctx, x + 36, groundY - 14 - jumpHeight, 2.1, '#FFFFFF', 0.96, frameIdx, false);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 9px "Orbitron", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('SIS-RUNNER // 60FPS', x + 64, y + 19);
  ctx.fillStyle = '#FF6B00';
  ctx.font = '700 8.5px "Orbitron", monospace';
  ctx.fillText(`SCORE: ${Math.floor((time * 0.02) % 9999).toString().padStart(4, '0')}`, x + 64, y + 33);

  ctx.restore();
}

// ============================================================================
// 7. SUPERPODERES EN LAS MANOS: ESFERA IA (IZQUIERDA) + SINAPSIS AL OCULUS, ESCUDO CIBERSEGURIDAD (DERECHA)
// ============================================================================

// Mano Izquierda Abierta: Esfera de Inteligencia Artificial 3D + Sinapsis luminosas hacia el Visor Oculus
export function drawNeuralBinarySphere(ctx, x, y, radius = 48, time = 0, opacity = 1, oculusTarget = null) {
  if (opacity <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'lighter';

  // Lanzar sinapsis luminosas desde la esfera de IA en la palma hacia el visor Oculus
  if (oculusTarget) {
    const tx = oculusTarget.x;
    const ty = oculusTarget.y;
    const midX = (x + tx) / 2 + Math.sin(time * 0.005) * 28;
    const midY = (y + ty) / 2 - 25;

    ctx.strokeStyle = 'rgba(255, 107, 0, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(midX, midY, tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);

    // Impulsos sinápticos viajando hacia el visor
    for (let p = 0; p < 3; p++) {
      const t = (time * 0.0014 + p * 0.33) % 1;
      const omt = 1 - t;
      const px = omt * omt * x + 2 * omt * t * midX + t * t * tx;
      const py = omt * omt * y + 2 * omt * t * midY + t * t * ty;

      ctx.fillStyle = p % 2 === 0 ? '#FFFFFF' : '#FF6B00';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.translate(x, y);

  const coreGrad = ctx.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius * 1.28);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  coreGrad.addColorStop(0.28, 'rgba(255, 107, 0, 0.62)');
  coreGrad.addColorStop(0.7, 'rgba(255, 85, 0, 0.18)');
  coreGrad.addColorStop(1, 'rgba(255, 107, 0, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.28, 0, Math.PI * 2);
  ctx.fill();

  const nodeCount = 12;
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

  ctx.lineWidth = 1.3;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (dist < radius * 0.82) {
        const alpha = clamp((nodes[i].z + nodes[j].z + 2) * 0.22, 0.12, 0.75);
        ctx.strokeStyle = i % 2 === 0 ? `rgba(255, 107, 0, ${alpha})` : `rgba(255, 255, 255, ${alpha * 0.8})`;
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

  ctx.font = '800 10px "Orbitron", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    ctx.fillStyle = n.z > 0 ? '#FFFFFF' : '#FF6B00';
    ctx.fillText(n.bit, n.x, n.y);
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 9.5px "Orbitron", sans-serif';
  ctx.fillText('🧠 IA NEURAL CORE', 0, radius + 16);

  ctx.restore();
}

// Mano Derecha Abierta: Escudo Hexagonal de Ciberseguridad con Candado Digital y Firewall
export function drawCybersecurityHandShield(ctx, x, y, radius = 54, time = 0, opacity = 1) {
  if (opacity <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'lighter';
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

  // Hexágono exterior rotatorio estilo firewall
  ctx.save();
  ctx.rotate(time * 0.0022);
  const hexGrad = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R);
  hexGrad.addColorStop(0, 'rgba(255, 107, 0, 0.15)');
  hexGrad.addColorStop(0.75, 'rgba(255, 107, 0, 0.35)');
  hexGrad.addColorStop(1, 'rgba(255, 255, 255, 0.5)');
  traceHex(R);
  ctx.fillStyle = hexGrad;
  ctx.fill();
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2.8;
  ctx.stroke();
  ctx.restore();

  // Segundo hexágono contra-rotatorio
  ctx.save();
  ctx.rotate(-time * 0.0018);
  traceHex(R * 0.78);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([10, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Candado digital vectorial en el centro del escudo
  const lockW = R * 0.38;
  const lockH = R * 0.32;
  ctx.strokeStyle = '#FFFFFF';
  ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
  ctx.lineWidth = 2.2;

  // Arco del candado
  ctx.beginPath();
  ctx.arc(0, -lockH * 0.35, lockW * 0.34, Math.PI, 0, false);
  ctx.stroke();

  // Cuerpo del candado
  ctx.beginPath();
  ctx.roundRect(-lockW / 2, -lockH * 0.35, lockW, lockH, 4);
  ctx.fill();
  ctx.strokeStyle = '#FF6B00';
  ctx.stroke();

  // Ojo de cerradura digital
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, -lockH * 0.02, 3, 0, Math.PI * 2);
  ctx.fill();

  // Códigos encriptados orbitando el escudo
  const cipherTokens = ['AES-256', '0x7F', 'FIREWALL', 'SHA3', 'RSA', '0xFF'];
  ctx.font = '700 8.5px "Orbitron", monospace';
  ctx.textAlign = 'center';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - time * 0.0015;
    const tx = Math.cos(a) * (R * 1.15);
    const ty = Math.sin(a) * (R * 1.15);
    ctx.fillStyle = i % 2 === 0 ? '#FF6B00' : '#FFFFFF';
    ctx.fillText(cipherTokens[i], tx, ty);
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 9.5px "Orbitron", sans-serif';
  ctx.fillText('🛡️ CYBER FIREWALL', 0, R + 22);

  ctx.restore();
}

// Fusión "Innovación Digital": Núcleo de energía al juntar ambas manos
export function drawDigitalFusionCore(ctx, x, y, radius = 82, time = 0, opacity = 1) {
  if (opacity <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);

  const pulse = 1 + Math.sin(time * 0.015) * 0.12;
  const r = radius * pulse;

  const aura = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.65);
  aura.addColorStop(0, '#FFFFFF');
  aura.addColorStop(0.25, '#FF8C00');
  aura.addColorStop(0.55, 'rgba(255, 107, 0, 0.55)');
  aura.addColorStop(1, 'rgba(255, 85, 0, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.65, 0, Math.PI * 2);
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
  ctx.fillText('⚡ FUSIÓN INNOVACIÓN DIGITAL • TRON MATRIX', 0, r + 24);

  ctx.restore();
}

// ============================================================================
// 8. MINIJUEGO AR: HUD FLOTANTE "¿QUÉ MENCIÓN DE SISTEMAS ERES?" (IA vs CIBERSEGURIDAD)
// ============================================================================
export function drawHeadTiltQuizHUD(ctx, person, questionObj, questionIdx, totalQuestions, tiltChoice, fillProgress, W, H) {
  if (!person || !questionObj) return;

  const headTopY =
    (person.foreheadY ?? person.vrCenterY - person.vrWidth * 0.4) -
    (person.faceHeight || person.vrWidth * 0.85) * 0.62;

  const panelW = clamp(W * 0.48, 340, 580);
  const panelH = 136;
  const cx = clamp(person.vrCenterX || person.shoulderCenterX, panelW / 2 + 16, W - panelW / 2 - 16);
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
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.roundRect(left, top, panelW, panelH, 16);
  ctx.fill();
  ctx.stroke();

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
      const fillGrad = ctx.createLinearGradient(bx, optY, bx + optW, optY);
      fillGrad.addColorStop(0, 'rgba(255, 107, 0, 0.8)');
      fillGrad.addColorStop(1, 'rgba(255, 165, 40, 0.94)');
      ctx.fillStyle = fillGrad;
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
    ctx.font = '700 12px "Space Grotesk", sans-serif';
    ctx.fillText(label, bx + optW / 2, optY + 40);

    ctx.restore();
  };

  drawOptionBox(leftOptX, questionObj.leftOption, 'LEFT', '⬅️ INCLINA A LA IZQUIERDA (IA)');
  drawOptionBox(rightOptX, questionObj.rightOption, 'RIGHT', 'INCLINA A LA DERECHA (CIBER) ➡️');

  ctx.restore();
}

// Badge Monumental sobre el hombro y efectos holográficos al ganar Mención IA o Ciberseguridad
export function drawQuizResultEffects(ctx, person, winnerKey, W, H, time = 0) {
  if (!person || !winnerKey) return;

  const badgeW = 325;
  const badgeH = 62;
  const bx = clamp(person.shoulderCenterX - person.shoulderWidth * 0.55 - badgeW / 2, 16, W - badgeW - 16);
  const by = clamp(person.shoulderCenterY - person.shoulderWidth * 0.85, 86, H - 180);

  ctx.save();
  ctx.shadowColor = '#FF6B00';
  ctx.shadowBlur = 18;
  ctx.fillStyle = 'rgba(10, 10, 10, 0.94)';
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.roundRect(bx, by, badgeW, badgeH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FF6B00';
  ctx.font = '800 10px "Orbitron", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏆 #NuevaMallaSistemas #Unifranz', bx + badgeW / 2, by + 20);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 13.5px "Orbitron", sans-serif';
  const mentionLabel =
    winnerKey === 'IA'
      ? 'MENCIÓN: INTELIGENCIA ARTIFICIAL'
      : 'MENCIÓN: CIBERSEGURIDAD';
  ctx.fillText(mentionLabel, bx + badgeW / 2, by + 44);
  ctx.restore();

  if (winnerKey === 'IA') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cx = person.shoulderCenterX;
    const cy = person.shoulderCenterY;
    const rad = person.shoulderWidth * 1.15;
    const pts = [];

    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + time * 0.0012;
      const r = rad * (0.72 + Math.sin(time * 0.003 + i * 1.3) * 0.22);
      pts.push({
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r * 0.78,
      });
    }

    ctx.strokeStyle = 'rgba(255, 107, 0, 0.55)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < pts.length; i++) {
      const next = pts[(i + 1) % pts.length];
      const opp = pts[(i + 3) % pts.length];
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(next.x, next.y);
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(opp.x, opp.y);
      ctx.stroke();

      ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#FF6B00';
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (winnerKey === 'CIBERSEGURIDAD') {
    const chestX = person.shoulderCenterX;
    const chestY = person.shoulderCenterY + person.torsoHeight * 0.36;
    drawCybersecurityHandShield(ctx, chestX, chestY, Math.max(78, person.shoulderWidth * 0.48), time, 0.95);
  }
}

// ============================================================================
// 9. MATRIZ CIBERNÉTICA TRON & HAZ DE SINERGIA
// ============================================================================
export function drawMetaverseTronGrid(ctx, W, H, time = 0) {
  ctx.save();

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#050505');
  bg.addColorStop(0.45, '#0A0A0A');
  bg.addColorStop(0.5, '#1A0B02');
  bg.addColorStop(1, '#080808');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const horizonY = H * 0.48;

  ctx.strokeStyle = 'rgba(255, 107, 0, 0.7)';
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

  const speedOffset = (time * 0.001) % 1;
  const numRows = 10;
  for (let r = 0; r < numRows; r++) {
    const t = (r + speedOffset) / numRows;
    const perspective = Math.pow(t, 2.25);

    const fy = horizonY + perspective * (H - horizonY);
    ctx.strokeStyle = `rgba(255, 107, 0, ${clamp(perspective * 0.85, 0.08, 0.85)})`;
    ctx.lineWidth = 1 + perspective * 1.5;
    ctx.beginPath();
    ctx.moveTo(0, fy);
    ctx.lineTo(W, fy);
    ctx.stroke();

    const cy = horizonY - perspective * horizonY;
    ctx.strokeStyle = `rgba(255, 107, 0, ${clamp(perspective * 0.48, 0.05, 0.48)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(W, cy);
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
  const badgeW = 315;
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
  ctx.fillText('⚡ SINERGIA SISTEMAS • NUEVA MALLA 2026', midX, midY);

  ctx.restore();
}

// ============================================================================
// 10. DETECCIÓN DE GESTOS DE MANO Y SONRISA
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

/**
 * Clasifica el gesto de la mano:
 * - 'FIST': Puño cerrado / agarrando (invoca el Mando PlayStation DualSense holográfico)
 * - 'PEACE': Gesto de Paz ✌️ / 2 dedos levantados (cambia accesorio: Oculus Blanco -> Corona -> Ambos -> Hacker HUD)
 * - 'TYPING': Dedos extendidos horizontalmente / hacia abajo frente al torso (activa Teclado Holográfico)
 * - 'OPEN_PALM': Mano abierta levantada (activa Esfera IA en Mano Izquierda o Escudo Ciberseguridad en Mano Derecha)
 */
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

  // 1. Puño cerrado o gesto de agarrar -> Mando de PlayStation Holográfico
  if (indexFolded && middleFolded && ringFolded && pinkyFolded) {
    return 'FIST';
  }

  // 2. Gesto de Paz ✌️ (2 dedos levantados) -> Cambiar accesorio facial
  const indexMiddleSpread = dist(landmarks[8], landmarks[12]) > 0.028;
  if (indexUp && middleUp && ringFolded && pinkyFolded && indexMiddleSpread) {
    return 'PEACE';
  }

  // 3. Mano abierta con dedos hacia arriba -> Esfera IA (Izquierda) o Escudo Ciberseguridad (Derecha)
  if (indexUp && middleUp && ringUp && pinkyUp) {
    return 'OPEN_PALM';
  }

  // 4. Dedos extendidos hacia adelante o hacia abajo (como escribiendo en teclado en el aire)
  const fingersPointingForwardOrDown =
    (indexExt || middleExt) && landmarks[8].y >= landmarks[5].y - 0.04;
  if (fingersPointingForwardOrDown) {
    return 'TYPING';
  }

  return 'RAISED_PALM';
}

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
