import Database from "@tauri-apps/plugin-sql";
import type { Session, PostureScore, Settings } from "@/types";
import { DEFAULTS } from "@/lib/constants";

// Singleton database connection
let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:posture-monitor.db");
  }
  return db;
}

// ---------------------------------------------------------------------------
// Session operations
// ---------------------------------------------------------------------------

export async function createSession(): Promise<number> {
  const conn = await getDb();
  const result = await conn.execute(
    "INSERT INTO sessions (start_time) VALUES ($1)",
    [new Date().toISOString()]
  );
  return result.lastInsertId as number;
}

export async function updateSessionProgress(
  id: number,
  avgScore: number,
  goodSec: number,
  badSec: number
): Promise<void> {
  const conn = await getDb();
  await conn.execute(
    "UPDATE sessions SET avg_score = $1, good_posture_seconds = $2, bad_posture_seconds = $3 WHERE id = $4",
    [avgScore, Math.round(goodSec), Math.round(badSec), id]
  );
}

export async function endSession(
  id: number,
  avgScore: number,
  goodSec: number,
  badSec: number
): Promise<void> {
  const conn = await getDb();
  await conn.execute(
    "UPDATE sessions SET end_time = $1, avg_score = $2, good_posture_seconds = $3, bad_posture_seconds = $4 WHERE id = $5",
    [new Date().toISOString(), avgScore, Math.round(goodSec), Math.round(badSec), id]
  );
}

export async function getSessions(limit: number = 50): Promise<Session[]> {
  const conn = await getDb();
  const rows = await conn.select<Session[]>(
    "SELECT id, start_time, end_time, avg_score, good_posture_seconds, bad_posture_seconds FROM sessions ORDER BY start_time DESC LIMIT $1",
    [limit]
  );
  return rows;
}

export async function getSessionById(id: number): Promise<Session | null> {
  const conn = await getDb();
  const rows = await conn.select<Session[]>(
    "SELECT id, start_time, end_time, avg_score, good_posture_seconds, bad_posture_seconds FROM sessions WHERE id = $1",
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

// ---------------------------------------------------------------------------
// Snapshot operations
// ---------------------------------------------------------------------------

interface SnapshotRow {
  id: number;
  session_id: number;
  timestamp: string;
  score: number;
  shoulder_angle: number;
  head_forward_ratio: number;
}

function rowToPostureScore(row: SnapshotRow): PostureScore {
  return {
    timestamp: new Date(row.timestamp).getTime(),
    score: row.score,
    shoulderAngle: row.shoulder_angle,
    headForwardRatio: row.head_forward_ratio,
  };
}

export async function insertSnapshot(
  sessionId: number,
  score: number,
  shoulderAngle: number,
  headForwardRatio: number
): Promise<void> {
  const conn = await getDb();
  await conn.execute(
    "INSERT INTO score_snapshots (session_id, timestamp, score, shoulder_angle, head_forward_ratio) VALUES ($1, $2, $3, $4, $5)",
    [sessionId, new Date().toISOString(), score, shoulderAngle, headForwardRatio]
  );
}

export async function getSnapshotsForSession(
  sessionId: number
): Promise<PostureScore[]> {
  const conn = await getDb();
  const rows = await conn.select<SnapshotRow[]>(
    "SELECT id, session_id, timestamp, score, shoulder_angle, head_forward_ratio FROM score_snapshots WHERE session_id = $1 ORDER BY timestamp ASC",
    [sessionId]
  );
  return rows.map(rowToPostureScore);
}

export async function getSnapshotsForDateRange(
  startDate: string,
  endDate: string
): Promise<PostureScore[]> {
  const conn = await getDb();
  const rows = await conn.select<SnapshotRow[]>(
    "SELECT id, session_id, timestamp, score, shoulder_angle, head_forward_ratio FROM score_snapshots WHERE timestamp >= $1 AND timestamp <= $2 ORDER BY timestamp ASC",
    [startDate, endDate]
  );
  return rows.map(rowToPostureScore);
}

// ---------------------------------------------------------------------------
// Settings operations
// ---------------------------------------------------------------------------

interface SettingRow {
  key: string;
  value: string;
}

const DB_KEY_TO_PROP: Record<string, keyof Settings> = {
  sensitivity: "sensitivity",
  score_threshold: "scoreThreshold",
  notifications_enabled: "notificationsEnabled",
  notification_cooldown_sec: "notificationCooldownSec",
  show_screenshot_in_alert: "showScreenshotInAlert",
  calibration_data: "calibrationData",
};

const PROP_TO_DB_KEY: Record<keyof Settings, string> = {
  sensitivity: "sensitivity",
  scoreThreshold: "score_threshold",
  notificationsEnabled: "notifications_enabled",
  notificationCooldownSec: "notification_cooldown_sec",
  showScreenshotInAlert: "show_screenshot_in_alert",
  calibrationData: "calibration_data",
};

export async function getSetting(key: string): Promise<string | null> {
  const conn = await getDb();
  const rows = await conn.select<SettingRow[]>(
    "SELECT key, value FROM settings WHERE key = $1",
    [key]
  );
  return rows.length > 0 ? rows[0].value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const conn = await getDb();
  await conn.execute(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2",
    [key, value]
  );
}

export async function getAllSettings(): Promise<Settings> {
  const conn = await getDb();
  const rows = await conn.select<SettingRow[]>(
    "SELECT key, value FROM settings"
  );

  const settings: Settings = {
    sensitivity: DEFAULTS.SENSITIVITY,
    scoreThreshold: DEFAULTS.SCORE_THRESHOLD,
    notificationsEnabled: true,
    notificationCooldownSec: DEFAULTS.NOTIFICATION_COOLDOWN_SEC,
    showScreenshotInAlert: true,
    calibrationData: "",
  };

  for (const row of rows) {
    const prop = DB_KEY_TO_PROP[row.key];
    if (prop === undefined) continue;

    switch (prop) {
      case "sensitivity":
      case "scoreThreshold":
      case "notificationCooldownSec":
        settings[prop] = Number(row.value);
        break;
      case "notificationsEnabled":
      case "showScreenshotInAlert":
        settings[prop] = row.value === "true";
        break;
      case "calibrationData":
        settings[prop] = row.value;
        break;
    }
  }

  return settings;
}

export async function updateAllSettings(settings: Settings): Promise<void> {
  const conn = await getDb();

  const entries: [string, string][] = [
    [PROP_TO_DB_KEY.sensitivity, String(settings.sensitivity)],
    [PROP_TO_DB_KEY.scoreThreshold, String(settings.scoreThreshold)],
    [PROP_TO_DB_KEY.notificationsEnabled, String(settings.notificationsEnabled)],
    [PROP_TO_DB_KEY.notificationCooldownSec, String(settings.notificationCooldownSec)],
    [PROP_TO_DB_KEY.showScreenshotInAlert, String(settings.showScreenshotInAlert)],
    [PROP_TO_DB_KEY.calibrationData, settings.calibrationData],
  ];

  for (const [key, value] of entries) {
    await conn.execute(
      "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2",
      [key, value]
    );
  }
}
