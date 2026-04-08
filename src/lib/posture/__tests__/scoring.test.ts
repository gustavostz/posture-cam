import { describe, it, expect } from "vitest";
import { scoreMetric, getThresholds, computeOverallScore } from "../scoring";
import {
  SENSITIVITY_THRESHOLDS,
  SCORE_WEIGHTS,
} from "@/lib/constants";

describe("scoreMetric", () => {
  it("returns 100 when deviation is within the perfect zone", () => {
    expect(scoreMetric(0, 5, 20)).toBe(100);
    expect(scoreMetric(3, 5, 20)).toBe(100);
    expect(scoreMetric(5, 5, 20)).toBe(100);
  });

  it("returns 100 for negative deviation within the perfect zone (uses abs)", () => {
    expect(scoreMetric(-3, 5, 20)).toBe(100);
    expect(scoreMetric(-5, 5, 20)).toBe(100);
  });

  it("returns 0 when deviation is at or beyond zeroAt", () => {
    expect(scoreMetric(20, 5, 20)).toBe(0);
    expect(scoreMetric(25, 5, 20)).toBe(0);
    expect(scoreMetric(-20, 5, 20)).toBe(0);
  });

  it("returns a value between 0 and 100 at the midpoint of the transition zone", () => {
    // perfectZone=0, zeroAt=20, deviation=10 => t=0.5
    // cos(PI * 0.5) = 0 => score = 100*(1+0)/2 = 50
    const score = scoreMetric(10, 0, 20);
    expect(score).toBe(50);
  });

  it("uses cosine interpolation producing smooth curve", () => {
    // At t=0.25: cos(PI*0.25) ~ 0.707 => score ~ 100*(1.707)/2 ~ 85
    // perfectZone=0, zeroAt=20, deviation=5 => t=0.25
    const score = scoreMetric(5, 0, 20);
    expect(score).toBe(85);
  });

  it("is symmetric around zero deviation", () => {
    const positive = scoreMetric(10, 5, 25);
    const negative = scoreMetric(-10, 5, 25);
    expect(positive).toBe(negative);
  });

  it("returns integer values (Math.round)", () => {
    const score = scoreMetric(7, 5, 20);
    expect(Number.isInteger(score)).toBe(true);
  });
});

describe("getThresholds", () => {
  it("returns relaxed thresholds at sensitivity=1", () => {
    const t = getThresholds(1);
    expect(t.shoulder.perfectZone).toBe(
      SENSITIVITY_THRESHOLDS.shoulder.perfectZone.relaxed
    );
    expect(t.shoulder.zeroAt).toBe(
      SENSITIVITY_THRESHOLDS.shoulder.zeroAt.relaxed
    );
    expect(t.head.perfectZone).toBe(
      SENSITIVITY_THRESHOLDS.head.perfectZone.relaxed
    );
    expect(t.torso.perfectZone).toBe(
      SENSITIVITY_THRESHOLDS.torso.perfectZone.relaxed
    );
  });

  it("returns strict thresholds at sensitivity=3", () => {
    const t = getThresholds(3);
    expect(t.shoulder.perfectZone).toBeCloseTo(
      SENSITIVITY_THRESHOLDS.shoulder.perfectZone.strict,
      10
    );
    expect(t.shoulder.zeroAt).toBeCloseTo(
      SENSITIVITY_THRESHOLDS.shoulder.zeroAt.strict,
      10
    );
    expect(t.head.perfectZone).toBeCloseTo(
      SENSITIVITY_THRESHOLDS.head.perfectZone.strict,
      10
    );
    expect(t.torso.perfectZone).toBeCloseTo(
      SENSITIVITY_THRESHOLDS.torso.perfectZone.strict,
      10
    );
  });

  it("returns middle values at sensitivity=2", () => {
    const t = getThresholds(2);
    // t = (2-1)/2 = 0.5, so lerp gives midpoint
    const expectedShoulderPerfect =
      (SENSITIVITY_THRESHOLDS.shoulder.perfectZone.relaxed +
        SENSITIVITY_THRESHOLDS.shoulder.perfectZone.strict) /
      2;
    expect(t.shoulder.perfectZone).toBeCloseTo(expectedShoulderPerfect, 5);

    const expectedHeadZeroAt =
      (SENSITIVITY_THRESHOLDS.head.zeroAt.relaxed +
        SENSITIVITY_THRESHOLDS.head.zeroAt.strict) /
      2;
    expect(t.head.zeroAt).toBeCloseTo(expectedHeadZeroAt, 5);
  });

  it("linearly interpolates for intermediate sensitivity values", () => {
    // sensitivity=1.5 => t = (1.5-1)/2 = 0.25
    const t = getThresholds(1.5);
    const expected =
      SENSITIVITY_THRESHOLDS.shoulder.perfectZone.relaxed +
      0.25 *
        (SENSITIVITY_THRESHOLDS.shoulder.perfectZone.strict -
          SENSITIVITY_THRESHOLDS.shoulder.perfectZone.relaxed);
    expect(t.shoulder.perfectZone).toBeCloseTo(expected, 5);
  });

  it("strict thresholds are tighter (smaller) than relaxed thresholds", () => {
    const relaxed = getThresholds(1);
    const strict = getThresholds(3);
    expect(strict.shoulder.perfectZone).toBeLessThan(
      relaxed.shoulder.perfectZone
    );
    expect(strict.shoulder.zeroAt).toBeLessThan(relaxed.shoulder.zeroAt);
    expect(strict.head.perfectZone).toBeLessThan(
      relaxed.head.perfectZone
    );
    expect(strict.torso.zeroAt).toBeLessThan(relaxed.torso.zeroAt);
  });
});

describe("computeOverallScore", () => {
  it("returns 100 when all component scores are 100", () => {
    expect(computeOverallScore(100, 100, 100)).toBe(100);
  });

  it("returns 0 when all component scores are 0", () => {
    expect(computeOverallScore(0, 0, 0)).toBe(0);
  });

  it("applies the correct weights from SCORE_WEIGHTS", () => {
    // shoulder=100, head=0, torso=0 => 0.3*100 + 0.4*0 + 0.3*0 = 30
    expect(computeOverallScore(100, 0, 0)).toBe(
      Math.round(SCORE_WEIGHTS.SHOULDER * 100)
    );
    // shoulder=0, head=100, torso=0 => 0.3*0 + 0.4*100 + 0.3*0 = 40
    expect(computeOverallScore(0, 100, 0)).toBe(
      Math.round(SCORE_WEIGHTS.HEAD * 100)
    );
    // shoulder=0, head=0, torso=100 => 0.3*0 + 0.4*0 + 0.3*100 = 30
    expect(computeOverallScore(0, 0, 100)).toBe(
      Math.round(SCORE_WEIGHTS.TORSO * 100)
    );
  });

  it("gives the highest weight to head position", () => {
    expect(SCORE_WEIGHTS.HEAD).toBeGreaterThan(SCORE_WEIGHTS.SHOULDER);
    expect(SCORE_WEIGHTS.HEAD).toBeGreaterThan(SCORE_WEIGHTS.TORSO);
  });

  it("returns rounded integer result", () => {
    const score = computeOverallScore(33, 67, 50);
    expect(Number.isInteger(score)).toBe(true);
  });

  it("weights sum to 1.0", () => {
    const sum =
      SCORE_WEIGHTS.SHOULDER + SCORE_WEIGHTS.HEAD + SCORE_WEIGHTS.TORSO;
    expect(sum).toBeCloseTo(1.0, 5);
  });
});
