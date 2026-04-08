import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { LANDMARK } from "@/lib/constants";
import { midpoint } from "./landmarks";

const KEY_INDICES = [
  LANDMARK.NOSE,
  LANDMARK.LEFT_SHOULDER,
  LANDMARK.RIGHT_SHOULDER,
  LANDMARK.LEFT_HIP,
  LANDMARK.RIGHT_HIP,
] as const;

/**
 * Map score to color relative to the threshold.
 * At/above threshold = green (120). At threshold-30 or below = red (0).
 * Interpolates between for intermediate values.
 */
function scoreToColor(score: number, threshold: number): string {
  const floor = threshold - 30;
  const t = Math.max(0, Math.min(1, (score - floor) / (threshold - floor)));
  const hue = t * 120; // 0 = red, 120 = green
  return `hsl(${hue}, 85%, 55%)`;
}

function toPixel(
  lm: NormalizedLandmark,
  width: number,
  height: number
): { x: number; y: number } {
  return { x: lm.x * width, y: lm.y * height };
}

export function drawPostureOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  score?: number,
  scoreThreshold?: number
): void {
  const effectiveScore = score ?? 75;
  const threshold = scoreThreshold ?? 90;
  const color = scoreToColor(effectiveScore, threshold);

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  ctx.save();
  ctx.translate(canvasWidth, 0);
  ctx.scale(-1, 1);

  // Draw key landmark circles
  for (const idx of KEY_INDICES) {
    const lm = landmarks[idx];
    if (!lm || lm.visibility < 0.3) continue;

    const pos = toPixel(lm, canvasWidth, canvasHeight);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  const lShoulder = landmarks[LANDMARK.LEFT_SHOULDER];
  const rShoulder = landmarks[LANDMARK.RIGHT_SHOULDER];
  const lHip = landmarks[LANDMARK.LEFT_HIP];
  const rHip = landmarks[LANDMARK.RIGHT_HIP];
  const nose = landmarks[LANDMARK.NOSE];

  // Shoulder line
  if (lShoulder && rShoulder) {
    const ls = toPixel(lShoulder, canvasWidth, canvasHeight);
    const rs = toPixel(rShoulder, canvasWidth, canvasHeight);
    ctx.beginPath();
    ctx.moveTo(ls.x, ls.y);
    ctx.lineTo(rs.x, rs.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Torso midline: shoulder midpoint to hip midpoint
  if (lShoulder && rShoulder && lHip && rHip) {
    const shoulderMid = midpoint(lShoulder, rShoulder);
    const hipMid = midpoint(lHip, rHip);
    const sm = toPixel(shoulderMid, canvasWidth, canvasHeight);
    const hm = toPixel(hipMid, canvasWidth, canvasHeight);
    ctx.beginPath();
    ctx.moveTo(sm.x, sm.y);
    ctx.lineTo(hm.x, hm.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // Head indicator: nose to shoulder midpoint
  if (nose && lShoulder && rShoulder) {
    const shoulderMid = midpoint(lShoulder, rShoulder);
    const np = toPixel(nose, canvasWidth, canvasHeight);
    const sm = toPixel(shoulderMid, canvasWidth, canvasHeight);
    ctx.beginPath();
    ctx.moveTo(np.x, np.y);
    ctx.lineTo(sm.x, sm.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Vertical reference line from hip midpoint
  if (lHip && rHip) {
    const hipMid = midpoint(lHip, rHip);
    const hm = toPixel(hipMid, canvasWidth, canvasHeight);
    ctx.beginPath();
    ctx.moveTo(hm.x, hm.y);
    ctx.lineTo(hm.x, 0);
    ctx.strokeStyle = "rgba(180, 180, 180, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}
