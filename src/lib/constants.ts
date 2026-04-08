export const LANDMARK = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const;

export const SCORE_WEIGHTS = {
  SHOULDER: 0.30,
  HEAD: 0.50,
  TORSO: 0.20,
} as const;

/**
 * Deviation thresholds for scoring. Values are ratio-based deviations from
 * calibrated baseline. Sensitivity 1=Relaxed, 3=Strict, interpolated linearly.
 */
export const SENSITIVITY_THRESHOLDS = {
  shoulder: {
    perfectZone: { relaxed: 0.04, strict: 0.008 },
    zeroAt: { relaxed: 0.18, strict: 0.06 },
  },
  head: {
    perfectZone: { relaxed: 0.04, strict: 0.008 },
    zeroAt: { relaxed: 0.20, strict: 0.08 },
  },
  torso: {
    perfectZone: { relaxed: 0.04, strict: 0.008 },
    zeroAt: { relaxed: 0.20, strict: 0.06 },
  },
} as const;

export const SMOOTHING = {
  METRIC_ALPHA: 0.4,
  METRIC_LOW_CONFIDENCE_ALPHA: 0.2,
  SCORE_ALPHA: 0.35,
  MIN_CONFIDENCE: 0.3,
  LOW_CONFIDENCE: 0.5,
} as const;

/**
 * Status thresholds are now RELATIVE to the user's scoreThreshold setting.
 * - Good: score >= scoreThreshold
 * - Fair: score >= scoreThreshold - FAIR_BAND
 * - Poor: score < scoreThreshold - FAIR_BAND
 */
export const STATUS_CONFIG = {
  FAIR_BAND: 15,
  HYSTERESIS: 3,
  WORSEN_FRAMES: 15,
  IMPROVE_FRAMES: 10,
} as const;

export const DEFAULTS = {
  SENSITIVITY: 2,
  SCORE_THRESHOLD: 90,
  NOTIFICATION_COOLDOWN_SEC: 30,
  SNAPSHOT_INTERVAL_MS: 5000,
  TARGET_FPS: 15,
  BAD_POSTURE_ALERT_DELAY_SEC: 30,
  CALIBRATION_FRAMES: 30,
  AUTO_CALIBRATION_SEC: 5,
  /** Frames with no detection before showing "not tracking" */
  NOT_TRACKING_TIMEOUT_MS: 2000,
} as const;
