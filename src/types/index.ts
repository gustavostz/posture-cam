export interface PostureScore {
  timestamp: number;
  score: number;
  shoulderAngle: number;
  headForwardRatio: number;
}

export interface Session {
  id: number;
  start_time: string;
  end_time: string | null;
  avg_score: number;
  good_posture_seconds: number;
  bad_posture_seconds: number;
}

export interface Settings {
  sensitivity: number;             // 1-3 (1=Relaxed, 2=Normal, 3=Strict)
  scoreThreshold: number;          // 50-100, default 90
  notificationsEnabled: boolean;
  notificationCooldownSec: number;
  showScreenshotInAlert: boolean;
  calibrationData: string;
}

export type PostureStatus = "good" | "fair" | "poor";

export type TabId = "camera" | "statistics" | "settings";
