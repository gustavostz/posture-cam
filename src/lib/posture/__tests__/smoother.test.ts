import { describe, it, expect, beforeEach } from "vitest";
import { PostureSmoother } from "../smoother";
import { SMOOTHING, STATUS_CONFIG } from "@/lib/constants";

describe("PostureSmoother", () => {
  let smoother: PostureSmoother;

  beforeEach(() => {
    smoother = new PostureSmoother();
    smoother.setScoreThreshold(90);
  });

  describe("smoothMetric", () => {
    it("returns the raw value on the first call for a key", () => {
      const result = smoother.smoothMetric("shoulder", 10, 1.0);
      expect(result).toBe(10);
    });

    it("applies EMA smoothing on subsequent calls", () => {
      smoother.smoothMetric("shoulder", 10, 1.0);
      const result = smoother.smoothMetric("shoulder", 20, 1.0);
      // EMA: prev + alpha * (raw - prev) = 10 + 0.3 * (20 - 10) = 13
      expect(result).toBeCloseTo(10 + SMOOTHING.METRIC_ALPHA * (20 - 10), 5);
    });

    it("converges toward a stable value over many frames", () => {
      smoother.smoothMetric("shoulder", 0, 1.0);
      let value = 0;
      for (let i = 0; i < 50; i++) {
        value = smoother.smoothMetric("shoulder", 100, 1.0);
      }
      // After 50 frames at alpha=0.3, should be very close to 100
      expect(value).toBeGreaterThan(99);
    });

    it("uses a lower alpha for low-confidence frames", () => {
      smoother.smoothMetric("shoulder", 10, 1.0);
      const lowConf = smoother.smoothMetric("shoulder", 20, 0.2);
      // Low confidence alpha = 0.15
      // EMA: 10 + 0.15 * (20 - 10) = 11.5
      expect(lowConf).toBeCloseTo(
        10 + SMOOTHING.METRIC_LOW_CONFIDENCE_ALPHA * (20 - 10),
        5
      );
    });

    it("uses normal alpha when confidence equals the LOW_CONFIDENCE threshold", () => {
      // confidence < LOW_CONFIDENCE triggers low alpha; at exactly LOW_CONFIDENCE, it should use normal alpha
      smoother.smoothMetric("shoulder", 10, 1.0);
      const result = smoother.smoothMetric(
        "shoulder",
        20,
        SMOOTHING.LOW_CONFIDENCE
      );
      // confidence is NOT < LOW_CONFIDENCE, so normal alpha applies
      expect(result).toBeCloseTo(
        10 + SMOOTHING.METRIC_ALPHA * (20 - 10),
        5
      );
    });

    it("tracks multiple keys independently", () => {
      smoother.smoothMetric("shoulder", 10, 1.0);
      smoother.smoothMetric("head", 50, 1.0);

      const shoulder = smoother.smoothMetric("shoulder", 20, 1.0);
      const head = smoother.smoothMetric("head", 60, 1.0);

      expect(shoulder).toBeCloseTo(10 + SMOOTHING.METRIC_ALPHA * 10, 5);
      expect(head).toBeCloseTo(50 + SMOOTHING.METRIC_ALPHA * 10, 5);
    });
  });

  describe("smoothScore", () => {
    it("returns the raw score on the first call", () => {
      expect(smoother.smoothScore(75)).toBe(75);
    });

    it("applies EMA with SCORE_ALPHA on subsequent calls", () => {
      smoother.smoothScore(75);
      const result = smoother.smoothScore(50);
      // 75 + 0.2 * (50 - 75) = 75 - 5 = 70
      expect(result).toBe(Math.round(75 + SMOOTHING.SCORE_ALPHA * (50 - 75)));
    });

    it("returns rounded integers", () => {
      smoother.smoothScore(75);
      const result = smoother.smoothScore(76);
      expect(Number.isInteger(result)).toBe(true);
    });

    it("converges toward a stable input over many frames", () => {
      smoother.smoothScore(0);
      let score = 0;
      for (let i = 0; i < 100; i++) {
        score = smoother.smoothScore(80);
      }
      expect(score).toBe(80);
    });
  });

  describe("getStatus (hysteresis)", () => {
    // With threshold=90 and FAIR_BAND=15:
    // good >= 90, fair >= 75, poor < 75

    it("starts with 'good' status", () => {
      // Score of 95 is 'good' (>= 90), matches initial state
      expect(smoother.getStatus(95)).toBe("good");
    });

    it("does not immediately transition to a worse status", () => {
      // Feed a poor score once -- should stay 'good' due to hysteresis
      expect(smoother.getStatus(50)).toBe("good");
    });

    it("transitions to worse status after WORSEN_FRAMES consecutive frames", () => {
      // Feed poor scores for WORSEN_FRAMES frames
      for (let i = 0; i < STATUS_CONFIG.WORSEN_FRAMES - 1; i++) {
        expect(smoother.getStatus(50)).toBe("good");
      }
      // On the WORSEN_FRAMES-th frame, it should transition
      expect(smoother.getStatus(50)).toBe("poor");
    });

    it("transitions through fair before reaching poor when raw status is fair", () => {
      // Feed 'fair' scores (>= 75 but < 90)
      for (let i = 0; i < STATUS_CONFIG.WORSEN_FRAMES; i++) {
        smoother.getStatus(80);
      }
      expect(smoother.getStatus(80)).toBe("fair");
    });

    it("transitions to a better status after IMPROVE_FRAMES consecutive frames", () => {
      // First get to 'poor' status
      for (let i = 0; i < STATUS_CONFIG.WORSEN_FRAMES; i++) {
        smoother.getStatus(50);
      }
      expect(smoother.getStatus(50)).toBe("poor");

      // Now feed 'good' scores to improve
      for (let i = 0; i < STATUS_CONFIG.IMPROVE_FRAMES - 1; i++) {
        expect(smoother.getStatus(95)).toBe("poor");
      }
      // On the IMPROVE_FRAMES-th frame, should improve
      expect(smoother.getStatus(95)).toBe("good");
    });

    it("resets worsen counter when score matches current status", () => {
      // Feed some poor frames but not enough to trigger transition
      for (let i = 0; i < STATUS_CONFIG.WORSEN_FRAMES - 2; i++) {
        smoother.getStatus(50);
      }
      // Now give a good score to reset counters
      smoother.getStatus(95);
      // The worsen counter should be reset -- need full WORSEN_FRAMES again
      for (let i = 0; i < STATUS_CONFIG.WORSEN_FRAMES - 1; i++) {
        expect(smoother.getStatus(50)).toBe("good");
      }
      expect(smoother.getStatus(50)).toBe("poor");
    });

    it("prevents rapid flickering between statuses", () => {
      // Alternate between good and poor scores
      const statuses: string[] = [];
      for (let i = 0; i < 20; i++) {
        const score = i % 2 === 0 ? 50 : 95;
        statuses.push(smoother.getStatus(score));
      }
      // Should all be 'good' since neither counter reaches the threshold
      expect(statuses.every((s) => s === "good")).toBe(true);
    });
  });

  describe("reset", () => {
    it("clears metric smoothing state", () => {
      smoother.smoothMetric("shoulder", 100, 1.0);
      smoother.smoothMetric("shoulder", 50, 1.0);
      smoother.reset();
      // After reset, first call should return the raw value again
      const result = smoother.smoothMetric("shoulder", 10, 1.0);
      expect(result).toBe(10);
    });

    it("clears score smoothing state", () => {
      smoother.smoothScore(100);
      smoother.smoothScore(50);
      smoother.reset();
      const result = smoother.smoothScore(25);
      expect(result).toBe(25);
    });

    it("resets status to 'good'", () => {
      // Get to poor status
      for (let i = 0; i < STATUS_CONFIG.WORSEN_FRAMES; i++) {
        smoother.getStatus(50);
      }
      expect(smoother.getStatus(50)).toBe("poor");

      smoother.reset();
      expect(smoother.getStatus(95)).toBe("good");
    });

    it("resets hysteresis counters", () => {
      // Build up worsen counter almost to threshold
      for (let i = 0; i < STATUS_CONFIG.WORSEN_FRAMES - 1; i++) {
        smoother.getStatus(50);
      }
      smoother.reset();
      // After reset, counter should be at 0 -- need full WORSEN_FRAMES again
      for (let i = 0; i < STATUS_CONFIG.WORSEN_FRAMES - 1; i++) {
        expect(smoother.getStatus(50)).toBe("good");
      }
      expect(smoother.getStatus(50)).toBe("poor");
    });
  });
});
