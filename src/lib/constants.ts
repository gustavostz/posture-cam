export const LANDMARK = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const;

export const SCORE_WEIGHTS = {
  SHOULDER: 0.3,
  HEAD: 0.4,
  TORSO: 0.3,
} as const;

export const STRICTNESS_THRESHOLDS = {
  shoulder: {
    perfectZone: { relaxed: 8, strict: 2 },
    zeroAt: { relaxed: 25, strict: 10 },
  },
  forwardHead: {
    perfectZone: { relaxed: 0.15, strict: 0.03 },
    zeroAt: { relaxed: 0.4, strict: 0.15 },
  },
  torsoLean: {
    perfectZone: { relaxed: 12, strict: 3 },
    zeroAt: { relaxed: 35, strict: 15 },
  },
} as const;

export const SMOOTHING = {
  METRIC_ALPHA: 0.3,
  METRIC_LOW_CONFIDENCE_ALPHA: 0.15,
  SCORE_ALPHA: 0.2,
  MIN_CONFIDENCE: 0.3,
  LOW_CONFIDENCE: 0.5,
} as const;

export const STATUS_THRESHOLDS = {
  GOOD: 75,
  FAIR: 45,
  HYSTERESIS: 3,
  WORSEN_FRAMES: 15,
  IMPROVE_FRAMES: 10,
} as const;

export const DEFAULTS = {
  STRICTNESS: 4,
  NOTIFICATION_COOLDOWN_SEC: 30,
  BAD_POSTURE_THRESHOLD: 60,
  SNAPSHOT_INTERVAL_MS: 5000,
  TARGET_FPS: 15,
  BAD_POSTURE_ALERT_DELAY_SEC: 5,
  CALIBRATION_FRAMES: 30,
  CALIBRATION_COUNTDOWN_SEC: 3,
  AUTO_CALIBRATION_SEC: 5,
} as const;
