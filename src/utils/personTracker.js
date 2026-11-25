import { AR_CONFIG } from '../config.js';
import {
  analyzeHandGesture,
  clamp,
  computePalmCenterAndTilt,
  lerp,
  lerpAngle,
} from './arHelpers.js';

let nextPersonId = 1;
let nextHandId = 1;

/**
 * Calcula el ángulo de rotación entre el punto izquierdo en pantalla y el derecho en pantalla
 * evitando inversiones de 180°.
 */
function orderedAngle(ax, ay, bx, by, maxAbsRad) {
  const lx = ax <= bx ? ax : bx;
  const ly = ax <= bx ? ay : by;
  const rx = ax <= bx ? bx : ax;
  const ry = ax <= bx ? by : ay;
  const angle = Math.atan2(ry - ly, Math.max(1, rx - lx));
  return clamp(angle, -maxAbsRad, maxAbsRad);
}

/**
 * Extrae y valida poses desde PoseLandmarker (hombros 11 y 12, cadera 23 y 24, y respaldo de ojos/orejas/nariz).
 */
export function extractValidPoses(rawPoses, toScreenX, toScreenY) {
  const threshold = AR_CONFIG.VISIBILITY_THRESHOLD;
  const hipThreshold = AR_CONFIG.HIP_VISIBILITY_THRESHOLD ?? 0.25;
  const eyeThreshold = AR_CONFIG.POSE_EYE_VISIBILITY_THRESHOLD;
  const results = [];

  for (let i = 0; i < rawPoses.length; i++) {
    const lm = rawPoses[i];
    if (!lm || !lm[11] || !lm[12]) continue;

    const vis11 = lm[11].visibility ?? 1;
    const vis12 = lm[12].visibility ?? 1;
    if (vis11 < threshold || vis12 < threshold) continue;

    const x11 = toScreenX(lm[11].x);
    const y11 = toScreenY(lm[11].y);
    const x12 = toScreenX(lm[12].x);
    const y12 = toScreenY(lm[12].y);

    const shoulderWidth = Math.hypot(x12 - x11, y12 - y11);
    if (shoulderWidth < 18) continue;

    const shoulderCenterX = (x11 + x12) / 2;
    const shoulderCenterY = (y11 + y12) / 2;
    const shoulderAngle = orderedAngle(x12, y12, x11, y11, 0.58);

    let hipCenterX = shoulderCenterX;
    let hipCenterY = shoulderCenterY + shoulderWidth * 1.42;
    let torsoHeight = shoulderWidth * 1.42;

    if (lm[23] && lm[24]) {
      const vis23 = lm[23].visibility ?? 1;
      const vis24 = lm[24].visibility ?? 1;
      const x23 = toScreenX(lm[23].x);
      const y23 = toScreenY(lm[23].y);
      const x24 = toScreenX(lm[24].x);
      const y24 = toScreenY(lm[24].y);

      if (vis23 >= hipThreshold || vis24 >= hipThreshold) {
        hipCenterX = (x23 + x24) / 2;
        hipCenterY = (y23 + y24) / 2;
        const measuredTorso = Math.hypot(
          hipCenterX - shoulderCenterX,
          hipCenterY - shoulderCenterY
        );
        if (hipCenterY > shoulderCenterY + shoulderWidth * 0.45 && measuredTorso > shoulderWidth * 0.65) {
          torsoHeight = clamp(measuredTorso, shoulderWidth * 0.95, shoulderWidth * 2.35);
        }
      }
    }

    // Respaldo del Visor Oculus desde Pose cuando la persona está lejos
    let poseVrX = shoulderCenterX + Math.sin(shoulderAngle) * shoulderWidth * 0.56;
    let poseVrY = shoulderCenterY - Math.cos(shoulderAngle) * shoulderWidth * 0.56;
    let poseVrAngle = shoulderAngle;
    let poseVrWidth = shoulderWidth * AR_CONFIG.VR_WIDTH_FROM_SHOULDERS;

    const eyeL = lm[2];
    const eyeR = lm[5];
    const eyesVisible =
      eyeL &&
      eyeR &&
      (eyeL.visibility ?? 0) >= eyeThreshold &&
      (eyeR.visibility ?? 0) >= eyeThreshold;

    if (eyesVisible) {
      const ex1 = toScreenX(eyeL.x);
      const ey1 = toScreenY(eyeL.y);
      const ex2 = toScreenX(eyeR.x);
      const ey2 = toScreenY(eyeR.y);
      const poseEyeDist = Math.hypot(ex1 - ex2, ey1 - ey2);

      if (poseEyeDist > 4) {
        poseVrX = (ex1 + ex2) / 2;
        poseVrY = (ey1 + ey2) / 2;
        poseVrAngle = orderedAngle(ex1, ey1, ex2, ey2, AR_CONFIG.VR_MAX_ROLL_RAD);
      }

      const earL = lm[7];
      const earR = lm[8];
      const earsVisible =
        earL &&
        earR &&
        (earL.visibility ?? 0) >= eyeThreshold &&
        (earR.visibility ?? 0) >= eyeThreshold;

      if (earsVisible) {
        const ax1 = toScreenX(earL.x);
        const ay1 = toScreenY(earL.y);
        const ax2 = toScreenX(earR.x);
        const ay2 = toScreenY(earR.y);
        const earDist = Math.hypot(ax1 - ax2, ay1 - ay2);

        if (earDist > Math.max(poseEyeDist * 1.25, shoulderWidth * 0.16)) {
          poseVrWidth = earDist * AR_CONFIG.VR_WIDTH_FROM_EARS;
        }
      }
    } else if (lm[0] && (lm[0].visibility ?? 0) >= eyeThreshold) {
      const noseX = toScreenX(lm[0].x);
      const noseY = toScreenY(lm[0].y);
      poseVrX = noseX + Math.sin(shoulderAngle) * shoulderWidth * 0.08;
      poseVrY = noseY - Math.cos(shoulderAngle) * shoulderWidth * 0.08;
    }

    results.push({
      shoulderCenterX,
      shoulderCenterY,
      hipCenterX,
      hipCenterY,
      shoulderWidth,
      torsoHeight,
      shoulderAngle,
      poseVrX,
      poseVrY,
      poseVrWidth,
      poseVrAngle,
    });
  }

  return results.slice(0, AR_CONFIG.MAX_PERSONS);
}

