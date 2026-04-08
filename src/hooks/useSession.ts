import { useEffect, useRef, useState, useCallback } from "react";
import type { PostureAssessment } from "@/lib/posture/types";
import { createSession, endSession, insertSnapshot } from "@/lib/db";
import { DEFAULTS } from "@/lib/constants";

/**
 * Manages the lifecycle of a monitoring session.
 *
 * - Creates a new DB session when monitoring starts.
 * - Tracks cumulative good/bad seconds and running average score.
 * - Persists score snapshots every SNAPSHOT_INTERVAL_MS.
 * - Finalises the session in the DB when monitoring stops.
 */
export function useSession(
  assessment: PostureAssessment | null,
  isMonitoring: boolean
): {
  sessionId: number | null;
  sessionStartTime: number | null;
  goodSeconds: number;
  badSeconds: number;
  avgScore: number;
} {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [goodSeconds, setGoodSeconds] = useState(0);
  const [badSeconds, setBadSeconds] = useState(0);
  const [avgScore, setAvgScore] = useState(0);

  // Refs for tracking between renders
  const lastTickRef = useRef<number>(0);
  const lastSnapshotRef = useRef<number>(0);
  const scoreAccumulatorRef = useRef(0);
  const scoreCountRef = useRef(0);
  const sessionIdRef = useRef<number | null>(null);

  // Keep the ref in sync so callbacks can read the latest session id
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Start/end session when isMonitoring changes
  useEffect(() => {
    if (isMonitoring) {
      let cancelled = false;

      const start = async () => {
        try {
          const id = await createSession();
          if (!cancelled) {
            const now = Date.now();
            setSessionId(id);
            setSessionStartTime(now);
            setGoodSeconds(0);
            setBadSeconds(0);
            setAvgScore(0);
            lastTickRef.current = now;
            lastSnapshotRef.current = now;
            scoreAccumulatorRef.current = 0;
            scoreCountRef.current = 0;
          }
        } catch (err) {
          console.error("Failed to create session:", err);
        }
      };

      void start();

      return () => {
        cancelled = true;
      };
    } else {
      // Monitoring stopped: finalize the session
      const id = sessionIdRef.current;
      if (id !== null) {
        const finalAvg =
          scoreCountRef.current > 0
            ? Math.round(scoreAccumulatorRef.current / scoreCountRef.current)
            : 0;

        void endSession(id, finalAvg, goodSeconds, badSeconds).catch(
          (err) => console.error("Failed to end session:", err)
        );

        setSessionId(null);
        setSessionStartTime(null);
      }
    }
    // Only react to isMonitoring changes. goodSeconds/badSeconds are intentionally
    // read from state at the time monitoring stops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMonitoring]);

  // Track time and persist snapshots as assessments arrive
  const trackAssessment = useCallback(
    (assess: PostureAssessment) => {
      const now = Date.now();

      // Accumulate good/bad seconds since last tick
      const elapsed = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      if (assess.status === "good") {
        setGoodSeconds((prev) => prev + elapsed);
      } else {
        setBadSeconds((prev) => prev + elapsed);
      }

      // Running average score
      scoreAccumulatorRef.current += assess.score;
      scoreCountRef.current += 1;
      setAvgScore(
        Math.round(scoreAccumulatorRef.current / scoreCountRef.current)
      );

      // Persist snapshot at the configured interval
      const sinceLastSnapshot = now - lastSnapshotRef.current;
      const currentSessionId = sessionIdRef.current;

      if (
        sinceLastSnapshot >= DEFAULTS.SNAPSHOT_INTERVAL_MS &&
        currentSessionId !== null
      ) {
        lastSnapshotRef.current = now;
        void insertSnapshot(
          currentSessionId,
          assess.score,
          assess.metrics.shoulderTiltRatio,
          assess.metrics.headDropRatio
        ).catch((err) => console.error("Failed to insert snapshot:", err));
      }
    },
    []
  );

  // Process each new assessment
  useEffect(() => {
    if (!isMonitoring || assessment === null || sessionId === null) return;
    trackAssessment(assessment);
  }, [assessment, isMonitoring, sessionId, trackAssessment]);

  return {
    sessionId,
    sessionStartTime,
    goodSeconds,
    badSeconds,
    avgScore,
  };
}
