import { describe, it, expect } from "vitest";
import {
  computeConfidence,
  shouldSkipFrame,
  isLowConfidence,
} from "../confidence";
import { SMOOTHING } from "@/lib/constants";
import { createLandmark } from "@/test/mocks/landmarks";
import type { PostureKeypoints } from "../types";

/**
 * Helper to create keypoints where all landmarks have the same visibility.
 */
function createKeypointsWithVisibility(visibility: number): PostureKeypoints {
  return {
    nose: createLandmark(0.5, 0.2, 0, visibility),
    leftShoulder: createLandmark(0.4, 0.35, 0, visibility),
    rightShoulder: createLandmark(0.6, 0.35, 0, visibility),
    leftHip: createLandmark(0.42, 0.6, 0, visibility),
    rightHip: createLandmark(0.58, 0.6, 0, visibility),
  };
}

describe("computeConfidence", () => {
  it("returns the visibility value when all landmarks have equal visibility", () => {
    const keypoints = createKeypointsWithVisibility(0.8);
    // min = 0.8, avg = 0.8 => 0.4 * 0.8 + 0.6 * 0.8 = 0.8
    expect(computeConfidence(keypoints)).toBeCloseTo(0.8, 5);
  });

  it("returns 1.0 when all landmarks have perfect visibility", () => {
    const keypoints = createKeypointsWithVisibility(1.0);
    expect(computeConfidence(keypoints)).toBeCloseTo(1.0, 5);
  });

  it("returns 0.0 when all landmarks have zero visibility", () => {
    const keypoints = createKeypointsWithVisibility(0.0);
    expect(computeConfidence(keypoints)).toBeCloseTo(0.0, 5);
  });

  it("penalizes when one landmark has low visibility (min weight = 0.4)", () => {
    const keypoints = createKeypointsWithVisibility(1.0);
    // Set one landmark to 0 visibility
    keypoints.nose.visibility = 0;
    // min = 0, avg = 4/5
    // confidence = 0.4 * 0 + 0.6 * (4/5) = 0.6 * 0.8 = 0.48
    const confidence = computeConfidence(keypoints);
    expect(confidence).toBeCloseTo(0.6 * (4 / 5), 3);
  });

  it("uses 40% minimum + 60% average formula", () => {
    const keypoints = createKeypointsWithVisibility(1.0);
    keypoints.leftHip.visibility = 0.5;
    // min = 0.5, avg = (4 * 1.0 + 0.5) / 5 = 4.5/5
    const expected = 0.4 * 0.5 + 0.6 * (4.5 / 5);
    expect(computeConfidence(keypoints)).toBeCloseTo(expected, 5);
  });

  it("considers all 5 keypoints", () => {
    const keypoints = createKeypointsWithVisibility(0.9);
    keypoints.rightHip.visibility = 0.1;
    // min = 0.1, avg = (4*0.9 + 0.1) / 5 = 3.7/5
    const expected = 0.4 * 0.1 + 0.6 * (3.7 / 5);
    expect(computeConfidence(keypoints)).toBeCloseTo(expected, 5);
  });
});

describe("shouldSkipFrame", () => {
  it("returns true when confidence is below MIN_CONFIDENCE", () => {
    expect(shouldSkipFrame(SMOOTHING.MIN_CONFIDENCE - 0.01)).toBe(true);
    expect(shouldSkipFrame(0)).toBe(true);
    expect(shouldSkipFrame(0.1)).toBe(true);
  });

  it("returns false when confidence is at MIN_CONFIDENCE", () => {
    expect(shouldSkipFrame(SMOOTHING.MIN_CONFIDENCE)).toBe(false);
  });

  it("returns false when confidence is above MIN_CONFIDENCE", () => {
    expect(shouldSkipFrame(SMOOTHING.MIN_CONFIDENCE + 0.01)).toBe(false);
    expect(shouldSkipFrame(1.0)).toBe(false);
  });

  it("uses 0.3 as the threshold", () => {
    expect(SMOOTHING.MIN_CONFIDENCE).toBe(0.3);
    expect(shouldSkipFrame(0.29)).toBe(true);
    expect(shouldSkipFrame(0.3)).toBe(false);
  });
});

describe("isLowConfidence", () => {
  it("returns true when confidence is below LOW_CONFIDENCE", () => {
    expect(isLowConfidence(SMOOTHING.LOW_CONFIDENCE - 0.01)).toBe(true);
    expect(isLowConfidence(0)).toBe(true);
    expect(isLowConfidence(0.3)).toBe(true);
  });

  it("returns false when confidence is at LOW_CONFIDENCE", () => {
    expect(isLowConfidence(SMOOTHING.LOW_CONFIDENCE)).toBe(false);
  });

  it("returns false when confidence is above LOW_CONFIDENCE", () => {
    expect(isLowConfidence(SMOOTHING.LOW_CONFIDENCE + 0.01)).toBe(false);
    expect(isLowConfidence(1.0)).toBe(false);
  });

  it("uses 0.5 as the threshold", () => {
    expect(SMOOTHING.LOW_CONFIDENCE).toBe(0.5);
    expect(isLowConfidence(0.49)).toBe(true);
    expect(isLowConfidence(0.5)).toBe(false);
  });
});
