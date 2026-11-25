// Advanced Math & Holographic AR Renderers for UNIFRANZ AR Mirror Experience (Nueva Malla 2026)

export const lerp = (start, end, factor) => start + (end - start) * factor;

export const lerpAngle = (a, b, t) => {
  const diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + diff * t;
};

export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

// Future Roles for Nueva Malla Curricular Roulette
export const FUTURE_ROLES = {
  SIS: [
    'Arquitecto de Inteligencia Artificial',
    'Ingeniero Cloud & DevOps',
    'Especialista en Ciberseguridad',
    'Líder en Innovación Digital',
  ],
  DER: [
    'Especialista en Derecho Digital & LegalTech',
    'Experto en Litigación Estratégica',
    'Consultor en Derecho Corporativo Global',
    'Defensor de Derechos Humanos & Tecnología',
  ],
  VR_ONLY: [
    'Arquitecto de Inteligencia Artificial',
    'Especialista en Derecho Digital & LegalTech',
    'Líder en Innovación Digital',
    'Consultor en Derecho Corporativo Global',
  ],
};

// Pixel Art T-Rex frames (Frame 0: left leg step, Frame 1: right leg step)
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

// Companion Pixel Dino walking smoothly along person's left shoulder
export function drawWalkingShoulderDino(ctx, shoulderCenterX, shoulderCenterY, shoulderWidth, shoulderAngle, time) {
  ctx.save();
  ctx.translate(shoulderCenterX, shoulderCenterY);
  ctx.rotate(shoulderAngle);

  // Left shoulder area (on mirrored screen, person's left shoulder is to the right side of torso center)
  const patrolCenter = shoulderWidth * 0.34;
  const patrolRange = shoulderWidth * 0.14;
  const walkCycle = time * 0.0022;
  const offsetX = patrolCenter + Math.sin(walkCycle) * patrolRange;
  const dir = Math.cos(walkCycle); // >0 moving right, <0 moving left
  const bounceY = -Math.abs(Math.sin(time * 0.012)) * 4;
  const baseOffsetY = -shoulderWidth * 0.22 + bounceY;

  const frameIdx = Math.floor(time / 160) % 2;
  const pSize = clamp(shoulderWidth * 0.016, 2.2, 4.2);

  // Glowing holographic platform under dino's feet
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255, 107, 0, 0.45)';
  ctx.shadowColor = '#FF6B00';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.ellipse(offsetX, baseOffsetY + pSize * 6, pSize * 6, pSize * 1.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // White pixel-art dino with neon orange glow
  ctx.shadowColor = '#FF6B00';
  ctx.shadowBlur = 12;
  drawPixelDino(ctx, offsetX, baseOffsetY, pSize, '#FFFFFF', 0.98, frameIdx, dir < 0);

  // Mini floating tag above dino
  ctx.font = '700 9px "Orbitron", monospace';
  ctx.fillStyle = '#FF6B00';
  ctx.textAlign = 'center';
  ctx.fillText('SIS-BOT', offsetX, baseOffsetY - pSize * 6.8);
  ctx.restore();

  ctx.restore();
}

// Calculate palm center and inclination angle from landmarks 0, 5, 9, 13, 17
export function computePalmCenterAndTilt(handLm, toScreenX, toScreenY) {
  const indices = [0, 5, 9, 13, 17];
  let sumX = 0;
  let sumY = 0;
  indices.forEach((idx) => {
    sumX += toScreenX(handLm[idx].x);
    sumY += toScreenY(handLm[idx].y);
  });
  const cx = sumX / indices.length;
  const cy = sumY / indices.length;

  // Compute hand tilt from index MCP (5) to pinky MCP (17) + wrist (0) to middle MCP (9)
  const p5x = toScreenX(handLm[5].x);
  const p5y = toScreenY(handLm[5].y);
  const p17x = toScreenX(handLm[17].x);
  const p17y = toScreenY(handLm[17].y);

  const wristX = toScreenX(handLm[0].x);
  const middleX = toScreenX(handLm[9].x);
  const palmSpan = Math.hypot(p17x - p5x, p17y - p5y);

  // Horizontal inclination angle based on hand sideways lean and knuckle line
  const knuckleTilt = Math.atan2(p17y - p5y, Math.abs(p17x - p5x) + 1);
  const lateralLean = clamp((middleX - wristX) / (palmSpan + 20), -0.65, 0.65);
  const tiltAngle = clamp(lateralLean * 0.7 + knuckleTilt * 0.35, -0.6, 0.6);

  return { x: cx, y: cy, tiltAngle, palmSpan };
}

