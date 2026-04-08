import { useState, useEffect, useRef, useCallback } from "react";
import type { Settings } from "@/types";
import { getAllSettings, setSetting } from "@/lib/db";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const s = await getAllSettings();
        if (!cancelled) setSettings(s);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const updateSensitivity = useCallback((value: number) => {
    setSettings((prev) => (prev ? { ...prev, sensitivity: value } : prev));
    setSetting("sensitivity", String(value));
  }, []);

  const updateScoreThreshold = useCallback((value: number) => {
    setSettings((prev) => (prev ? { ...prev, scoreThreshold: value } : prev));
    if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setSetting("score_threshold", String(value));
      debounceTimerRef.current = null;
    }, 300);
  }, []);

  const updateNotificationsEnabled = useCallback((value: boolean) => {
    setSettings((prev) => (prev ? { ...prev, notificationsEnabled: value } : prev));
    setSetting("notifications_enabled", String(value));
  }, []);

  const updateNotificationCooldown = useCallback((value: number) => {
    setSettings((prev) => (prev ? { ...prev, notificationCooldownSec: value } : prev));
    setSetting("notification_cooldown_sec", String(value));
  }, []);

  const updateShowScreenshotInAlert = useCallback((value: boolean) => {
    setSettings((prev) => (prev ? { ...prev, showScreenshotInAlert: value } : prev));
    setSetting("show_screenshot_in_alert", String(value));
  }, []);

  const updateCalibrationData = useCallback((data: string) => {
    setSettings((prev) => (prev ? { ...prev, calibrationData: data } : prev));
    setSetting("calibration_data", data);
  }, []);

  return {
    settings,
    isLoading,
    updateSensitivity,
    updateScoreThreshold,
    updateNotificationsEnabled,
    updateNotificationCooldown,
    updateShowScreenshotInAlert,
    updateCalibrationData,
  };
}
