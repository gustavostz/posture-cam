import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { PostureKeypoints } from "@/lib/posture/types";

/**
 * Create a NormalizedLandmark with the given coordinates.
 */
export function createLandmark(
  x: number,
  y: number,
  z: number = 0,
  visibility: number = 1.0
): NormalizedLandmark {
  return { x, y, z, visibility };
}

/**
 * Create keypoints representing perfect upright posture.
 *
 * Layout (normalized coordinates, y-down):
 *   - Nose at center-top
 *   - Shoulders level and symmetric
 *   - Hips level and symmetric, directly below shoulders
 */
export function createPerfectPostureKeypoints(): PostureKeypoints {
  return {
    nose: createLandmark(0.5, 0.2, 0),
    leftShoulder: createLandmark(0.4, 0.35, 0),
    rightShoulder: createLandmark(0.6, 0.35, 0),
    leftHip: createLandmark(0.42, 0.6, 0),
    rightHip: createLandmark(0.58, 0.6, 0),
  };
}

/**
 * Create keypoints where the right shoulder is lower than the left,
 * producing a known tilt angle in degrees.
 *
 * Shoulders are spaced 0.2 apart in x. We offset y of the right shoulder
 * to achieve the desired angle via atan2(dy, dx).
 */
export function createTiltedShoulderKeypoints(
  angleDegrees: number
): PostureKeypoints {
  const base = createPerfectPostureKeypoints();
  const dx = 0.2; // rightShoulder.x - leftShoulder.x
  const dy = dx * Math.tan((angleDegrees * Math.PI) / 180);

  return {
    ...base,
    leftShoulder: createLandmark(0.4, 0.35, 0),
    rightShoulder: createLandmark(0.6, 0.35 + dy, 0),
  };
}

/**
 * Create keypoints where the head (nose) is dropped by a given amount
 * below its normal position. This drives the headDropRatio metric.
 *
 * The `dropAmount` is added to the nose Y position, pushing it
 * lower (larger Y = lower in normalized coords).
 */
export function createHeadDropKeypoints(dropAmount: number): PostureKeypoints {
  const base = createPerfectPostureKeypoints();

  return {
    ...base,
    nose: createLandmark(0.5, 0.2 + dropAmount, 0),
  };
}
