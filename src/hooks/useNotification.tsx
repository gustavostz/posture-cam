import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import type { Settings } from "@/types";
import { DEFAULTS } from "@/lib/constants";

export function useNotification(
  score: number | null,
  settings: Settings | null,
  getScreenshot?: () => string | null
): void {
  const badStartRef = useRef<number | null>(null);
  const lastAlertRef = useRef<number>(0);

  useEffect(() => {
    if (score === null || !settings || !settings.notificationsEnabled) {
      badStartRef.current = null;
      return;
    }

    const threshold = settings.scoreThreshold;
    const cooldownMs = settings.notificationCooldownSec * 1000;
    const delayMs = DEFAULTS.BAD_POSTURE_ALERT_DELAY_SEC * 1000;

    if (score >= threshold) {
      badStartRef.current = null;
      return;
    }

    const now = Date.now();

    if (badStartRef.current === null) {
      badStartRef.current = now;
      return;
    }

    const sustainedBadMs = now - badStartRef.current;
    const sinceLastAlert = now - lastAlertRef.current;

    if (sustainedBadMs >= delayMs && sinceLastAlert >= cooldownMs) {
      lastAlertRef.current = now;
      badStartRef.current = null;

      const roundedScore = Math.round(score);

      let screenshotUrl: string | null = null;
      if (settings.showScreenshotInAlert && getScreenshot) {
        screenshotUrl = getScreenshot();
      }

      // In-app toast
      if (screenshotUrl) {
        const imgSrc = screenshotUrl;
        toast.custom(
          () => (
            <div className="flex gap-3 rounded-lg border bg-card p-3 shadow-lg">
              <img
                src={imgSrc}
                alt="Posture snapshot"
                className="h-24 w-32 rounded border-2 border-red-500/50 object-cover"
              />
              <div className="flex flex-col justify-center gap-1">
                <p className="text-sm font-semibold text-foreground">
                  Sit up straight!
                </p>
                <p className="text-xs text-muted-foreground">
                  Your posture score dropped to {roundedScore}
                </p>
              </div>
            </div>
          ),
          { duration: 10000 }
        );
      } else {
        toast.warning("Sit up straight!", {
          description: `Your posture score dropped to ${roundedScore}`,
          duration: 6000,
        });
      }

      // OS notification with screenshot
      void sendOsNotificationWithImage(
        `Sit up straight! Your posture score dropped to ${roundedScore}`,
        screenshotUrl
      );
    }
  }, [score, settings, getScreenshot]);
}

async function sendOsNotificationWithImage(
  message: string,
  screenshotDataUrl: string | null
): Promise<void> {
  try {
    if (screenshotDataUrl) {
      try {
        // Save screenshot to disk, then send notification with image via Rust
        const filePath = await invoke<string>("save_screenshot", {
          base64Data: screenshotDataUrl,
        });

        await invoke("send_notification_with_image", {
          title: "Posture Monitor",
          body: message,
          imagePath: filePath,
        });
        return;
      } catch (err) {
        console.warn("Failed to send notification with image:", err);
      }
    }

    // Fallback: text-only via JS API
    let permitted = await isPermissionGranted();
    if (!permitted) {
      const result = await requestPermission();
      permitted = result === "granted";
    }
    if (permitted) {
      sendNotification({ title: "Posture Monitor", body: message });
    }
  } catch {
    // Silently ignore notification failures
  }
}
