import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { PostureAssessment, PostureMetrics, PostureKeypoints, CalibrationProfile } from "./types";
import { extractKeypoints } from "./landmarks";
import { calculateMetrics } from "./calculations";
import { computeCalibrationProfile, computeDeviations } from "./calibration";
import { computeConfidence, shouldSkipFrame } from "./confidence";
import { getThresholds, scoreMetric, computeOverallScore } from "./scoring";
import { PostureSmoother } from "./smoother";
import { DEFAULTS } from "@/lib/constants";

export class PostureAnalyzer {
  private smoother: PostureSmoother;
  private calibration: CalibrationProfile | null;
  private sensitivity: number;

  private autoCalibrationMetrics: PostureMetrics[] = [];
  private autoCalibrationKeypoints: PostureKeypoints[] = [];
  private autoCalibrationStartTime: number | null = null;
  private autoCalibrated = false;

  constructor(sensitivity?: number, scoreThreshold?: number) {
    this.smoother = new PostureSmoother();
    this.smoother.setScoreThreshold(scoreThreshold ?? DEFAULTS.SCORE_THRESHOLD);
    this.calibration = null;
    this.sensitivity = sensitivity ?? DEFAULTS.SENSITIVITY;
  }

  setCalibration(calibration: CalibrationProfile | null): void {
    this.calibration = calibration;
    if (calibration) this.autoCalibrated = true;
  }

  setSensitivity(sensitivity: number): void {
    this.sensitivity = sensitivity;
  }

  setScoreThreshold(threshold: number): void {
    this.smoother.setScoreThreshold(threshold);
  }

  analyzeFrame(landmarks: NormalizedLandmark[]): PostureAssessment | null {
    const keypoints = extractKeypoints(landmarks);
    if (!keypoints) return null;

    const confidence = computeConfidence(keypoints);
    if (shouldSkipFrame(confidence)) return null;

    const metrics = calculateMetrics(keypoints);
    if (!metrics) return null;

    if (!this.calibration && !this.autoCalibrated) {
      this.collectAutoCalibration(metrics, keypoints);
      return null; // Don't return fake scores during auto-calibration
    }

    if (!this.calibration) {
      return this.buildAssessment(metrics, { shoulderDev: 0, headDev: 0, torsoDev: 0 }, confidence);
    }

    const deviations = computeDeviations(metrics, this.calibration);
    return this.buildAssessment(metrics, deviations, confidence);
  }

  private collectAutoCalibration(
    metrics: PostureMetrics,
    keypoints: PostureKeypoints
  ): void {
    const now = Date.now();
    if (this.autoCalibrationStartTime === null) {
      this.autoCalibrationStartTime = now;
    }

    this.autoCalibrationMetrics.push(metrics);
    this.autoCalibrationKeypoints.push(keypoints);

    const elapsed = (now - this.autoCalibrationStartTime) / 1000;
    if (elapsed >= DEFAULTS.AUTO_CALIBRATION_SEC && this.autoCalibrationMetrics.length >= 10) {
      this.calibration = computeCalibrationProfile(
        this.autoCalibrationMetrics,
        this.autoCalibrationKeypoints
      );
      this.autoCalibrated = true;
      this.autoCalibrationMetrics = [];
      this.autoCalibrationKeypoints = [];
      this.smoother.reset();
    }
  }

  private buildAssessment(
    metrics: PostureMetrics,
    deviations: { shoulderDev: number; headDev: number; torsoDev: number },
    confidence: number
  ): PostureAssessment {
    const smoothedShoulderDev = this.smoother.smoothMetric("shoulderDev", deviations.shoulderDev, confidence);
    const smoothedHeadDev = this.smoother.smoothMetric("headDev", deviations.headDev, confidence);
    const smoothedTorsoDev = this.smoother.smoothMetric("torsoDev", deviations.torsoDev, confidence);

    const thresholds = getThresholds(this.sensitivity);

    const shoulderScore = scoreMetric(smoothedShoulderDev, thresholds.shoulder.perfectZone, thresholds.shoulder.zeroAt);
    const headScore = scoreMetric(smoothedHeadDev, thresholds.head.perfectZone, thresholds.head.zeroAt);
    const torsoScore = scoreMetric(smoothedTorsoDev, thresholds.torso.perfectZone, thresholds.torso.zeroAt);

    const rawOverall = computeOverallScore(shoulderScore, headScore, torsoScore);
    const smoothedScore = this.smoother.smoothScore(rawOverall);
    const status = this.smoother.getStatus(smoothedScore);

    return {
      metrics,
      score: smoothedScore,
      componentScores: { shoulderAlignment: shoulderScore, headPosition: headScore, torsoAlignment: torsoScore },
      status,
      confidence,
      timestamp: Date.now(),
    };
  }

  reset(): void {
    this.smoother.reset();
    this.autoCalibrationMetrics = [];
    this.autoCalibrationKeypoints = [];
    this.autoCalibrationStartTime = null;
    this.autoCalibrated = false;
  }
}