// SIS Power 1: Neural Network & Binary Code Holographic Sphere rotating on palm center
export function drawNeuralBinarySphere(ctx, x, y, radius = 48, time = 0) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);

  // Core radial glow
  const coreGrad = ctx.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius * 1.35);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  coreGrad.addColorStop(0.25, 'rgba(255, 107, 0, 0.65)');
  coreGrad.addColorStop(0.7, 'rgba(255, 85, 0, 0.18)');
  coreGrad.addColorStop(1, 'rgba(255, 107, 0, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.35, 0, Math.PI * 2);
  ctx.fill();

  // 3D Rotating Neural Nodes on a sphere
  const nodeCount = 14;
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

  // Draw neural synaptic connections
  ctx.lineWidth = 1.3;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (dist < radius * 0.78) {
        const alpha = clamp((nodes[i].z + nodes[j].z + 2) * 0.22, 0.12, 0.75);
        ctx.strokeStyle = i % 2 === 0 ? `rgba(255, 107, 0, ${alpha})` : `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }
  }

  // Outer gyroscope orbital rings
  ctx.save();
  ctx.rotate(rotY);
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#FF6B00';
  ctx.shadowBlur = 12;
  ctx.setLineDash([10, 6]);
  ctx.beginPath();
  ctx.ellipse(0, 0, radius, radius * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.rotate(-rotY * 1.2 + 1.1);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.92, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Draw glowing binary digits at nodes
  ctx.font = '800 10px "Orbitron", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  nodes.forEach((n) => {
    const scale = 0.75 + (n.z + 1) * 0.35;
    ctx.fillStyle = n.z > 0 ? '#FFFFFF' : '#FF6B00';
    ctx.shadowColor = '#FF6B00';
    ctx.shadowBlur = 8;
    ctx.fillText(n.bit, n.x, n.y);
    ctx.beginPath();
    ctx.arc(n.x, n.y, 2 * scale, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

// SIS Power 2: Digital Fusion Energy Core when both hands come together near chest
export function drawDigitalFusionCore(ctx, x, y, radius = 82, time = 0) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);

  const pulse = 1 + Math.sin(time * 0.015) * 0.14;
  const r = radius * pulse;

  // Intense plasma aura
  const aura = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.7);
  aura.addColorStop(0, '#FFFFFF');
  aura.addColorStop(0.22, '#FF8C00');
  aura.addColorStop(0.55, 'rgba(255, 107, 0, 0.55)');
  aura.addColorStop(1, 'rgba(255, 85, 0, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2);
  ctx.fill();

  // High-speed energy arcs
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate(time * (0.004 + i * 0.002) * (i % 2 === 0 ? 1 : -1));
    ctx.strokeStyle = i === 0 ? '#FFFFFF' : '#FF6B00';
    ctx.lineWidth = 3 - i * 0.6;
    ctx.shadowColor = '#FF6B00';
    ctx.shadowBlur = 20;
    ctx.setLineDash([18, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, r * (0.65 + i * 0.2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Core label
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = '#FF6B00';
  ctx.shadowBlur = 16;
  ctx.font = '900 14px "Orbitron", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AI CORE // FUSIÓN DIGITAL', 0, r + 24);

  ctx.restore();
}

// DER Power 1: Holographic Scales of Justice that tilt dynamically with hand inclination
export function drawHolographicScales(ctx, x, y, size = 56, time = 0, dynamicTilt = null) {
  const hoverOffset = Math.sin(time * 0.005) * 5;
  const tilt = dynamicTilt !== null ? clamp(dynamicTilt, -0.55, 0.55) : Math.sin(time * 0.003) * 0.14;
  const cy = y + hoverOffset;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, cy);

  // Outer holographic ring aura
  const grad = ctx.createRadialGradient(0, 0, size * 0.15, 0, 0, size * 1.2);
  grad.addColorStop(0, 'rgba(255, 107, 0, 0.45)');
  grad.addColorStop(0.6, 'rgba(255, 185, 50, 0.16)');
  grad.addColorStop(1, 'rgba(255, 107, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, size * 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Rotating dashed tech ring
  ctx.save();
  ctx.rotate(time * 0.0018);
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.85)';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.88, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Scales pillar & base
  ctx.shadowColor = '#FF6B00';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.6;
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

  // Top crown node
  ctx.fillStyle = '#FF6B00';
  ctx.beginPath();
  ctx.arc(0, -size * 0.52, 5, 0, Math.PI * 2);
  ctx.fill();

  // Dynamic Balance Crossbeam
  ctx.save();
  ctx.translate(0, -size * 0.38);
  ctx.rotate(tilt);

  const beamHalf = size * 0.58;
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-beamHalf, 0);
  ctx.lineTo(beamHalf, 0);
  ctx.stroke();

  // Left and Right pans (hang vertically from tilted beam)
  [-beamHalf, beamHalf].forEach((bx) => {
    ctx.save();
    ctx.translate(bx, 0);
    ctx.rotate(-tilt);

    const dropH = size * 0.42;
    const panW = size * 0.25;

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-panW, dropH);
    ctx.moveTo(0, 0);
    ctx.lineTo(panW, dropH);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 107, 0, 0.55)';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
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

// DER Power 2: Hexagonal LegalTech Shield in front of torso when both hands are raised
export function drawLegalTechShield(ctx, centerX, centerY, radius = 130, time = 0) {
  ctx.save();
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

  // Translucent hexagonal energy field
  const hexGrad = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R);
  hexGrad.addColorStop(0, 'rgba(255, 107, 0, 0.12)');
  hexGrad.addColorStop(0.7, 'rgba(255, 107, 0, 0.28)');
  hexGrad.addColorStop(1, 'rgba(255, 255, 255, 0.45)');

  drawHex(R);
  ctx.fillStyle = hexGrad;
  ctx.fill();

  ctx.shadowColor = '#FF6B00';
  ctx.shadowBlur = 22;
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Inner concentric white hexagon
  drawHex(R * 0.82);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([14, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Corner nodes
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const hx = Math.cos(angle) * R;
    const hy = Math.sin(angle) * R;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Banner inside Shield: "JUSTICIA & INNOVACIÓN"
  ctx.fillStyle = 'rgba(10, 10, 10, 0.82)';
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 1.8;
  const bw = R * 1.65;
  const bh = 38;
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = '#FF6B00';
  ctx.shadowBlur = 12;
  ctx.font = `900 ${Math.max(12, Math.round(R * 0.115))}px "Orbitron", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('JUSTICIA & INNOVACIÓN', 0, 0);

  ctx.fillStyle = '#FF6B00';
  ctx.font = '700 10px "Orbitron", sans-serif';
  ctx.fillText('ESCUDO LEGALTECH • UNIFRANZ', 0, -bh / 2 - 12);

  ctx.restore();
}

// Tron / Cyberspace Perspective Grid Backdrop for UNIFRANZ Metaverse VR Mode
export function drawMetaverseTronGrid(ctx, W, H, time = 0) {
  ctx.save();

  // Deep #0A0A0A Cyberspace background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#050505');
  bg.addColorStop(0.45, '#0A0A0A');
  bg.addColorStop(0.5, '#180B02');
  bg.addColorStop(1, '#080808');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const horizonY = H * 0.48;

  // Glowing horizon core line
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const hGlow = ctx.createLinearGradient(0, horizonY - 25, 0, horizonY + 25);
  hGlow.addColorStop(0, 'rgba(255, 107, 0, 0)');
  hGlow.addColorStop(0.5, 'rgba(255, 107, 0, 0.55)');
  hGlow.addColorStop(1, 'rgba(255, 107, 0, 0)');
  ctx.fillStyle = hGlow;
  ctx.fillRect(0, horizonY - 25, W, 50);

  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#FF6B00';
  ctx.shadowBlur = 16;

  // Perspective radial lines from vanishing point (Bottom Floor & Top Ceiling)
  const vpX = W * 0.5;
  const numRays = 20;
  ctx.beginPath();
  for (let i = -numRays; i <= numRays; i++) {
    const spread = (i / numRays) * W * 1.45;
    // Floor rays
    ctx.moveTo(vpX, horizonY);
    ctx.lineTo(vpX + spread, H);
    // Ceiling rays
    ctx.moveTo(vpX, horizonY);
    ctx.lineTo(vpX + spread, 0);
  }
  ctx.stroke();

  // Animated forward-moving horizontal perspective grid lines
  const speedOffset = (time * 0.00085) % 1;
  const numRows = 12;
  for (let r = 0; r < numRows; r++) {
    const t = (r + speedOffset) / numRows;
    const perspective = Math.pow(t, 2.25);

    // Floor horizontal line
    const fy = horizonY + perspective * (H - horizonY);
    ctx.strokeStyle = `rgba(255, 107, 0, ${clamp(perspective * 0.85, 0.08, 0.85)})`;
    ctx.lineWidth = 1 + perspective * 1.8;
    ctx.beginPath();
    ctx.moveTo(0, fy);
    ctx.lineTo(W, fy);
    ctx.stroke();

    // Ceiling horizontal line
    const cy = horizonY - perspective * horizonY;
    ctx.strokeStyle = `rgba(255, 107, 0, ${clamp(perspective * 0.5, 0.05, 0.5)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(W, cy);
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();
}

// Multi-Person Synergy Beam connecting two detected students
export function drawSynergyConnectionBeam(ctx, x1, y1, x2, y2, time = 0) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  // Main pulsing energy plasma beam
  ctx.shadowColor = '#FF6B00';
  ctx.shadowBlur = 24;
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Animated sine-wave electricity along beam
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bx = lerp(x1, x2, t);
    const by = lerp(y1, y2, t) + Math.sin(t * Math.PI * 5 + time * 0.014) * 14 * Math.sin(t * Math.PI);
    if (i === 0) ctx.moveTo(bx, by);
    else ctx.lineTo(bx, by);
  }
  ctx.stroke();

  // Anchor energy rings on each person
  [
    { x: x1, y: y1 },
    { x: x2, y: y2 },
  ].forEach((pt) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
    ctx.fill();
  });

  // Central Badge: "SINERGIA UNIFRANZ • NUEVA MALLA 2026"
  ctx.globalCompositeOperation = 'source-over';
  const badgeW = 325;
  const badgeH = 38;
  ctx.fillStyle = 'rgba(10, 10, 10, 0.92)';
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2.2;
  ctx.shadowColor = '#FF6B00';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.roundRect(midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH, 19);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 12px "Orbitron", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡ SINERGIA UNIFRANZ • NUEVA MALLA 2026', midX, midY);

  ctx.restore();
}

// Convert dark/black pixels of VR headset image to transparent if needed
export function processVrHeadsetImage(img) {
  const offCanvas = document.createElement('canvas');
  offCanvas.width = img.naturalWidth || img.width;
  offCanvas.height = img.naturalHeight || img.height;
  const octx = offCanvas.getContext('2d');
  octx.drawImage(img, 0, 0);

  try {
    const imgData = octx.getImageData(0, 0, offCanvas.width, offCanvas.height);
    const data = imgData.data;
    const cornerAlpha = data[3];
    const cornerLuma = (data[0] + data[1] + data[2]) / 3;

    if (cornerAlpha > 240 && cornerLuma < 18) {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const maxCh = Math.max(r, g, b);
        if (maxCh < 15) {
          data[i + 3] = 0;
        } else if (maxCh < 45) {
          data[i + 3] = Math.floor(((maxCh - 15) / 30) * 255);
        }
      }
      octx.putImageData(imgData, 0, 0);
    }
  } catch (e) {
    // Fallback
  }

  return offCanvas;
}

// Detect hand gestures from MediaPipe HandLandmarker 21 points
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

// Detect genuine big smile from FaceLandmarker blendshapes or mouth landmarks
export function detectSmileFromFace(faceLandmarks, faceBlendshapes, faceIdx = 0) {
  if (faceBlendshapes && faceBlendshapes.length > faceIdx) {
    const categories = faceBlendshapes[faceIdx].categories || [];
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
