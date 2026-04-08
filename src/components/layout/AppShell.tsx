import { useState, useEffect, useCallback, useRef } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Header } from "@/components/layout/Header";
import { CameraView } from "@/components/camera/CameraView";
import { ScoreChart } from "@/components/statistics/ScoreChart";
import { PostureSummary } from "@/components/statistics/PostureSummary";
import { SessionHistory } from "@/components/statistics/SessionHistory";
import { ScoreThresholdSlider } from "@/components/settings/ScoreThresholdSlider";
import { SensitivitySelector } from "@/components/settings/SensitivitySelector";
import { NotificationPrefs } from "@/components/settings/NotificationPrefs";
import { CalibrationButton } from "@/components/settings/CalibrationButton";
import { useSettings } from "@/hooks/useSettings";
import { useSession } from "@/hooks/useSession";
import { useNotification } from "@/hooks/useNotification";
import { getSessions, getSnapshotsForSession } from "@/lib/db";
import { DEFAULTS } from "@/lib/constants";
import type { PostureAssessment, CalibrationProfile } from "@/lib/posture/types";
import type { TabId, Session, PostureScore } from "@/types";

function formatTimer(startTime: number | null): string {
  if (!startTime) return "00:00:00";
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("camera");
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentAssessment, setCurrentAssessment] =
    useState<PostureAssessment | null>(null);
  const [sessionTimer, setSessionTimer] = useState("00:00:00");
  const [isTracking, setIsTracking] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [chartData, setChartData] = useState<PostureScore[]>([]);

  const {
    settings,
    updateSensitivity,
    updateScoreThreshold,
    updateNotificationsEnabled,
    updateNotificationCooldown,
    updateShowScreenshotInAlert,
    updateCalibrationData,
  } = useSettings();

  const session = useSession(currentAssessment, isMonitoring);

  // Screenshot capture function - set by CameraView
  const screenshotFnRef = useRef<(() => string | null) | null>(null);
  const getScreenshot = useCallback(() => {
    return screenshotFnRef.current ? screenshotFnRef.current() : null;
  }, []);

  useNotification(
    currentAssessment?.score ?? null,
    settings,
    getScreenshot
  );

  // Track whether we're receiving assessments (not-tracking detection)
  const lastAssessmentTimeRef = useRef<number>(0);
  useEffect(() => {
    if (!isMonitoring) {
      setIsTracking(false);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastAssessmentTimeRef.current;
      setIsTracking(elapsed < DEFAULTS.NOT_TRACKING_TIMEOUT_MS);
    }, 500);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  useEffect(() => {
    if (!isMonitoring || !session.sessionStartTime) return;
    const interval = setInterval(() => {
      setSessionTimer(formatTimer(session.sessionStartTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [isMonitoring, session.sessionStartTime]);

  useEffect(() => {
    if (!isMonitoring) setSessionTimer("00:00:00");
  }, [isMonitoring]);

  useEffect(() => {
    if (activeTab !== "statistics") return;
    let cancelled = false;
    async function load() {
      try {
        const rows = await getSessions(20);
        if (!cancelled) setSessions(rows);
        if (rows.length > 0) {
          const snaps = await getSnapshotsForSession(rows[0].id);
          if (!cancelled) setChartData(snaps);
        }
      } catch (err) {
        console.error("Failed to load sessions:", err);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeTab, isMonitoring]);

  const handleToggleMonitoring = useCallback(() => {
    setIsMonitoring((prev) => !prev);
    if (isMonitoring) {
      setCurrentAssessment(null);
      setIsTracking(false);
    }
  }, [isMonitoring]);

  const handleAssessmentChange = useCallback(
    (assessment: PostureAssessment | null) => {
      setCurrentAssessment(assessment);
      if (assessment) {
        lastAssessmentTimeRef.current = Date.now();
      }
    },
    []
  );

  const handleCalibrationComplete = useCallback(
    (profile: CalibrationProfile) => {
      updateCalibrationData(JSON.stringify(profile));
    },
    [updateCalibrationData]
  );

  const scoreThreshold = settings?.scoreThreshold ?? DEFAULTS.SCORE_THRESHOLD;
  const score = currentAssessment?.score ?? undefined;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter((s) => s.start_time.startsWith(todayStr));
  const todayGoodSec =
    todaySessions.reduce((sum, s) => sum + s.good_posture_seconds, 0) +
    (isMonitoring ? session.goodSeconds : 0);
  const todayBadSec =
    todaySessions.reduce((sum, s) => sum + s.bad_posture_seconds, 0) +
    (isMonitoring ? session.badSeconds : 0);
  const todayTotalSec = todayGoodSec + todayBadSec;
  const todayGoodPct =
    todayTotalSec > 0 ? Math.round((todayGoodSec / todayTotalSec) * 100) : 0;
  const todayAvgScore =
    todaySessions.length > 0
      ? Math.round(todaySessions.reduce((sum, s) => sum + s.avg_score, 0) / todaySessions.length)
      : isMonitoring ? session.avgScore : 0;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header
        score={score}
        scoreThreshold={scoreThreshold}
        sessionTime={sessionTimer}
        isMonitoring={isMonitoring}
        isTracking={isTracking}
      />

      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as TabId)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="border-b px-5">
          <TabsList variant="line" className="h-9">
            <TabsTrigger value="camera">Camera</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {/* Camera view is ALWAYS mounted - hidden via CSS when other tabs are active */}
          <div
            className={`absolute inset-0 overflow-y-auto ${activeTab === "camera" ? "" : "invisible"}`}
          >
            <CameraView
              isMonitoring={isMonitoring}
              onToggleMonitoring={handleToggleMonitoring}
              sensitivity={settings?.sensitivity ?? DEFAULTS.SENSITIVITY}
              scoreThreshold={scoreThreshold}
              calibrationData={settings?.calibrationData ?? ""}
              onAssessmentChange={handleAssessmentChange}
              onCalibrationComplete={handleCalibrationComplete}
              screenshotFnRef={screenshotFnRef}
            />
          </div>

          <TabsContent value="statistics" className="h-full overflow-y-auto">
            <div className="space-y-4 p-4">
              <ScoreChart data={chartData} />
              <PostureSummary
                totalSeconds={todayTotalSec}
                avgScore={todayAvgScore}
                goodPercentage={todayGoodPct}
              />
              <SessionHistory sessions={sessions} />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="h-full overflow-y-auto">
            <div className="mx-auto max-w-lg space-y-4 p-4">
              <ScoreThresholdSlider
                value={settings?.scoreThreshold ?? DEFAULTS.SCORE_THRESHOLD}
                onChange={updateScoreThreshold}
              />
              <SensitivitySelector
                value={settings?.sensitivity ?? DEFAULTS.SENSITIVITY}
                onChange={updateSensitivity}
              />
              <NotificationPrefs
                enabled={settings?.notificationsEnabled ?? true}
                cooldown={settings?.notificationCooldownSec ?? 30}
                showScreenshot={settings?.showScreenshotInAlert ?? true}
                onEnabledChange={updateNotificationsEnabled}
                onCooldownChange={updateNotificationCooldown}
                onShowScreenshotChange={updateShowScreenshotInAlert}
              />
              <CalibrationButton
                calibrationData={settings?.calibrationData ?? ""}
                isMonitoring={isMonitoring}
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
