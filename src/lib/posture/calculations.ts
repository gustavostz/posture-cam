import type { PostureKeypoints, PostureMetrics } from "./types";
import { midpoint, euclideanDistance2D } from "./landmarks";

/**
 * Calculate all posture metrics as body-proportion-normalized ratios.
 * Uses only nose, shoulders, and hips (no ears needed).
 */
export function calculateMetrics(keypoints: PostureKeypoints): PostureMetrics | null {
  const shoulderMid = midpoint(keypoints.leftShoulder, keypoints.rightShoulder);
  const hipMid = midpoint(keypoints.leftHip, keypoints.rightHip);

  const shoulderWidth = euclideanDistance2D(
    keypoints.leftShoulder,
    keypoints.rightShoulder
  );
  const torsoLength = euclideanDistance2D(shoulderMid, hipMid);

  if (shoulderWidth < 0.01 || torsoLength < 0.01) return null;

  // Shoulder tilt: y-difference / shoulder width. 0 = level.
  const shoulderTiltRatio =
    (keypoints.rightShoulder.y - keypoints.leftShoulder.y) / shoulderWidth;

  // Head drop: nose position relative to shoulder midpoint, normalized by torso.
  // Nose is above shoulders in good posture (negative value in screen coords).
  // When you slouch, nose drops closer to shoulder level → ratio increases.
  const headDropRatio = (keypoints.nose.y - shoulderMid.y) / torsoLength;

  // Torso ratio: torso height / shoulder width.
  // Decreases when slouching (torso compresses in camera view).
  const torsoRatio = torsoLength / shoulderWidth;

  return { shoulderTiltRatio, headDropRatio, torsoRatio };
}
