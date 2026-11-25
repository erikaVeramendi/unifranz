// Math & AR Helper Utilities for UNIFRANZ AR Mirror Experience

export const lerp = (start, end, factor) => start + (end - start) * factor;

export const lerpAngle = (a, b, t) => {
  const diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + diff * t;
};

export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

// Pixel Art T-Rex matrix (12x11) inspired by the Ingeniería de Sistemas shirt logo
export const DINO_PIXEL_MATRIX = [
  [0,0,0,0,0,0,1,1,1,1,1,0],
  [0,0,0,0,0,1,1,0,1,1,1,1],
  [0,0,0,0,0,1,1,1,1,1,1,1],
  [0,0,0,0,0,1,1,1,1,0,0,0],
  [1,0,0,0,1,1,1,1,1,1,1,0],
  [1,1,0,1,1,1,1,1,1,0,1,0],
  [1,1,1,1,1,1,1,1,1,0,0,0],
  [0,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,1,0,0,1,0,0,0,0,0],
  [0,0,0,1,1,0,1,1,0,0,0,0]
];

export function drawPixelDino(ctx, x, y, pixelSize = 2.5, color = '#FF6B00', alpha = 0.9) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  const rows = DINO_PIXEL_MATRIX.length;
  const cols = DINO_PIXEL_MATRIX[0].length;
  const startX = x - (cols * pixelSize) / 2;
  const startY = y - (rows * pixelSize) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (DINO_PIXEL_MATRIX[r][c]) {
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

// Draw minimalist holographic Scales of Justice above raised hand palm
export function drawHolographicScales(ctx, x, y, size = 56, time = 0) {
  const hoverOffset = Math.sin(time * 0.005) * 6;
  const tilt = Math.sin(time * 0.003) * 0.12;
  const cy = y + hoverOffset;

  ctx.save();
  ctx.translate(x, cy);

  // Outer holographic ring aura
  const grad = ctx.createRadialGradient(0, 0, size * 0.15, 0, 0, size * 1.15);
  grad.addColorStop(0, 'rgba(255, 107, 0, 0.38)');
  grad.addColorStop(0.6, 'rgba(255, 185, 50, 0.15)');
  grad.addColorStop(1, 'rgba(255, 107, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, size * 1.15, 0, Math.PI * 2);
  ctx.fill();

  // Rotating dashed tech ring
  ctx.save();
  ctx.rotate(time * 0.0015);
  ctx.strokeStyle = 'rgba(255, 165, 40, 0.75)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Scales pillar & base
  ctx.shadowColor = '#FF6B00';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Base pedestal
  ctx.beginPath();
  ctx.moveTo(-size * 0.35, size * 0.55);
  ctx.lineTo(size * 0.35, size * 0.55);
  ctx.moveTo(-size * 0.22, size * 0.46);
  ctx.lineTo(size * 0.22, size * 0.46);
  // Central vertical pillar
  ctx.moveTo(0, size * 0.46);
  ctx.lineTo(0, -size * 0.48);
  ctx.stroke();

  // Top crown node
  ctx.fillStyle = '#FF6B00';
  ctx.beginPath();
  ctx.arc(0, -size * 0.52, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Balance crossbeam
  ctx.save();
  ctx.translate(0, -size * 0.38);
  ctx.rotate(tilt);

  const beamHalf = size * 0.56;
  ctx.strokeStyle = '#FF8C00';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-beamHalf, 0);
  ctx.lineTo(beamHalf, 0);
  ctx.stroke();

  // Left and Right pans (keep vertical while hanging from tilted beam)
  [-beamHalf, beamHalf].forEach((bx) => {
    ctx.save();
    ctx.translate(bx, 0);
    ctx.rotate(-tilt);

    const dropH = size * 0.42;
    const panW = size * 0.24;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-panW, dropH);
    ctx.moveTo(0, 0);
    ctx.lineTo(panW, dropH);
    ctx.stroke();

    // Glowing pan bowl
    ctx.fillStyle = 'rgba(255, 107, 0, 0.45)';
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

  // Label below hologram
  ctx.font = '700 10px "Orbitron", sans-serif';
  ctx.fillStyle = '#FFB347';
  ctx.textAlign = 'center';
  ctx.fillText('LEX // HOLOGRAMA ACTIVO', 0, size * 0.82);

  ctx.restore();
}

// Convert dark/black pixels of VR headset image to transparent if needed, while preserving neon glow
export function processVrHeadsetImage(img) {
  const offCanvas = document.createElement('canvas');
  offCanvas.width = img.naturalWidth || img.width;
  offCanvas.height = img.naturalHeight || img.height;
  const octx = offCanvas.getContext('2d');
  octx.drawImage(img, 0, 0);

  try {
    const imgData = octx.getImageData(0, 0, offCanvas.width, offCanvas.height);
    const data = imgData.data;

    // Check top-left corner pixel: if it's opaque black (#000000), apply chroma/luma key removal
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
    // Fallback if canvas tainted
  }

  return offCanvas;
}

// Detect hand gestures from MediaPipe HandLandmarker 21 points
// Returns: 'OPEN_PALM' | 'PEACE' | 'RAISED_PALM' | null
export function analyzeHandGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;

  const wrist = landmarks[0];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // Check if finger tip is significantly further from wrist than its PIP joint
  const indexExtended = dist(landmarks[8], wrist) > dist(landmarks[6], wrist) * 1.18 && landmarks[8].y < landmarks[6].y;
  const middleExtended = dist(landmarks[12], wrist) > dist(landmarks[10], wrist) * 1.18 && landmarks[12].y < landmarks[10].y;
  const ringExtended = dist(landmarks[16], wrist) > dist(landmarks[14], wrist) * 1.15 && landmarks[16].y < landmarks[14].y;
  const pinkyExtended = dist(landmarks[20], wrist) > dist(landmarks[18], wrist) * 1.15 && landmarks[20].y < landmarks[18].y;
  const thumbExtended = dist(landmarks[4], landmarks[17]) > dist(landmarks[3], landmarks[17]) * 1.12;

  const ringFolded = dist(landmarks[16], wrist) < dist(landmarks[14], wrist) * 1.08;
  const pinkyFolded = dist(landmarks[20], wrist) < dist(landmarks[18], wrist) * 1.08;

  // Hand raised check (wrist in upper 78% of frame)
  const isRaised = wrist.y < 0.78;

  // 1. Open Hand (5 fingers extended & raised)
  if (isRaised && indexExtended && middleExtended && ringExtended && pinkyExtended && thumbExtended) {
    return 'OPEN_PALM';
  }

  // 2. Peace & Love gesture (✌️: index and middle extended, ring and pinky folded)
  const indexMiddleSpread = dist(landmarks[8], landmarks[12]) > 0.032;
  if (isRaised && indexExtended && middleExtended && ringFolded && pinkyFolded && indexMiddleSpread) {
    return 'PEACE';
  }

  // 3. Any raised palm (for holding holographic scales in Derecho mode)
  if (isRaised && (indexExtended || middleExtended)) {
    return 'RAISED_PALM';
  }

  return null;
}

// Detect genuine big smile from FaceLandmarker blendshapes or mouth landmarks
export function detectSmileFromFace(faceLandmarks, faceBlendshapes) {
  if (faceBlendshapes && faceBlendshapes.length > 0) {
    const categories = faceBlendshapes[0].categories || [];
    const smileLeft = categories.find((c) => c.categoryName === 'mouthSmileLeft')?.score || 0;
    const smileRight = categories.find((c) => c.categoryName === 'mouthSmileRight')?.score || 0;
    if ((smileLeft + smileRight) / 2 > 0.68) {
      return true;
    }
  }

  // Geometric fallback using mouth corners (61, 291) vs eye distance (33, 263)
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
