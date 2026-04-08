import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PostureScore } from "@/types";

interface ScoreChartProps {
  data: PostureScore[];
  scoreThreshold: number;
}

export function ScoreChart({ data, scoreThreshold }: ScoreChartProps) {
  const chartData = data.map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    score: Math.round(d.score),
  }));

  const isEmpty = chartData.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Posture Score Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            No data yet. Start a monitoring session to see your posture history.
          </div>
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <ReferenceLine
                  y={scoreThreshold}
                  stroke="hsl(0 84% 60%)"
                  strokeDasharray="6 4"
                  label={{
                    value: "Threshold",
                    position: "insideTopRight",
                    fontSize: 11,
                    fill: "hsl(0 84% 60%)",
                  }}
                />
                <defs>
                  <linearGradient
                    id="scoreGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(142 76% 36%)"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(142 76% 36%)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(142 76% 36%)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  fill="url(#scoreGradient)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