/**
 * Extrae y valida rostros desde FaceLandmarker (ojos 33 y 263, frente 10, sienes 127 y 356, mentón 152, puente nasal 168/6).
 */
export function extractValidFaces(rawFaces, faceBlendshapes, toScreenX, toScreenY) {
  const results = [];

  for (let i = 0; i < rawFaces.length; i++) {
    const lm = rawFaces[i];
    if (!lm || !lm[33] || !lm[263]) continue;

    const ex1 = toScreenX(lm[33].x);
    const ey1 = toScreenY(lm[33].y);
    const ex2 = toScreenX(lm[263].x);
    const ey2 = toScreenY(lm[263].y);

    const eyeOuterDist = Math.hypot(ex1 - ex2, ey1 - ey2);
    if (eyeOuterDist < 6) continue;

    const eyeCenterX = (ex1 + ex2) / 2;
    const eyeCenterY = (ey1 + ey2) / 2;

    const rightEyeX = ex1 <= ex2 ? ex1 : ex2;
    const rightEyeY = ex1 <= ex2 ? ey1 : ey2;

    const noseLm = lm[1] || { x: (lm[33].x + lm[263].x) / 2, y: (lm[33].y + lm[263].y) / 2 };
    const noseX = toScreenX(noseLm.x);
    const noseY = toScreenY(noseLm.y);

    const headRoll = orderedAngle(ex1, ey1, ex2, ey2, AR_CONFIG.VR_MAX_ROLL_RAD);
    const headYaw = clamp((noseX - eyeCenterX) / (eyeOuterDist * 0.7), -0.8, 0.8);
    const headPitch = clamp((noseY - eyeCenterY) / (eyeOuterDist * 0.9) - 0.35, -0.5, 0.5);

    const foreheadX = lm[10] ? toScreenX(lm[10].x) : eyeCenterX - Math.sin(headRoll) * eyeOuterDist * 0.65;
    const foreheadY = lm[10] ? toScreenY(lm[10].y) : eyeCenterY - Math.cos(headRoll) * eyeOuterDist * 0.65;

    const chinX = lm[152] ? toScreenX(lm[152].x) : eyeCenterX + Math.sin(headRoll) * eyeOuterDist * 1.35;
    const chinY = lm[152] ? toScreenY(lm[152].y) : eyeCenterY + Math.cos(headRoll) * eyeOuterDist * 1.35;

    const faceHeight = Math.max(eyeOuterDist * 1.45, Math.hypot(chinX - foreheadX, chinY - foreheadY));

    let templeWidth = eyeOuterDist * 1.48;
    if (lm[127] && lm[356]) {
      const tx1 = toScreenX(lm[127].x);
      const ty1 = toScreenY(lm[127].y);
      const tx2 = toScreenX(lm[356].x);
      const ty2 = toScreenY(lm[356].y);
      templeWidth = Math.max(eyeOuterDist * 1.2, Math.hypot(tx2 - tx1, ty2 - ty1));
    }

    results.push({
      rawLandmarks: lm,
      blendshapes: faceBlendshapes?.[i] || null,
      eyeCenterX,
      eyeCenterY,
      eyeOuterDist,
      rightEyeX,
      rightEyeY,
      foreheadX,
      foreheadY,
      chinX,
      chinY,
      faceHeight,
      templeWidth,
      noseX,
      noseY,
      headRoll,
      headYaw,
      headPitch,
    });
  }

  return results.slice(0, AR_CONFIG.MAX_PERSONS);
}

