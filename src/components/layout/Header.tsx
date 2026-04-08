import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PostureStatus } from "@/types";

interface HeaderProps {
  score?: number;
  scoreThreshold: number;
  sessionTime?: string;
  isMonitoring: boolean;
  isTracking: boolean;
}

function getStatus(score: number, threshold: number): PostureStatus {
  if (score >= threshold) return "good";
  if (score >= threshold - 15) return "fair";
  return "poor";
}

const statusStyles: Record<PostureStatus, string> = {
  good: "bg-emerald-500/15 text-emerald-700 border-emerald-500/25",
  fair: "bg-amber-500/15 text-amber-700 border-amber-500/25",
  poor: "bg-red-500/15 text-red-700 border-red-500/25",
};

const statusLabels: Record<PostureStatus, string> = {
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

export function Header({
  score,
  scoreThreshold,
  sessionTime = "00:00:00",
  isMonitoring,
  isTracking,
}: HeaderProps) {
  const showScore = isMonitoring && isTracking && score !== undefined;
  const status = showScore ? getStatus(score, scoreThreshold) : null;

  return (
    <header className="flex items-center justify-between border-b px-5 py-3">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "size-2 rounded-full",
            isMonitoring
              ? isTracking
                ? "bg-emerald-500"
                : "bg-amber-500 animate-pulse"
              : "bg-muted-foreground/40"
          )}
        />
        <h1 className="text-base font-semibold tracking-tight">
          Posture Monitor
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {isMonitoring && !isTracking ? (
          <Badge variant="outline" className="h-7 px-3 text-sm text-amber-600 border-amber-500/25 bg-amber-500/10">
            Not tracking
          </Badge>
        ) : showScore && status ? (
          <Badge
            variant="outline"
            className={cn(
              "h-7 px-3 text-sm font-semibold tabular-nums",
              statusStyles[status]
            )}
          >
            {Math.round(score)} - {statusLabels[status]}
          </Badge>
        ) : (
          <Badge variant="outline" className="h-7 px-3 text-sm text-muted-foreground">
            --
          </Badge>
        )}
      </div>

      <div className="text-sm tabular-nums text-muted-foreground">
        {isMonitoring ? sessionTime : ""}
      </div>
    </header>
  );
}
