import { useRef, useCallback, useEffect, type MutableRefObject } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { LandmarkOverlay } from "@/components/camera/LandmarkOverlay";
import { usePoseDetection } from "@/hooks/usePoseDetection";
import { usePostureScore } from "@/hooks/usePostureScore";
import { drawPostureOverlay } from "@/lib/posture/visualization";
import type { PostureAssessment, CalibrationProfile } from "@/lib/posture/types";

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

interface CameraViewProps {
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  sensitivity: number;
  scoreThreshold: number;
  calibrationData: string;
  onAssessmentChange: (assessment: PostureAssessment | null) => void;
  onCalibrationComplete: (profile: CalibrationProfile) => void;
  screenshotFnRef?: MutableRefObject<(() => string | null) | null>;
}

export function CameraView({
  isMonitoring,
  onToggleMonitoring,
  sensitivity,
  scoreThreshold,
  calibrationData,
  onAssessmentChange,
  onCalibrationComplete,
  screenshotFnRef,
}: CameraViewProps) {
  const webcamRef = useRef<Webcam>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleUserMedia = useCallback(() => {
    if (webcamRef.current?.video) {
      videoRef.current = webcamRef.current.video;
    }
  }, []);

  const { landmarks, isLoading, error } = usePoseDetection(
    videoRef,
    isMonitoring
  );

  const {
    assessment,
    isCalibrating,
    startCalibration,
    calibrationProgress,
    lastCalibrationProfile,
  } = usePostureScore(landmarks, sensitivity, scoreThreshold, calibrationData || null);

  // Push assessment up to parent
  const prevAssessmentRef = useRef<PostureAssessment | null>(null);
  if (assessment !== prevAssessmentRef.current) {
    prevAssessmentRef.current = assessment;
    onAssessmentChange(assessment);
  }

  // Hook up calibration completion
  const handleCalibrate = useCallback(() => {
    startCalibration();
  }, [startCalibration]);

  // When calibration completes, notify parent to persist the profile
  const prevProfileRef = useRef(lastCalibrationProfile);
  if (lastCalibrationProfile && lastCalibrationProfile !== prevProfileRef.current) {
    prevProfileRef.current = lastCalibrationProfile;
    onCalibrationComplete(lastCalibrationProfile);
  }

  const score = assessment?.score ?? null;
  const shoulderTilt = assessment?.metrics.shoulderTiltRatio ?? null;

  // Register screenshot capture that composites video + landmark overlay
  const latestLandmarksRef = useRef(landmarks);
  const latestScoreRef = useRef(score);
  latestLandmarksRef.current = landmarks;
  latestScoreRef.current = score;

  useEffect(() => {
    if (!screenshotFnRef) return;
    screenshotFnRef.current = () => {
      const video = videoRef.current;
      if (!video) return webcamRef.current?.getScreenshot() ?? null;

      const canvas = document.createElement("canvas");
      canvas.width = VIDEO_WIDTH;
      canvas.height = VIDEO_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.save();
      ctx.translate(VIDEO_WIDTH, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
      ctx.restore();

      if (latestLandmarksRef.current) {
        drawPostureOverlay(
          ctx,
          latestLandmarksRef.current,
          VIDEO_WIDTH,
          VIDEO_HEIGHT,
          latestScoreRef.current ?? undefined,
          scoreThreshold
        );
      }

      return canvas.toDataURL("image/jpeg", 0.85);
    };
    return () => { screenshotFnRef.current = null; };
  }, [screenshotFnRef, scoreThreshold]);
  const headDrop = assessment?.metrics.headDropRatio ?? null;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Camera feed area */}
      <div className="mx-auto w-full max-w-[640px]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-neutral-950">
          {isMonitoring ? (
            <>
              <Webcam
                ref={webcamRef}
                audio={false}
                mirrored
                videoConstraints={{
                  width: VIDEO_WIDTH,
                  height: VIDEO_HEIGHT,
                  facingMode: "user",
                }}
                onUserMedia={handleUserMedia}
                className="h-full w-full object-cover"
              />
              <LandmarkOverlay
                landmarks={landmarks}
                width={VIDEO_WIDTH}
                height={VIDEO_HEIGHT}
                score={score ?? undefined}
                scoreThreshold={scoreThreshold}
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <p className="text-sm text-white">Loading pose detection...</p>
                </div>
              )}
              {isCalibrating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
                  <p className="text-sm font-medium text-white">
                    Calibrating... Sit in your best posture
                  </p>
                  <div className="w-48">
                    <Progress value={calibrationProgress} />
                  </div>
                  <p className="text-xs text-white/70">
                    {calibrationProgress}%
                  </p>
                </div>
              )}
              {!isLoading && !isCalibrating && !error && !landmarks && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <p className="max-w-xs text-center text-sm text-amber-300">
                    Not tracking - please position yourself in front of the camera
                  </p>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <p className="max-w-xs text-center text-sm text-red-400">
                    {error}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div
              className="flex h-full cursor-pointer items-center justify-center text-muted-foreground"
              onClick={onToggleMonitoring}
            >
              <div className="flex flex-col items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-40"
                >
                  <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
                  <rect x="2" y="6" width="14" height="12" rx="2" />
                </svg>
                <span className="text-sm">
                  Click here or press Start to begin
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metrics */}
      <Card className="mx-auto w-full max-w-[640px]">
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold tabular-nums">
                {score !== null ? Math.round(score) : "--"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Current Score
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums">
                {shoulderTilt !== null
                  ? `${Math.abs(shoulderTilt).toFixed(2)}`
                  : "--"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Shoulder Tilt
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums">
                {headDrop !== null ? headDrop.toFixed(2) : "--"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Head Position
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="mx-auto w-full max-w-[640px]" />

      {/* Controls */}
      <div className="mx-auto flex w-full max-w-[640px] gap-3">
        <Button
          className="flex-1"
          variant={isMonitoring ? "destructive" : "default"}
          size="lg"
          onClick={onToggleMonitoring}
          disabled={isCalibrating}
        >
          {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={handleCalibrate}
          disabled={!isMonitoring || isCalibrating}
        >
          {isCalibrating ? "Calibrating..." : "Calibrate"}
        </Button>
      </div>
    </div>
  );
}
