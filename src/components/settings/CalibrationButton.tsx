import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { CalibrationProfile } from "@/lib/posture/types";

interface CalibrationButtonProps {
  calibrationData: string;
  isMonitoring: boolean;
}

export function CalibrationButton({
  calibrationData,
  isMonitoring,
}: CalibrationButtonProps) {
  let lastCalibration = "Never";
  if (calibrationData) {
    try {
      const profile = JSON.parse(calibrationData) as CalibrationProfile;
      lastCalibration = new Date(profile.capturedAt).toLocaleString();
    } catch {
      // ignore
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calibration</CardTitle>
        <CardDescription>
          Sit in your ideal posture and click Calibrate on the Camera tab. The
          app will use this as your baseline for scoring.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {isMonitoring
            ? "Use the Calibrate button on the Camera tab while monitoring."
            : "Start monitoring first, then calibrate from the Camera tab."}
        </p>
        <p className="text-xs text-muted-foreground">
          Last calibrated: {lastCalibration}
        </p>
      </CardContent>
    </Card>
  );
}