/**
 * Empareja cada cara con el cuerpo correspondiente.
 */
export function pairFacesToBodies(poses, faces, canvasWidth) {
  const maxPairDist = canvasWidth * AR_CONFIG.FACE_BODY_MAX_DIST_NORM;
  const candidates = [];

  for (let fIdx = 0; fIdx < faces.length; fIdx++) {
    const face = faces[fIdx];
    for (let pIdx = 0; pIdx < poses.length; pIdx++) {
      const pose = poses[pIdx];
      if (face.noseY > pose.shoulderCenterY + pose.shoulderWidth * 0.45) continue;

      const dist = Math.hypot(
        face.noseX - pose.shoulderCenterX,
        face.noseY - pose.shoulderCenterY
      );
      if (dist <= maxPairDist) {
        candidates.push({ fIdx, pIdx, dist });
      }
    }
  }

  candidates.sort((a, b) => a.dist - b.dist);
  const usedFaces = new Set();
  const usedPoses = new Set();
  const poseToFace = new Map();

  for (const c of candidates) {
    if (usedFaces.has(c.fIdx) || usedPoses.has(c.pIdx)) continue;
    usedFaces.add(c.fIdx);
    usedPoses.add(c.pIdx);
    poseToFace.set(c.pIdx, faces[c.fIdx]);
  }

  const detections = [];
  for (let pIdx = 0; pIdx < poses.length; pIdx++) {
    detections.push({
      pose: poses[pIdx],
      face: poseToFace.get(pIdx) || null,
    });
  }

  for (let fIdx = 0; fIdx < faces.length; fIdx++) {
    if (!usedFaces.has(fIdx)) {
      detections.push({
        pose: null,
        face: faces[fIdx],
      });
    }
  }

  return detections.slice(0, AR_CONFIG.MAX_PERSONS);
}

/**
 * Actualiza el seguimiento multi-persona con interpolación suave.
 */
