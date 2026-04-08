import { SMOOTHING, STATUS_CONFIG } from "@/lib/constants";
import type { PostureStatus } from "@/types";

export class PostureSmoother {
  private metricValues: Map<string, number> = new Map();
  private smoothedScore: number | null = null;
  private currentStatus: PostureStatus = "good";
  private worsenCounter = 0;
  private improveCounter = 0;
  private scoreThreshold = 90;

  setScoreThreshold(threshold: number): void {
    this.scoreThreshold = threshold;
  }

  smoothMetric(key: string, rawValue: number, confidence: number): number {
    const alpha =
      confidence < SMOOTHING.LOW_CONFIDENCE
        ? SMOOTHING.METRIC_LOW_CONFIDENCE_ALPHA
        : SMOOTHING.METRIC_ALPHA;

    const prev = this.metricValues.get(key);
    if (prev === undefined) {
      this.metricValues.set(key, rawValue);
      return rawValue;
    }

    const smoothed = prev + alpha * (rawValue - prev);
    this.metricValues.set(key, smoothed);
    return smoothed;
  }

  smoothScore(rawScore: number): number {
    if (this.smoothedScore === null) {
      this.smoothedScore = rawScore;
      return rawScore;
    }

    this.smoothedScore =
      this.smoothedScore + SMOOTHING.SCORE_ALPHA * (rawScore - this.smoothedScore);
    return Math.round(this.smoothedScore);
  }

  /**
   * Status is relative to the user's scoreThreshold:
   * - Good: score >= scoreThreshold
   * - Fair: score >= scoreThreshold - FAIR_BAND
   * - Poor: score < scoreThreshold - FAIR_BAND
   */
  getStatus(score: number): PostureStatus {
    const targetStatus = this.rawStatus(score);

    if (targetStatus === this.currentStatus) {
      this.worsenCounter = 0;
      this.improveCounter = 0;
      return this.currentStatus;
    }

    const isWorsening = this.statusRank(targetStatus) < this.statusRank(this.currentStatus);

    if (isWorsening) {
      this.improveCounter = 0;
      this.worsenCounter++;
      if (this.worsenCounter >= STATUS_CONFIG.WORSEN_FRAMES) {
        this.currentStatus = targetStatus;
        this.worsenCounter = 0;
      }
    } else {
      this.worsenCounter = 0;
      this.improveCounter++;
      if (this.improveCounter >= STATUS_CONFIG.IMPROVE_FRAMES) {
        this.currentStatus = targetStatus;
        this.improveCounter = 0;
      }
    }

    return this.currentStatus;
  }

  reset(): void {
    this.metricValues.clear();
    this.smoothedScore = null;
    this.currentStatus = "good";
    this.worsenCounter = 0;
    this.improveCounter = 0;
  }

  private rawStatus(score: number): PostureStatus {
    if (score >= this.scoreThreshold) return "good";
    if (score >= this.scoreThreshold - STATUS_CONFIG.FAIR_BAND) return "fair";
    return "poor";
  }

  private statusRank(status: PostureStatus): number {
    switch (status) {
      case "good": return 2;
      case "fair": return 1;
      case "poor": return 0;
    }
  }
}
