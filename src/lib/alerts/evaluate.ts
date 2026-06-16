import { startOfMonth } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";

type Threshold = {
  id: string;
  user_id: string;
  project_id: string | null;
  provider: string | null;
  period: "daily" | "monthly";
  amount_usd: number;
};

type UsageRow = {
  date: string;
  provider: string;
  project_id: string | null;
  cost_usd: number;
};

function totalFor(
  rows: UsageRow[],
  t: Threshold,
  windowStart: string,
  today: string
): number {
  const startDate = t.period === "daily" ? today : windowStart;
  return rows
    .filter((r) => r.date >= startDate)
    .filter((r) => (t.provider ? r.provider === t.provider : true))
    .filter((r) => (t.project_id ? r.project_id === t.project_id : true))
    .reduce((sum, r) => sum + Number(r.cost_usd), 0);
}

function severityFor(pct: number): "warning" | "critical" | null {
  if (pct >= 1.0) return "critical";
  if (pct >= 0.8) return "warning";
  return null;
}

/**
 * Re-evaluates every cost threshold for `userId` and writes new alert rows
 * for any breach. Same-day duplicates (same threshold_id, same severity) are
 * suppressed.
 */
export async function evaluateAlerts(userId: string): Promise<{
  evaluated: number;
  created: number;
}> {
  const supabase = createAdminClient();

  const { data: thresholds } = await supabase
    .from("cost_thresholds")
    .select("id,user_id,project_id,provider,period,amount_usd")
    .eq("user_id", userId);

  const list = (thresholds ?? []) as Threshold[];
  if (list.length === 0) return { evaluated: 0, created: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = startOfMonth(new Date()).toISOString().slice(0, 10);

  const { data: usage } = await supabase
    .from("usage_records")
    .select("date,provider,project_id,cost_usd")
    .eq("user_id", userId)
    .gte("date", monthStart < today ? monthStart : today);

  const rows = (usage ?? []) as UsageRow[];

  // Pre-load today's existing unread alerts by threshold_id to dedupe.
  const { data: existing } = await supabase
    .from("alerts")
    .select("metadata,severity,created_at")
    .eq("user_id", userId)
    .eq("type", "cost_threshold")
    .eq("is_read", false)
    .gte("created_at", today + "T00:00:00Z");

  const existingKey = new Set<string>();
  for (const a of existing ?? []) {
    const meta = (a as { metadata: { threshold_id?: string } | null }).metadata;
    if (meta?.threshold_id) {
      existingKey.add(
        `${meta.threshold_id}__${(a as { severity: string }).severity}`
      );
    }
  }

  let created = 0;
  for (const t of list) {
    const total = totalFor(rows, t, monthStart, today);
    const pct = total / Number(t.amount_usd);
    const sev = severityFor(pct);
    if (!sev) continue;

    const key = `${t.id}__${sev}`;
    if (existingKey.has(key)) continue;

    const scope = [
      t.provider ? t.provider : "All providers",
      t.project_id ? `project ${t.project_id.slice(0, 8)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const pctLabel = `${Math.round(pct * 100)}%`;
    const message =
      sev === "critical"
        ? `${t.period === "daily" ? "Daily" : "Monthly"} budget hit (${pctLabel} of $${t.amount_usd}) — ${scope}`
        : `${t.period === "daily" ? "Daily" : "Monthly"} budget at ${pctLabel} of $${t.amount_usd} — ${scope}`;

    const { error } = await supabase.from("alerts").insert({
      user_id: userId,
      project_id: t.project_id,
      type: "cost_threshold",
      severity: sev,
      message,
      metadata: {
        threshold_id: t.id,
        period: t.period,
        provider: t.provider,
        project_id: t.project_id,
        amount_usd: t.amount_usd,
        actual_usd: total,
        pct,
      },
    });
    if (!error) created += 1;
  }

  return { evaluated: list.length, created };
}
