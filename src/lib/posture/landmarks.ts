import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { LANDMARK } from "@/lib/constants";
import type { PostureKeypoints } from "./types";

/**
 * Extract the 5 key posture landmarks from a full set of pose landmarks.
 * Returns null if any required landmark is missing.
 */
export function extractKeypoints(
  landmarks: NormalizedLandmark[]
): PostureKeypoints | null {
  const nose = landmarks[LANDMARK.NOSE];
  const leftShoulder = landmarks[LANDMARK.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARK.RIGHT_SHOULDER];
  const leftHip = landmarks[LANDMARK.LEFT_HIP];
  const rightHip = landmarks[LANDMARK.RIGHT_HIP];

  if (!nose || !leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return null;
  }

  return { nose, leftShoulder, rightShoulder, leftHip, rightHip };
}

export function midpoint(
  a: NormalizedLandmark,
  b: NormalizedLandmark
): NormalizedLandmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility: Math.min(a.visibility, b.visibility),
  };
}

export function euclideanDistance2D(
  a: NormalizedLandmark,
  b: NormalizedLandmark
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
