import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ScoreThresholdSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function ScoreThresholdSlider({ value, onChange }: ScoreThresholdSliderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Score Threshold</CardTitle>
        <CardDescription>
          Alert when your posture score drops below this value. Recommended: 90.
          Setting it higher is stricter.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Alert below</Label>
            <span className="text-lg font-bold tabular-nums">{value}</span>
          </div>
          <Slider
            min={50}
            max={100}
            step={5}
            value={[value]}
            onValueChange={(val) => {
              const arr = Array.isArray(val) ? val : [val];
              onChange(arr[0]);
            }}
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>50 (lenient)</span>
            <span>100 (very strict)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
