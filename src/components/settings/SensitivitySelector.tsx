import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const levels = [
  { value: 1, label: "Relaxed", desc: "Forgiving - only flags significant posture changes" },
  { value: 2, label: "Normal", desc: "Balanced - catches most posture issues" },
  { value: 3, label: "Strict", desc: "Sensitive - flags even small posture changes" },
] as const;

interface SensitivitySelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export function SensitivitySelector({ value, onChange }: SensitivitySelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detection Sensitivity</CardTitle>
        <CardDescription>
          How sensitive the posture detection is to deviations from your baseline.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {levels.map((level) => (
            <Button
              key={level.value}
              variant={value === level.value ? "default" : "outline"}
              size="sm"
              className={cn("h-auto flex-col gap-0.5 py-2")}
              onClick={() => onChange(level.value)}
            >
              <span className="text-xs font-semibold">{level.label}</span>
            </Button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {levels.find((l) => l.value === value)?.desc ?? levels[1].desc}
        </p>
      </CardContent>
    </Card>
  );
}
