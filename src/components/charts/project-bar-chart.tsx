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
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval={0}
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
            formatter={(value: number) => [fmtUSD(value), "Cost"]}
          />
          <Bar dataKey="cost" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