export function updateTrackedPersons(trackedPersons, detections, canvasWidth, now) {
  const maxTrackDist = canvasWidth * AR_CONFIG.BODY_TRACK_MAX_DIST_NORM;
  const alpha = AR_CONFIG.SMOOTHING_NEW_WEIGHT;

  const getDetAnchor = (det) =>
    det.pose
      ? { x: det.pose.shoulderCenterX, y: det.pose.shoulderCenterY }
      : { x: det.face.eyeCenterX, y: det.face.eyeCenterY };

  const getPersonAnchor = (p) =>
    p.hasPose
      ? { x: p.shoulderCenterX, y: p.shoulderCenterY }
      : { x: p.vrCenterX, y: p.vrCenterY };

  const pairs = [];
  for (let dIdx = 0; dIdx < detections.length; dIdx++) {
    const dAnchor = getDetAnchor(detections[dIdx]);
    for (let tIdx = 0; tIdx < trackedPersons.length; tIdx++) {
      const tAnchor = getPersonAnchor(trackedPersons[tIdx]);
      const dist = Math.hypot(dAnchor.x - tAnchor.x, dAnchor.y - tAnchor.y);
      if (dist <= maxTrackDist) {
        pairs.push({ dIdx, tIdx, dist });
      }
    }
  }

  pairs.sort((a, b) => a.dist - b.dist);
  const matchedDet = new Set();
  const matchedTracked = new Set();

  for (const pair of pairs) {
    if (matchedDet.has(pair.dIdx) || matchedTracked.has(pair.tIdx)) continue;
    matchedDet.add(pair.dIdx);
    matchedTracked.add(pair.tIdx);

    const person = trackedPersons[pair.tIdx];
    const det = detections[pair.dIdx];
    person.lastSeenTime = now;

    if (det.pose) {
      if (!person.hasPose) {
        person.shoulderCenterX = det.pose.shoulderCenterX;
        person.shoulderCenterY = det.pose.shoulderCenterY;
        person.hipCenterX = det.pose.hipCenterX;
        person.hipCenterY = det.pose.hipCenterY;
        person.shoulderWidth = det.pose.shoulderWidth;
        person.torsoHeight = det.pose.torsoHeight;
        person.shoulderAngle = det.pose.shoulderAngle;
      } else {
        person.shoulderCenterX = lerp(person.shoulderCenterX, det.pose.shoulderCenterX, alpha);
        person.shoulderCenterY = lerp(person.shoulderCenterY, det.pose.shoulderCenterY, alpha);
        person.hipCenterX = lerp(person.hipCenterX, det.pose.hipCenterX, alpha);
        person.hipCenterY = lerp(person.hipCenterY, det.pose.hipCenterY, alpha);
        person.shoulderWidth = lerp(person.shoulderWidth, det.pose.shoulderWidth, alpha);
        person.torsoHeight = lerp(person.torsoHeight, det.pose.torsoHeight, alpha);
        person.shoulderAngle = lerpAngle(person.shoulderAngle, det.pose.shoulderAngle, alpha);
      }
      person.hasPose = true;
      person.lastPoseTime = now;
    } else if (now - person.lastPoseTime > AR_CONFIG.PERSON_TIMEOUT_MS) {
      person.hasPose = false;
    }

    if (det.face) {
      person.hasFace = true;
      person.lastFaceTime = now;
      person.rawFaceLandmarks = det.face.rawLandmarks;
      person.faceBlendshapes = det.face.blendshapes;
      person.foreheadX = lerp(person.foreheadX ?? det.face.foreheadX, det.face.foreheadX, alpha);
      person.foreheadY = lerp(person.foreheadY ?? det.face.foreheadY, det.face.foreheadY, alpha);
      person.faceHeight = lerp(person.faceHeight ?? det.face.faceHeight, det.face.faceHeight, alpha);
      person.templeWidth = lerp(person.templeWidth ?? det.face.templeWidth, det.face.templeWidth, alpha);
      person.rightEyeX = lerp(person.rightEyeX ?? det.face.rightEyeX, det.face.rightEyeX, alpha);
      person.rightEyeY = lerp(person.rightEyeY ?? det.face.rightEyeY, det.face.rightEyeY, alpha);
      person.headYaw = lerp(person.headYaw ?? det.face.headYaw, det.face.headYaw, alpha);
    } else if (now - person.lastFaceTime > AR_CONFIG.FACE_TIMEOUT_MS) {
      person.hasFace = false;
      person.rawFaceLandmarks = null;
    }

    let targetVrX = null;
    let targetVrY = null;
    let targetVrW = null;
    let targetVrAngle = null;
    let nextVrSource = person.vrSource;

    if (det.face) {
      targetVrX = det.face.eyeCenterX;
      targetVrY = det.face.eyeCenterY;
      targetVrW = Math.max(det.face.templeWidth * 1.15, det.face.eyeOuterDist * AR_CONFIG.VR_WIDTH_FACTOR);
      targetVrAngle = det.face.headRoll;
      nextVrSource = 'face';
    } else if (det.pose && !person.hasFace) {
      targetVrX = det.pose.poseVrX;
      targetVrY = det.pose.poseVrY;
      targetVrW = det.pose.poseVrWidth;
      targetVrAngle = det.pose.poseVrAngle;
      nextVrSource = 'pose';
    }

    if (targetVrX !== null) {
      if (!person.hasVr) {
        person.vrCenterX = targetVrX;
        person.vrCenterY = targetVrY;
        person.vrWidth = targetVrW;
        person.vrAngle = targetVrAngle;
      } else {
        const vrAlpha = person.vrSource !== nextVrSource ? 0.28 : alpha;
        person.vrCenterX = lerp(person.vrCenterX, targetVrX, vrAlpha);
        person.vrCenterY = lerp(person.vrCenterY, targetVrY, vrAlpha);
        person.vrWidth = lerp(person.vrWidth, targetVrW, vrAlpha);
        person.vrAngle = lerpAngle(person.vrAngle, targetVrAngle, vrAlpha);
      }
      person.vrSource = nextVrSource;
      person.hasVr = true;

      if (!det.face) {
        const estFaceH = person.vrWidth * 0.92;
        person.faceHeight = lerp(person.faceHeight || estFaceH, estFaceH, 0.25);
        person.templeWidth = lerp(person.templeWidth || person.vrWidth * 0.85, person.vrWidth * 0.85, 0.25);
        person.foreheadX = person.vrCenterX + Math.sin(person.vrAngle) * estFaceH * 0.32;
        person.foreheadY = person.vrCenterY - Math.cos(person.vrAngle) * estFaceH * 0.32;
        person.rightEyeX = person.vrCenterX - Math.cos(person.vrAngle) * person.vrWidth * 0.22;
        person.rightEyeY = person.vrCenterY - Math.sin(person.vrAngle) * person.vrWidth * 0.22;
      }
    }
  }

  for (let dIdx = 0; dIdx < detections.length; dIdx++) {
    if (matchedDet.has(dIdx)) continue;
    if (trackedPersons.length >= AR_CONFIG.MAX_PERSONS) break;

    const det = detections[dIdx];
    const id = nextPersonId++;
    const pose = det.pose;
    const face = det.face;

    const vrInitX = face ? face.eyeCenterX : pose.poseVrX;
    const vrInitY = face ? face.eyeCenterY : pose.poseVrY;
    const vrInitW = face
      ? Math.max(face.templeWidth * 1.15, face.eyeOuterDist * AR_CONFIG.VR_WIDTH_FACTOR)
      : pose.poseVrWidth;
    const vrInitAngle = face ? face.headRoll : pose.poseVrAngle;
    const initFaceH = face ? face.faceHeight : vrInitW * 0.92;
    const initTempleW = face ? face.templeWidth : vrInitW * 0.85;

    trackedPersons.push({
      id,
      lastSeenTime: now,
      lastPoseTime: pose ? now : 0,
      lastFaceTime: face ? now : 0,
      scanStartTime: now,
      rouletteStartTime: now,
      roleIndex: (id - 1) % 4,
      hasPose: Boolean(pose),
      shoulderCenterX: pose ? pose.shoulderCenterX : face.eyeCenterX,
      shoulderCenterY: pose ? pose.shoulderCenterY : face.eyeCenterY + face.eyeOuterDist * 2.1,
      hipCenterX: pose ? pose.hipCenterX : face.eyeCenterX,
      hipCenterY: pose ? pose.hipCenterY : face.eyeCenterY + face.eyeOuterDist * 5.0,
      shoulderWidth: pose ? pose.shoulderWidth : face.eyeOuterDist * 2.8,
      torsoHeight: pose ? pose.torsoHeight : face.eyeOuterDist * 3.8,
      shoulderAngle: pose ? pose.shoulderAngle : 0,
      hasFace: Boolean(face),
      hasVr: true,
      vrSource: face ? 'face' : 'pose',
      vrCenterX: vrInitX,
      vrCenterY: vrInitY,
      vrWidth: vrInitW,
      vrAngle: vrInitAngle,
      foreheadX: face ? face.foreheadX : vrInitX,
      foreheadY: face ? face.foreheadY : vrInitY - initFaceH * 0.32,
      faceHeight: initFaceH,
      templeWidth: initTempleW,
      rightEyeX: face ? face.rightEyeX : vrInitX - vrInitW * 0.22,
      rightEyeY: face ? face.rightEyeY : vrInitY,
      headYaw: face ? face.headYaw : 0,
      rawFaceLandmarks: face ? face.rawLandmarks : null,
      faceBlendshapes: face ? face.blendshapes : null,
    });
  }

  for (let i = trackedPersons.length - 1; i >= 0; i--) {
    const p = trackedPersons[i];
    if (now - p.lastSeenTime > AR_CONFIG.PERSON_TIMEOUT_MS) {
      trackedPersons.splice(i, 1);
    } else if (p.hasFace && now - p.lastFaceTime > AR_CONFIG.FACE_TIMEOUT_MS) {
      p.hasFace = false;
    }
  }

  trackedPersons.sort((a, b) => a.shoulderCenterX - b.shoulderCenterX);
}

