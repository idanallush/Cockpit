"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ProjectPoint = {
  name: string;
  cost: number;
};

const YELLOW = "#FCD535";
const YELLOW_ACTIVE = "#f0b90b";
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

export function ProjectBarChart({ data }: { data: ProjectPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={YELLOW} stopOpacity={1} />
              <stop offset="100%" stopColor={YELLOW_ACTIVE} stopOpacity={0.85} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={HAIRLINE} vertical={false} />
          <XAxis
            dataKey="name"
            stroke={MUTED}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval={0}
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
            cursor={{ fill: "rgba(252, 213, 53, 0.08)" }}
            formatter={(value: number) => [fmtUSD(value), "Cost"]}
          />
          <Bar dataKey="cost" fill="url(#barFill)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
