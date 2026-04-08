import { describe, it, expect, vi, afterEach } from "vitest";
import {
  computeCalibrationProfile,
  computeDeviations,
} from "../calibration";
import type { PostureMetrics, CalibrationProfile } from "../types";
import {
  createPerfectPostureKeypoints,
  createLandmark,
} from "@/test/mocks/landmarks";

describe("computeCalibrationProfile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("computes the median of each metric from the history", () => {
    const metricsHistory: PostureMetrics[] = [
      { shoulderTiltRatio: 0.01, headDropRatio: 0.1, torsoRatio: 1.3 },
      { shoulderTiltRatio: 0.05, headDropRatio: 0.3, torsoRatio: 1.1 },
      { shoulderTiltRatio: 0.03, headDropRatio: 0.2, torsoRatio: 1.2 },
    ];
    const keypointsHistory = [
      createPerfectPostureKeypoints(),
      createPerfectPostureKeypoints(),
      createPerfectPostureKeypoints(),
    ];

    const profile = computeCalibrationProfile(metricsHistory, keypointsHistory);

    // Median of [0.01, 0.05, 0.03] sorted = [0.01, 0.03, 0.05] => 0.03
    expect(profile.baselineMetrics.shoulderTiltRatio).toBe(0.03);
    // Median of [0.1, 0.3, 0.2] sorted = [0.1, 0.2, 0.3] => 0.2
    expect(profile.baselineMetrics.headDropRatio).toBeCloseTo(0.2, 5);
    // Median of [1.3, 1.1, 1.2] sorted = [1.1, 1.2, 1.3] => 1.2
    expect(profile.baselineMetrics.torsoRatio).toBeCloseTo(1.2, 5);
  });

  it("computes the median correctly for even-length arrays", () => {
    const metricsHistory: PostureMetrics[] = [
      { shoulderTiltRatio: 0.02, headDropRatio: 0.1, torsoRatio: 1.4 },
      { shoulderTiltRatio: 0.04, headDropRatio: 0.3, torsoRatio: 1.2 },
      { shoulderTiltRatio: 0.06, headDropRatio: 0.2, torsoRatio: 1.0 },
      { shoulderTiltRatio: 0.08, headDropRatio: 0.4, torsoRatio: 0.8 },
    ];
    const keypointsHistory = Array(4)
      .fill(null)
      .map(() => createPerfectPostureKeypoints());

    const profile = computeCalibrationProfile(metricsHistory, keypointsHistory);

    // Median of [0.02, 0.04, 0.06, 0.08] sorted => (0.04 + 0.06) / 2 = 0.05
    expect(profile.baselineMetrics.shoulderTiltRatio).toBeCloseTo(0.05, 5);
    // Median of [0.1, 0.2, 0.3, 0.4] sorted => (0.2 + 0.3) / 2 = 0.25
    expect(profile.baselineMetrics.headDropRatio).toBeCloseTo(0.25, 5);
  });

  it("captures shoulder width from the last keypoints frame", () => {
    const metricsHistory: PostureMetrics[] = [
      { shoulderTiltRatio: 0, headDropRatio: 0, torsoRatio: 1.25 },
    ];
    const keypoints = createPerfectPostureKeypoints();
    // leftShoulder.x=0.4, rightShoulder.x=0.6, same y => distance = 0.2
    const profile = computeCalibrationProfile(metricsHistory, [keypoints]);

    expect(profile.shoulderWidth).toBeCloseTo(0.2, 5);
  });

  it("captures torso length from the last keypoints frame", () => {
    const metricsHistory: PostureMetrics[] = [
      { shoulderTiltRatio: 0, headDropRatio: 0, torsoRatio: 1.25 },
    ];
    const keypoints = createPerfectPostureKeypoints();
    // shoulderMid = (0.5, 0.35), hipMid = (0.5, 0.6)
    // distance = sqrt(0 + 0.25^2) = 0.25
    const profile = computeCalibrationProfile(metricsHistory, [keypoints]);

    expect(profile.torsoLength).toBeCloseTo(0.25, 3);
  });

  it("uses the last keypoints frame (not first) for body measurements", () => {
    const metricsHistory: PostureMetrics[] = [
      { shoulderTiltRatio: 0, headDropRatio: 0, torsoRatio: 1.25 },
      { shoulderTiltRatio: 0, headDropRatio: 0, torsoRatio: 1.25 },
    ];
    const firstFrame = createPerfectPostureKeypoints();
    const lastFrame = createPerfectPostureKeypoints();
    // Widen shoulders in the last frame
    lastFrame.leftShoulder = createLandmark(0.3, 0.35, 0);
    lastFrame.rightShoulder = createLandmark(0.7, 0.35, 0);

    const profile = computeCalibrationProfile(metricsHistory, [
      firstFrame,
      lastFrame,
    ]);

    // Should use the last frame: shoulder width = 0.4
    expect(profile.shoulderWidth).toBeCloseTo(0.4, 5);
  });

  it("records capturedAt as a timestamp", () => {
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);

    const metricsHistory: PostureMetrics[] = [
      { shoulderTiltRatio: 0, headDropRatio: 0, torsoRatio: 1.25 },
    ];
    const profile = computeCalibrationProfile(metricsHistory, [
      createPerfectPostureKeypoints(),
    ]);

    expect(profile.capturedAt).toBe(1700000000000);
  });
});

