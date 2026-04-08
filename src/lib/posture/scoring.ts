import { SENSITIVITY_THRESHOLDS, SCORE_WEIGHTS } from "@/lib/constants";

interface MetricThresholds {
  perfectZone: number;
  zeroAt: number;
}

export interface AllThresholds {
  shoulder: MetricThresholds;
  head: MetricThresholds;
  torso: MetricThresholds;
}

function lerp(relaxed: number, strict: number, sensitivity: number): number {
  const t = (sensitivity - 1) / 2; // 0 at sensitivity=1, 1 at sensitivity=3
  return relaxed + (strict - relaxed) * t;
}

export function getThresholds(sensitivity: number): AllThresholds {
  return {
    shoulder: {
      perfectZone: lerp(
        SENSITIVITY_THRESHOLDS.shoulder.perfectZone.relaxed,
        SENSITIVITY_THRESHOLDS.shoulder.perfectZone.strict,
        sensitivity
      ),
      zeroAt: lerp(
        SENSITIVITY_THRESHOLDS.shoulder.zeroAt.relaxed,
        SENSITIVITY_THRESHOLDS.shoulder.zeroAt.strict,
        sensitivity
      ),
    },
    head: {
      perfectZone: lerp(
        SENSITIVITY_THRESHOLDS.head.perfectZone.relaxed,
        SENSITIVITY_THRESHOLDS.head.perfectZone.strict,
        sensitivity
      ),
      zeroAt: lerp(
        SENSITIVITY_THRESHOLDS.head.zeroAt.relaxed,
        SENSITIVITY_THRESHOLDS.head.zeroAt.strict,
        sensitivity
      ),
    },
    torso: {
      perfectZone: lerp(
        SENSITIVITY_THRESHOLDS.torso.perfectZone.relaxed,
        SENSITIVITY_THRESHOLDS.torso.perfectZone.strict,
        sensitivity
      ),
      zeroAt: lerp(
        SENSITIVITY_THRESHOLDS.torso.zeroAt.relaxed,
        SENSITIVITY_THRESHOLDS.torso.zeroAt.strict,
        sensitivity
      ),
    },
  };
}

export function scoreMetric(
  deviation: number,
  perfectZone: number,
  zeroAt: number
): number {
  const absDev = Math.abs(deviation);
  if (absDev <= perfectZone) return 100;
  if (absDev >= zeroAt) return 0;

  const t = (absDev - perfectZone) / (zeroAt - perfectZone);
  return Math.round((100 * (1 + Math.cos(Math.PI * t))) / 2);
}

export function computeOverallScore(
  shoulderScore: number,
  headScore: number,
  torsoScore: number
): number {
  return Math.round(
    SCORE_WEIGHTS.SHOULDER * shoulderScore +
      SCORE_WEIGHTS.HEAD * headScore +
      SCORE_WEIGHTS.TORSO * torsoScore
  );
}
