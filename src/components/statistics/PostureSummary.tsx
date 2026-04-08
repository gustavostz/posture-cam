import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface PostureSummaryProps {
  totalSeconds: number;
  avgScore: number;
  goodPercentage: number;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

export function PostureSummary({
  totalSeconds,
  avgScore,
  goodPercentage,
}: PostureSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Monitoring Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {totalSeconds > 0 ? formatDuration(totalSeconds) : "--"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Today</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Average Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold tabular-nums">
            {avgScore > 0 ? avgScore : "--"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Out of 100</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Good Posture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold tabular-nums">
            {totalSeconds > 0 ? `${goodPercentage}%` : "--"}
          </p>
          <Progress value={goodPercentage} className="mt-2" />
          <p className="mt-1 text-xs text-muted-foreground">
            {totalSeconds > 0
              ? `${goodPercentage}% good / ${100 - goodPercentage}% bad`
              : "No data yet"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
