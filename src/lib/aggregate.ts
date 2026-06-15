import { format } from "date-fns";
import type { DailyPoint } from "@/components/charts/spend-area-chart";
import type { ProjectPoint } from "@/components/charts/project-bar-chart";

type Row = {
  date: string;
  provider: "openai" | "anthropic" | "google" | string;
  cost_usd: number | string;
};

/**
 * Builds a continuous daily series from a date range, filling missing days
 * with zeros. Returns provider-stacked cost data ready for the area chart.
 */
export function aggregateDailySpend(rows: Row[], days: number): DailyPoint[] {
  const map = new Map<string, DailyPoint>();
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, {
      date: key,
      label: format(d, "MMM d"),
      openai: 0,
      anthropic: 0,
    });
  }

  for (const r of rows) {
    const p = map.get(r.date);
    if (!p) continue;
    const cost = typeof r.cost_usd === "string" ? parseFloat(r.cost_usd) : r.cost_usd;
    if (r.provider === "openai") p.openai += cost;
    else if (r.provider === "anthropic") p.anthropic += cost;
  }

  return [...map.values()];
}

type ProjectCostRow = {
  project_id: string | null;
  cost_usd: number | string;
};

export function aggregateByProject(
  rows: ProjectCostRow[],
  projects: Array<{ id: string; name: string }>
): ProjectPoint[] {
  const nameById = new Map<string, string>();
  for (const p of projects) nameById.set(p.id, p.name);

  const totals = new Map<string, number>(); // name -> cost
  for (const r of rows) {
    const name = r.project_id ? (nameById.get(r.project_id) ?? "Unknown") : "Unassigned";
    const cost = typeof r.cost_usd === "string" ? parseFloat(r.cost_usd) : r.cost_usd;
    totals.set(name, (totals.get(name) ?? 0) + cost);
  }

  return [...totals.entries()]
    .map(([name, cost]) => ({ name, cost }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10);
}
