import type { PostureMetrics, PostureKeypoints, CalibrationProfile } from "./types";
import { midpoint, euclideanDistance2D } from "./landmarks";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function computeCalibrationProfile(
  metricsHistory: PostureMetrics[],
  keypointsHistory: PostureKeypoints[]
): CalibrationProfile {
  const lastKeypoints = keypointsHistory[keypointsHistory.length - 1];
  const shoulderWidth = euclideanDistance2D(
    lastKeypoints.leftShoulder,
    lastKeypoints.rightShoulder
  );
  const shoulderMid = midpoint(
    lastKeypoints.leftShoulder,
    lastKeypoints.rightShoulder
  );
  const hipMid = midpoint(lastKeypoints.leftHip, lastKeypoints.rightHip);
  const torsoLength = euclideanDistance2D(shoulderMid, hipMid);

  return {
    baselineMetrics: {
      shoulderTiltRatio: median(metricsHistory.map((m) => m.shoulderTiltRatio)),
      headDropRatio: median(metricsHistory.map((m) => m.headDropRatio)),
      torsoRatio: median(metricsHistory.map((m) => m.torsoRatio)),
    },
    shoulderWidth,
    torsoLength,
    capturedAt: Date.now(),
  };
}

export function computeDeviations(
  metrics: PostureMetrics,
  calibration: CalibrationProfile
): { shoulderDev: number; headDev: number; torsoDev: number } {
  const shoulderDev = Math.abs(
    metrics.shoulderTiltRatio - calibration.baselineMetrics.shoulderTiltRatio
  );

  const headDev = Math.max(
    0,
    metrics.headDropRatio - calibration.baselineMetrics.headDropRatio
  );

  const baselineTorso = calibration.baselineMetrics.torsoRatio;
  const torsoDev =
    baselineTorso > 0.01
      ? Math.max(0, (baselineTorso - metrics.torsoRatio) / baselineTorso)
      : 0;

  return { shoulderDev, headDev, torsoDev };
}
