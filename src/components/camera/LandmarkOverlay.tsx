import { useEffect, useRef } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { drawPostureOverlay } from "@/lib/posture/visualization";

export interface LandmarkOverlayProps {
  landmarks: NormalizedLandmark[] | null;
  width: number;
  height: number;
  score?: number;
  scoreThreshold?: number;
}

export function LandmarkOverlay({
  landmarks,
  width,
  height,
  score,
  scoreThreshold,
}: LandmarkOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!landmarks || landmarks.length === 0) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    drawPostureOverlay(ctx, landmarks, width, height, score, scoreThreshold);
  }, [landmarks, width, height, score, scoreThreshold]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: "none",
      }}
    />
  );
}
