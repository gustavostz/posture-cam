import { describe, it, expect } from "vitest";
import { calculateMetrics } from "../calculations";
import { midpoint, euclideanDistance2D } from "../landmarks";
import {
  createLandmark,
  createPerfectPostureKeypoints,
  createTiltedShoulderKeypoints,
  createHeadDropKeypoints,
} from "@/test/mocks/landmarks";

describe("calculateMetrics", () => {
  it("returns non-null metrics for valid keypoints", () => {
    const keypoints = createPerfectPostureKeypoints();
    const metrics = calculateMetrics(keypoints);
    expect(metrics).not.toBeNull();
  });

  it("returns null when shoulder width is degenerate (< 0.01)", () => {
    const keypoints = createPerfectPostureKeypoints();
    // Collapse shoulders to the same point
    keypoints.leftShoulder = createLandmark(0.5, 0.35, 0);
    keypoints.rightShoulder = createLandmark(0.5, 0.35, 0);
    const metrics = calculateMetrics(keypoints);
    expect(metrics).toBeNull();
  });

  it("returns null when torso length is degenerate (< 0.01)", () => {
    const keypoints = createPerfectPostureKeypoints();
    // Make hips coincide with shoulders
    keypoints.leftHip = createLandmark(0.4, 0.35, 0);
    keypoints.rightHip = createLandmark(0.6, 0.35, 0);
    const metrics = calculateMetrics(keypoints);
    expect(metrics).toBeNull();
  });

  describe("shoulderTiltRatio", () => {
    it("returns ~0 for perfectly level shoulders", () => {
      const keypoints = createPerfectPostureKeypoints();
      const metrics = calculateMetrics(keypoints)!;
      // leftShoulder.y === rightShoulder.y => dy = 0 => ratio = 0
      expect(metrics.shoulderTiltRatio).toBeCloseTo(0, 5);
    });

    it("equals (rightShoulder.y - leftShoulder.y) / shoulderWidth", () => {
      const keypoints = createPerfectPostureKeypoints();
      keypoints.rightShoulder = createLandmark(0.6, 0.45, 0);
      const metrics = calculateMetrics(keypoints)!;

      const dy = 0.45 - 0.35; // 0.1
      const shoulderWidth = euclideanDistance2D(
        keypoints.leftShoulder,
        keypoints.rightShoulder
      );
      const expected = dy / shoulderWidth;
      expect(metrics.shoulderTiltRatio).toBeCloseTo(expected, 5);
    });

    it("is positive when right shoulder is lower (larger y)", () => {
      const keypoints = createTiltedShoulderKeypoints(15);
      const metrics = calculateMetrics(keypoints)!;
      expect(metrics.shoulderTiltRatio).toBeGreaterThan(0);
    });

    it("is negative when right shoulder is higher (smaller y)", () => {
      const keypoints = createTiltedShoulderKeypoints(-15);
      const metrics = calculateMetrics(keypoints)!;
      expect(metrics.shoulderTiltRatio).toBeLessThan(0);
    });

    it("matches the formula for the tilted shoulder helper", () => {
      const angleDeg = 15;
      const keypoints = createTiltedShoulderKeypoints(angleDeg);
      const metrics = calculateMetrics(keypoints)!;

      const dy =
        keypoints.rightShoulder.y - keypoints.leftShoulder.y;
      const shoulderWidth = euclideanDistance2D(
        keypoints.leftShoulder,
        keypoints.rightShoulder
      );
      expect(metrics.shoulderTiltRatio).toBeCloseTo(dy / shoulderWidth, 5);
    });
  });

  describe("headDropRatio", () => {
    it("is negative for the default perfect posture (nose above shoulders)", () => {
      const keypoints = createPerfectPostureKeypoints();
      const metrics = calculateMetrics(keypoints)!;
      // nose.y = 0.2, shoulderMid.y = 0.35 => nose.y < shoulderMid.y => negative
      expect(metrics.headDropRatio).toBeLessThan(0);
    });

    it("equals (nose.y - shoulderMid.y) / torsoLength", () => {
      const keypoints = createPerfectPostureKeypoints();
      const metrics = calculateMetrics(keypoints)!;

      const shoulderMid = midpoint(
        keypoints.leftShoulder,
        keypoints.rightShoulder
      );
      const hipMid = midpoint(keypoints.leftHip, keypoints.rightHip);
      const torsoLength = euclideanDistance2D(shoulderMid, hipMid);

      const expected = (keypoints.nose.y - shoulderMid.y) / torsoLength;
      expect(metrics.headDropRatio).toBeCloseTo(expected, 5);
    });

    it("increases when the head drops lower", () => {
      const normal = createPerfectPostureKeypoints();
      const dropped = createHeadDropKeypoints(0.1);

      const normalMetrics = calculateMetrics(normal)!;
      const droppedMetrics = calculateMetrics(dropped)!;
      expect(droppedMetrics.headDropRatio).toBeGreaterThan(
        normalMetrics.headDropRatio
      );
    });

    it("increases further for larger drop amounts", () => {
      const small = createHeadDropKeypoints(0.05);
      const large = createHeadDropKeypoints(0.15);

      const smallMetrics = calculateMetrics(small)!;
      const largeMetrics = calculateMetrics(large)!;
      expect(largeMetrics.headDropRatio).toBeGreaterThan(
        smallMetrics.headDropRatio
      );
    });
  });

  describe("torsoRatio", () => {
    it("equals torsoLength / shoulderWidth", () => {
      const keypoints = createPerfectPostureKeypoints();
      const metrics = calculateMetrics(keypoints)!;

      const shoulderMid = midpoint(
        keypoints.leftShoulder,
        keypoints.rightShoulder
      );
      const hipMid = midpoint(keypoints.leftHip, keypoints.rightHip);
      const shoulderWidth = euclideanDistance2D(
        keypoints.leftShoulder,
        keypoints.rightShoulder
      );
      const torsoLength = euclideanDistance2D(shoulderMid, hipMid);

      expect(metrics.torsoRatio).toBeCloseTo(torsoLength / shoulderWidth, 5);
    });

    it("decreases when torso compresses (hips move closer to shoulders)", () => {
      const normal = createPerfectPostureKeypoints();
      const compressed = createPerfectPostureKeypoints();
      // Move hips closer to shoulders to simulate slouch
      compressed.leftHip = createLandmark(0.42, 0.45, 0);
      compressed.rightHip = createLandmark(0.58, 0.45, 0);

      const normalMetrics = calculateMetrics(normal)!;
      const compressedMetrics = calculateMetrics(compressed)!;
      expect(compressedMetrics.torsoRatio).toBeLessThan(
        normalMetrics.torsoRatio
      );
    });

    it("is about 1.25 for the default perfect posture keypoints", () => {
      // shoulderWidth = 0.2, torsoLength = 0.25 => ratio = 1.25
      const keypoints = createPerfectPostureKeypoints();
      const metrics = calculateMetrics(keypoints)!;
      expect(metrics.torsoRatio).toBeCloseTo(1.25, 2);
    });
  });
});

