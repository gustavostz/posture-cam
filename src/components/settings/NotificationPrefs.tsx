import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULTS } from "@/lib/constants";

interface NotificationPrefsProps {
  enabled: boolean;
  cooldown: number;
  showScreenshot: boolean;
  onEnabledChange: (value: boolean) => void;
  onCooldownChange: (value: number) => void;
  onShowScreenshotChange: (value: boolean) => void;
}

export function NotificationPrefs({
  enabled,
  cooldown,
  showScreenshot,
  onEnabledChange,
  onCooldownChange,
  onShowScreenshotChange,
}: NotificationPrefsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <Label htmlFor="notif-toggle">Enable notifications</Label>
          <Switch
            id="notif-toggle"
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="screenshot-toggle">Show photo in alert</Label>
            <p className="text-xs text-muted-foreground">
              Capture a snapshot of your posture when the alert fires
            </p>
          </div>
          <Switch
            id="screenshot-toggle"
            checked={showScreenshot}
            onCheckedChange={onShowScreenshotChange}
            disabled={!enabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cooldown-input">
            Minimum gap between alerts (seconds)
          </Label>
          <input
            id="cooldown-input"
            type="number"
            min={5}
            max={300}
            value={cooldown}
            onChange={(e) => onCooldownChange(Number(e.target.value))}
            disabled={!enabled}
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground">
            Alert fires after {DEFAULTS.BAD_POSTURE_ALERT_DELAY_SEC}s of sustained bad posture.
            Cooldown prevents repeat alerts. Default: {DEFAULTS.NOTIFICATION_COOLDOWN_SEC}s
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
