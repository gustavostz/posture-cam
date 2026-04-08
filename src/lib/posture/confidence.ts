import type { PostureKeypoints } from "./types";
import { SMOOTHING } from "@/lib/constants";

/**
 * Compute confidence from 5 keypoint visibilities.
 * 40% minimum + 60% average.
 */
export function computeConfidence(keypoints: PostureKeypoints): number {
  const visibilities = [
    keypoints.nose.visibility,
    keypoints.leftShoulder.visibility,
    keypoints.rightShoulder.visibility,
    keypoints.leftHip.visibility,
    keypoints.rightHip.visibility,
  ];

  const minVisibility = Math.min(...visibilities);
  const avgVisibility =
    visibilities.reduce((sum, v) => sum + v, 0) / visibilities.length;

  return 0.4 * minVisibility + 0.6 * avgVisibility;
}

export function shouldSkipFrame(confidence: number): boolean {
  return confidence < SMOOTHING.MIN_CONFIDENCE;
}

export function isLowConfidence(confidence: number): boolean {
  return confidence < SMOOTHING.LOW_CONFIDENCE;
}