/**
 * Rastrea y suaviza las manos detectadas incluyendo:
 * - Gesto ('FIST', 'PEACE', 'TYPING', 'OPEN_PALM', 'RAISED_PALM')
 * - Identificación de Mano Izquierda vs Mano Derecha de la persona (según posición respecto al eje central del torso)
 * - Coordenadas de puntas de los dedos (4, 8, 12, 16, 20) para iluminar teclas del Teclado Holográfico
 */
export function updateTrackedHands(
  trackedHands,
  handLandmarksList,
  persons,
  toScreenX,
  toScreenY,
  canvasWidth,
  now
) {
  const maxHandDist = canvasWidth * AR_CONFIG.HAND_TRACK_MAX_DIST_NORM;
  const alpha = AR_CONFIG.SMOOTHING_NEW_WEIGHT;

  const currentHands = [];
  if (handLandmarksList && handLandmarksList.length > 0 && persons.length > 0) {
    const limit = Math.min(handLandmarksList.length, AR_CONFIG.MAX_HANDS);
    for (let i = 0; i < limit; i++) {
      const handLm = handLandmarksList[i];
      if (!handLm || handLm.length < 21) continue;

      const palm = computePalmCenterAndTilt(handLm, toScreenX, toScreenY);
      const gesture = analyzeHandGesture(handLm);

      let ownerPerson = persons[0];
      let bestPersonDist = Infinity;
      for (let pIdx = 0; pIdx < persons.length; pIdx++) {
        const p = persons[pIdx];
        const d = Math.hypot(palm.x - p.shoulderCenterX, palm.y - p.shoulderCenterY);
        if (d < bestPersonDist) {
          bestPersonDist = d;
          ownerPerson = p;
        }
      }

      // En vista espejo: la mano derecha real de la persona está a la izquierda de su centro de hombros (palm.x < shoulderCenterX),
      // y su mano izquierda real está a la derecha de su centro de hombros (palm.x >= shoulderCenterX).
      const anatomicalSide = palm.x >= ownerPerson.shoulderCenterX ? 'LEFT_HAND' : 'RIGHT_HAND';

      const fingerTips = [4, 8, 12, 16, 20].map((idx) => ({
        x: toScreenX(handLm[idx].x),
        y: toScreenY(handLm[idx].y),
      }));

      currentHands.push({
        x: palm.x,
        y: palm.y,
        tiltAngle: palm.tiltAngle,
        palmSpan: palm.palmSpan,
        gesture,
        anatomicalSide,
        fingerTips,
        ownerPersonId: ownerPerson.id,
        rawLandmarks: handLm,
      });
    }
  }

  const pairs = [];
  for (let cIdx = 0; cIdx < currentHands.length; cIdx++) {
    const c = currentHands[cIdx];
    for (let tIdx = 0; tIdx < trackedHands.length; tIdx++) {
      const t = trackedHands[tIdx];
      const dist = Math.hypot(c.x - t.x, c.y - t.y);
      if (dist <= maxHandDist) {
        pairs.push({ cIdx, tIdx, dist });
      }
    }
  }

  pairs.sort((a, b) => a.dist - b.dist);
  const matchedCur = new Set();
  const matchedTracked = new Set();

  for (const pair of pairs) {
    if (matchedCur.has(pair.cIdx) || matchedTracked.has(pair.tIdx)) continue;
    matchedCur.add(pair.cIdx);
    matchedTracked.add(pair.tIdx);

    const th = trackedHands[pair.tIdx];
    const ch = currentHands[pair.cIdx];
    th.x = lerp(th.x, ch.x, alpha);
    th.y = lerp(th.y, ch.y, alpha);
    th.tiltAngle = lerpAngle(th.tiltAngle, ch.tiltAngle, alpha);
    th.palmSpan = lerp(th.palmSpan, ch.palmSpan, alpha);
    th.gesture = ch.gesture;
    th.anatomicalSide = ch.anatomicalSide;
    th.fingerTips = ch.fingerTips;
    th.ownerPersonId = ch.ownerPersonId;
    th.rawLandmarks = ch.rawLandmarks;
    th.lastSeenTime = now;
    th.isMissing = false;
    th.alpha = lerp(th.alpha, 1.0, 0.45);
  }

  for (let cIdx = 0; cIdx < currentHands.length; cIdx++) {
    if (matchedCur.has(cIdx)) continue;
    if (trackedHands.length >= AR_CONFIG.MAX_HANDS) break;
    const ch = currentHands[cIdx];
    trackedHands.push({
      id: nextHandId++,
      x: ch.x,
      y: ch.y,
      tiltAngle: ch.tiltAngle,
      palmSpan: ch.palmSpan,
      gesture: ch.gesture,
      anatomicalSide: ch.anatomicalSide,
      fingerTips: ch.fingerTips,
      ownerPersonId: ch.ownerPersonId,
      rawLandmarks: ch.rawLandmarks,
      lastSeenTime: now,
      isMissing: false,
      alpha: 0.35,
    });
  }

  for (let tIdx = 0; tIdx < trackedHands.length; tIdx++) {
    if (!matchedTracked.has(tIdx)) {
      trackedHands[tIdx].isMissing = true;
    }
  }
}

/**
 * Actualiza el desvanecimiento suave cuadro a cuadro cuando una mano sale de cuadro.
 */
export function stepTrackedHandsFade(trackedHands, now) {
  const timeout = AR_CONFIG.HAND_TIMEOUT_MS;
  for (let i = trackedHands.length - 1; i >= 0; i--) {
    const h = trackedHands[i];
    if (h.isMissing) {
      const elapsed = now - h.lastSeenTime;
      if (elapsed >= timeout) {
        trackedHands.splice(i, 1);
      } else {
        h.alpha = clamp(1 - elapsed / timeout, 0, 1);
      }
    } else {
      h.alpha = Math.min(1, h.alpha + 0.15);
    }
  }
}
