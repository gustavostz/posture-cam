import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export interface PostureKeypoints {
  nose: NormalizedLandmark;
  leftShoulder: NormalizedLandmark;
  rightShoulder: NormalizedLandmark;
  leftHip: NormalizedLandmark;
  rightHip: NormalizedLandmark;
}

/**
 * Body-proportion-normalized ratios. Independent of camera distance
 * and body size because they're expressed as ratios of body dimensions.
 */
export interface PostureMetrics {
  /** (rightShoulder.y - leftShoulder.y) / shoulderWidth. 0 = level. */
  shoulderTiltRatio: number;
  /** (nose.y - shoulderMid.y) / torsoLength. Increases when head drops. */
  headDropRatio: number;
  /** torsoLength / shoulderWidth. Decreases when user slouches. */
  torsoRatio: number;
}

export interface PostureAssessment {
  metrics: PostureMetrics;
  score: number;
  componentScores: {
    shoulderAlignment: number;
    headPosition: number;
    torsoAlignment: number;
  };
  status: "good" | "fair" | "poor";
  confidence: number;
  timestamp: number;
}

export interface CalibrationProfile {
  baselineMetrics: PostureMetrics;
  shoulderWidth: number;
  torsoLength: number;
  capturedAt: number;
}
