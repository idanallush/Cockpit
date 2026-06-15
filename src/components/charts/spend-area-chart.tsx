"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type DailyPoint = {
  date: string; // ISO date YYYY-MM-DD
  label: string; // formatted for axis (e.g. "Jun 10")
  openai: number;
  anthropic: number;
};

function fmtUSD(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function SpendAreaChart({ data }: { data: DailyPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="openaiFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="anthropicFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            width={48}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 6,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--background))",
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [fmtUSD(value), name]}
            labelFormatter={(label) => label}
          />
          <Area
            type="monotone"
            dataKey="openai"
            stackId="1"
            stroke="#10b981"
            fill="url(#openaiFill)"
            name="OpenAI"
          />
          <Area
            type="monotone"
            dataKey="anthropic"
            stackId="1"
            stroke="#f97316"
            fill="url(#anthropicFill)"
            name="Anthropic"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
