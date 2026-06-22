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
  date: string;
  label: string;
  openai: number;
  anthropic: number;
};

const YELLOW = "#FCD535";
const GREEN = "#0ecb81";
const HAIRLINE = "#2b3139";
const MUTED = "#707a8a";
const SURFACE = "#1e2329";

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
              <stop offset="0%" stopColor={GREEN} stopOpacity={0.45} />
              <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="anthropicFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={YELLOW} stopOpacity={0.55} />
              <stop offset="100%" stopColor={YELLOW} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={HAIRLINE} vertical={false} />
          <XAxis
            dataKey="label"
            stroke={MUTED}
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke={MUTED}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            width={48}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: `1px solid ${HAIRLINE}`,
              background: SURFACE,
              color: "#eaecef",
              fontSize: 12,
            }}
            cursor={{ stroke: YELLOW, strokeOpacity: 0.3 }}
            formatter={(value: number, name: string) => [fmtUSD(value), name]}
            labelFormatter={(label) => label}
          />
          <Area
            type="monotone"
            dataKey="openai"
            stackId="1"
            stroke={GREEN}
            strokeWidth={1.5}
            fill="url(#openaiFill)"
            name="OpenAI"
          />
          <Area
            type="monotone"
            dataKey="anthropic"
            stackId="1"
            stroke={YELLOW}
            strokeWidth={1.5}
            fill="url(#anthropicFill)"
            name="Anthropic"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
