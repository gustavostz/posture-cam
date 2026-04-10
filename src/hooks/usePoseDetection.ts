import { useEffect, useRef, useState, useCallback, type RefObject } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
  type Landmark,
} from "@mediapipe/tasks-vision";
import { DEFAULTS } from "@/lib/constants";

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const FRAME_INTERVAL_MS = Math.round(1000 / DEFAULTS.TARGET_FPS);

// Shared singleton: the model is loaded once and reused across hook instances
let sharedLandmarker: PoseLandmarker | null = null;
let loadingPromise: Promise<PoseLandmarker> | null = null;

/**
 * Preload the MediaPipe model on app start. Call this early (e.g. in App.tsx)
 * so the model is ready when the user clicks "Start Monitoring".
 */
export function preloadPoseModel(): void {
  if (sharedLandmarker || loadingPromise) return;
  loadingPromise = initializeLandmarker();
}

async function initializeLandmarker(): Promise<PoseLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
  const landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });
  sharedLandmarker = landmarker;
  return landmarker;
}

/**
 * Hook that manages pose detection on each video frame at a throttled rate.
 * Uses a shared PoseLandmarker singleton that can be preloaded.
 */
export function usePoseDetection(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean
): {
  landmarks: NormalizedLandmark[] | null;
  worldLandmarks: Landmark[] | null;
  isLoading: boolean;
  error: string | null;
} {
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [worldLandmarks, setWorldLandmarks] = useState<Landmark[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<number>(0);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);

  const ensureLandmarker = useCallback(async () => {
    if (landmarkerRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      if (sharedLandmarker) {
        landmarkerRef.current = sharedLandmarker;
      } else if (loadingPromise) {
        landmarkerRef.current = await loadingPromise;
      } else {
        loadingPromise = initializeLandmarker();
        landmarkerRef.current = await loadingPromise;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to initialize pose detection";
      setError(message);
      console.error("PoseLandmarker initialization error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Uses setInterval instead of requestAnimationFrame so detection continues
  // when the window is hidden (minimized to system tray). rAF pauses when
  // hidden, but setInterval keeps firing (~1Hz throttled), which is enough
  // for notifications to trigger.
  const detect = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !landmarker || video.readyState < 2) {
      return;
    }

    const now = performance.now();

    try {
      const result = landmarker.detectForVideo(video, now);

      if (result.landmarks.length > 0) {
        setLandmarks(result.landmarks[0]);
      } else {
        setLandmarks(null);
      }

      if (result.worldLandmarks.length > 0) {
        setWorldLandmarks(result.worldLandmarks[0]);
      } else {
        setWorldLandmarks(null);
      }
    } catch (err) {
      console.warn("Pose detection frame error:", err);
    }
  }, [videoRef]);

  // Start/stop based on `enabled`
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = 0;
      }
      setLandmarks(null);
      setWorldLandmarks(null);
      return;
    }

    let cancelled = false;

    const start = async () => {
      await ensureLandmarker();
      if (!cancelled) {
        intervalRef.current = window.setInterval(detect, FRAME_INTERVAL_MS);
      }
    };

    start();

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = 0;
      }
    };
  }, [enabled, ensureLandmarker, detect]);

  // Cleanup on unmount (don't close shared landmarker)
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { landmarks, worldLandmarks, isLoading, error };
}