describe("computeDeviations", () => {
  function makeCalibration(
    baseline: PostureMetrics
  ): CalibrationProfile {
    return {
      baselineMetrics: baseline,
      shoulderWidth: 0.2,
      torsoLength: 0.25,
      capturedAt: Date.now(),
    };
  }

  describe("shoulderDev", () => {
    it("is zero when current matches baseline", () => {
      const baseline: PostureMetrics = {
        shoulderTiltRatio: 0.02,
        headDropRatio: -0.6,
        torsoRatio: 1.25,
      };
      const result = computeDeviations(baseline, makeCalibration(baseline));
      expect(result.shoulderDev).toBeCloseTo(0, 5);
    });

    it("equals abs(current - baseline) for shoulderTiltRatio", () => {
      const baseline: PostureMetrics = {
        shoulderTiltRatio: 0.02,
        headDropRatio: -0.6,
        torsoRatio: 1.25,
      };
      const current: PostureMetrics = {
        shoulderTiltRatio: 0.15,
        headDropRatio: -0.6,
        torsoRatio: 1.25,
      };
      const result = computeDeviations(current, makeCalibration(baseline));
      expect(result.shoulderDev).toBeCloseTo(Math.abs(0.15 - 0.02), 5);
    });

    it("uses absolute value so direction does not matter", () => {
      const baseline: PostureMetrics = {
        shoulderTiltRatio: 0.05,
        headDropRatio: -0.6,
        torsoRatio: 1.25,
      };
      const tiltedRight: PostureMetrics = {
        ...baseline,
        shoulderTiltRatio: 0.15,
      };
      const tiltedLeft: PostureMetrics = {
        ...baseline,
        shoulderTiltRatio: -0.05,
      };
      const cal = makeCalibration(baseline);

      const devRight = computeDeviations(tiltedRight, cal).shoulderDev;
      const devLeft = computeDeviations(tiltedLeft, cal).shoulderDev;
      // abs(0.15 - 0.05) = 0.10, abs(-0.05 - 0.05) = 0.10
      expect(devRight).toBeCloseTo(devLeft, 5);
    });
  });

  describe("headDev", () => {
    it("is zero when current matches baseline", () => {
      const baseline: PostureMetrics = {
        shoulderTiltRatio: 0,
        headDropRatio: -0.6,
        torsoRatio: 1.25,
      };
      const result = computeDeviations(baseline, makeCalibration(baseline));
      expect(result.headDev).toBeCloseTo(0, 5);
    });

    it("equals (current - baseline) when head drops below baseline", () => {
      const baseline: PostureMetrics = {
        shoulderTiltRatio: 0,
        headDropRatio: -0.6,
        torsoRatio: 1.25,
      };
      const current: PostureMetrics = {
        ...baseline,
        headDropRatio: -0.4, // head dropped (less negative = lower)
      };
      const result = computeDeviations(current, makeCalibration(baseline));
      // -0.4 - (-0.6) = 0.2, max(0, 0.2) = 0.2
      expect(result.headDev).toBeCloseTo(0.2, 5);
    });

    it("is clamped to zero when head is higher than baseline (improvement)", () => {
      const baseline: PostureMetrics = {
        shoulderTiltRatio: 0,
        headDropRatio: -0.4,
        torsoRatio: 1.25,
      };
      const current: PostureMetrics = {
        ...baseline,
        headDropRatio: -0.6, // head higher than baseline (more negative)
      };
      const result = computeDeviations(current, makeCalibration(baseline));
      // -0.6 - (-0.4) = -0.2, max(0, -0.2) = 0
      expect(result.headDev).toBe(0);
    });
  });

  describe("torsoDev", () => {
    it("is zero when current matches baseline", () => {
      const baseline: PostureMetrics = {
        shoulderTiltRatio: 0,
        headDropRatio: -0.6,
        torsoRatio: 1.25,
      };
      const result = computeDeviations(baseline, makeCalibration(baseline));
      expect(result.torsoDev).toBeCloseTo(0, 5);
    });

    it("equals (baseline - current) / baseline when torso compresses", () => {
      const baseline: PostureMetrics = {
        shoulderTiltRatio: 0,
        headDropRatio: -0.6,
        torsoRatio: 1.25,
      };
      const current: PostureMetrics = {
        ...baseline,
        torsoRatio: 1.0, // compressed torso
      };
      const result = computeDeviations(current, makeCalibration(baseline));
      // (1.25 - 1.0) / 1.25 = 0.2
      expect(result.torsoDev).toBeCloseTo(0.2, 5);
    });

    it("is clamped to zero when torso is longer than baseline (improvement)", () => {
      const baseline: PostureMetrics = {
        shoulderTiltRatio: 0,
        headDropRatio: -0.6,
        torsoRatio: 1.0,
      };
      const current: PostureMetrics = {
        ...baseline,
        torsoRatio: 1.25, // torso longer than baseline
      };
      const result = computeDeviations(current, makeCalibration(baseline));
      // (1.0 - 1.25) / 1.0 = -0.25, max(0, -0.25) = 0
      expect(result.torsoDev).toBe(0);
    });

    it("returns zero when baseline torso ratio is near zero", () => {
      const baseline: PostureMetrics = {
        shoulderTiltRatio: 0,
        headDropRatio: 0,
        torsoRatio: 0.005, // degenerate
      };
      const current: PostureMetrics = {
        ...baseline,
        torsoRatio: 0.001,
      };
      const result = computeDeviations(current, makeCalibration(baseline));
      expect(result.torsoDev).toBe(0);
    });
  });

  it("returns zero deviations when current equals baseline", () => {
    const baseline: PostureMetrics = {
      shoulderTiltRatio: 0.03,
      headDropRatio: -0.5,
      torsoRatio: 1.2,
    };
    const result = computeDeviations(baseline, makeCalibration(baseline));
    expect(result.shoulderDev).toBeCloseTo(0, 5);
    expect(result.headDev).toBeCloseTo(0, 5);
    expect(result.torsoDev).toBeCloseTo(0, 5);
  });
});
