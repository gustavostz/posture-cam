import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Session } from "@/types";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreBadgeVariant(score: number) {
  if (score >= 75) return "default" as const;
  if (score >= 45) return "secondary" as const;
  return "destructive" as const;
}

interface SessionHistoryProps {
  sessions: Session[];
}

export function SessionHistory({ sessions }: SessionHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Session History</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No sessions recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Duration</th>
                  <th className="pb-2 font-medium">Avg Score</th>
                  <th className="pb-2 text-right font-medium">Good / Bad</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const total =
                    session.good_posture_seconds + session.bad_posture_seconds;
                  return (
                    <tr key={session.id} className="border-b last:border-0">
                      <td className="py-2.5">
                        {formatDate(session.start_time)}
                      </td>
                      <td className="py-2.5">
                        {total > 0 ? formatDuration(total) : "--"}
                      </td>
                      <td className="py-2.5">
                        <Badge
                          variant={scoreBadgeVariant(session.avg_score)}
                          className="tabular-nums"
                        >
                          {Math.round(session.avg_score)}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        <span className="text-emerald-600">
                          {formatDuration(session.good_posture_seconds)}
                        </span>
                        <span className="mx-1 text-muted-foreground">/</span>
                        <span className="text-red-500">
                          {formatDuration(session.bad_posture_seconds)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
