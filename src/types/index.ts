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
  strictness: number;
  notificationsEnabled: boolean;
  notificationCooldownSec: number;
  badPostureThreshold: number;
  calibrationData: string;
}

export type PostureStatus = "good" | "fair" | "poor";

export type TabId = "camera" | "statistics" | "settings";
