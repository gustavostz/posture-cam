import { useRef, useState, useEffect, useCallback } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type {
  PostureAssessment,
  CalibrationProfile,
  PostureMetrics,
  PostureKeypoints,
} from "@/lib/posture/types";
import { PostureAnalyzer } from "@/lib/posture/analyzer";
import { extractKeypoints } from "@/lib/posture/landmarks";
import { calculateMetrics } from "@/lib/posture/calculations";
import { computeCalibrationProfile } from "@/lib/posture/calibration";
import { computeConfidence, shouldSkipFrame } from "@/lib/posture/confidence";
import { DEFAULTS } from "@/lib/constants";

export function usePostureScore(
  landmarks: NormalizedLandmark[] | null,
  sensitivity: number,
  scoreThreshold: number,
  calibrationData: string | null
): {
  assessment: PostureAssessment | null;
  isCalibrating: boolean;
  startCalibration: () => void;
  calibrationProgress: number;
  lastCalibrationProfile: CalibrationProfile | null;
} {
  const analyzerRef = useRef<PostureAnalyzer>(
    new PostureAnalyzer(sensitivity, scoreThreshold)
  );
  const [assessment, setAssessment] = useState<PostureAssessment | null>(null);

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [lastCalibrationProfile, setLastCalibrationProfile] =
    useState<CalibrationProfile | null>(null);
  const calibrationMetricsRef = useRef<PostureMetrics[]>([]);
  const calibrationKeypointsRef = useRef<PostureKeypoints[]>([]);

  useEffect(() => {
    analyzerRef.current.setSensitivity(sensitivity);
  }, [sensitivity]);

  useEffect(() => {
    analyzerRef.current.setScoreThreshold(scoreThreshold);
  }, [scoreThreshold]);

  useEffect(() => {
    if (!calibrationData) {
      analyzerRef.current.setCalibration(null);
      return;
    }
    try {
      const profile = JSON.parse(calibrationData) as CalibrationProfile;
      analyzerRef.current.setCalibration(profile);
    } catch {
      analyzerRef.current.setCalibration(null);
    }
  }, [calibrationData]);

  useEffect(() => {
    if (!landmarks) {
      setAssessment(null);
      return;
    }

    if (isCalibrating) {
      const keypoints = extractKeypoints(landmarks);
      if (!keypoints) return;
      const confidence = computeConfidence(keypoints);
      if (shouldSkipFrame(confidence)) return;
      const metrics = calculateMetrics(keypoints);
      if (!metrics) return;

      calibrationMetricsRef.current.push(metrics);
      calibrationKeypointsRef.current.push(keypoints);

      const progress = Math.round(
        (calibrationMetricsRef.current.length / DEFAULTS.CALIBRATION_FRAMES) * 100
      );
      setCalibrationProgress(Math.min(progress, 100));

      if (calibrationMetricsRef.current.length >= DEFAULTS.CALIBRATION_FRAMES) {
        const profile = computeCalibrationProfile(
          calibrationMetricsRef.current,
          calibrationKeypointsRef.current
        );
        analyzerRef.current.setCalibration(profile);
        analyzerRef.current.reset();
        setLastCalibrationProfile(profile);
        calibrationMetricsRef.current = [];
        calibrationKeypointsRef.current = [];
        setIsCalibrating(false);
        setCalibrationProgress(0);
      }
      return;
    }

    const result = analyzerRef.current.analyzeFrame(landmarks);
    setAssessment(result);
  }, [landmarks, isCalibrating]);

  const startCalibration = useCallback(() => {
    calibrationMetricsRef.current = [];
    calibrationKeypointsRef.current = [];
    setCalibrationProgress(0);
    setIsCalibrating(true);
  }, []);

  return {
    assessment,
    isCalibrating,
    startCalibration,
    calibrationProgress,
    lastCalibrationProfile,
  };
}
