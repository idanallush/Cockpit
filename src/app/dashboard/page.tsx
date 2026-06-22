import { format, startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { SyncButton } from "./sync-button";
import { SpendAreaChart } from "@/components/charts/spend-area-chart";
import { ProjectBarChart } from "@/components/charts/project-bar-chart";
import { aggregateDailySpend, aggregateByProject } from "@/lib/aggregate";
import {
  Sparkles,
  Bot,
  TrendingUp,
  BarChart3,
  LayoutGrid,
  Clock,
} from "lucide-react";

type UsageRecord = {
  date: string;
  provider: "openai" | "anthropic" | "google";
  cost_usd: number;
  created_at: string;
  project_id: string | null;
};

function fmtUSD(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function OverviewPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = startOfMonth(new Date()).toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const since = thirtyDaysAgo < monthStart ? thirtyDaysAgo : monthStart;

  const [{ data: records }, { data: projects }] = await Promise.all([
    supabase
      .from("usage_records")
      .select("date,provider,cost_usd,created_at,project_id")
      .gte("date", since)
      .order("date", { ascending: false }),
    supabase.from("projects").select("id,name"),
  ]);

  const list = (records ?? []) as UsageRecord[];
  const projectList = (projects ?? []) as Array<{ id: string; name: string }>;

  const todayTotal = list
    .filter((r) => r.date === today)
    .reduce((sum, r) => sum + Number(r.cost_usd), 0);
  const monthRows = list.filter((r) => r.date >= monthStart);
  const monthTotal = monthRows.reduce((sum, r) => sum + Number(r.cost_usd), 0);
  const openaiMonth = monthRows
    .filter((r) => r.provider === "openai")
    .reduce((sum, r) => sum + Number(r.cost_usd), 0);
  const anthropicMonth = monthRows
    .filter((r) => r.provider === "anthropic")
    .reduce((sum, r) => sum + Number(r.cost_usd), 0);

  // crude day-over-day delta on month-to-date (just to show direction)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const yesterdayTotal = list
    .filter((r) => r.date === yesterday)
    .reduce((sum, r) => sum + Number(r.cost_usd), 0);
  const dayDelta = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0;

  const lastSync = list.length
    ? list.reduce((max, r) => (r.created_at > max ? r.created_at : max), list[0].created_at)
    : null;

  const empty = list.length === 0;

  const last30Rows = list.filter((r) => r.date >= thirtyDaysAgo);
  const daily = aggregateDailySpend(last30Rows, 30);
  const projectTotals = aggregateByProject(monthRows, projectList);

  return (
    <div className="space-y-10">
      {/* hero-band-dark */}
      <section className="grid lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-tone)] font-semibold mb-3">
            Month-to-date spend
          </div>
          <div
            className="num text-[64px] md:text-[80px] font-bold leading-[1.05] tracking-[-0.025em]"
            style={{ color: "var(--binance-yellow)" }}
          >
            {fmtUSD(monthTotal)}
          </div>
          <p className="mt-3 text-sm text-[color:var(--muted-tone)] flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            {lastSync
              ? `Last synced ${format(new Date(lastSync), "MMM d, HH:mm")}`
              : "Never synced — pull cost data from your providers."}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <SyncButton />
            <span className="text-xs text-[color:var(--muted-strong)]">
              since {format(new Date(monthStart), "MMM d")}
            </span>
          </div>
        </div>

        {/* markets-table-card style: provider breakdown */}
        <div className="bg-surface-card-dark rounded-xl border border-hairline-dark p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Providers — this month</div>
            <span className="text-xs text-[color:var(--muted-tone)]">USD</span>
          </div>
          <ProviderRow
            name="OpenAI"
            symbol="OAI"
            value={fmtUSD(openaiMonth)}
            share={monthTotal > 0 ? (openaiMonth / monthTotal) * 100 : 0}
          />
          <ProviderRow
            name="Anthropic"
            symbol="ANT"
            value={fmtUSD(anthropicMonth)}
            share={monthTotal > 0 ? (anthropicMonth / monthTotal) * 100 : 0}
          />
          <ProviderRow
            name="Google"
            symbol="GOG"
            value={fmtUSD(0)}
            share={0}
            dim
          />
        </div>
      </section>

      {/* trust-badge row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BadgeStat label="Today" value={fmtUSD(todayTotal)} delta={dayDelta} />
        <BadgeStat label="This Month" value={fmtUSD(monthTotal)} />
        <BadgeStat label="OpenAI · MTD" value={fmtUSD(openaiMonth)} icon={<Sparkles className="h-3.5 w-3.5" />} />
        <BadgeStat label="Anthropic · MTD" value={fmtUSD(anthropicMonth)} icon={<Bot className="h-3.5 w-3.5" />} />
      </section>

      {empty ? (
        <section className="bg-surface-card-dark rounded-xl border border-hairline-dark py-16 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "rgba(252, 213, 53, 0.12)" }}
          >
            <TrendingUp className="h-6 w-6 text-yellow" />
          </div>
          <p className="text-sm text-[color:var(--muted-tone)] max-w-md mx-auto">
            No data yet. Hit{" "}
            <strong className="text-yellow">Sync Now</strong> to pull the latest costs from your providers.
          </p>
        </section>
      ) : (
        <>
          <section className="bg-surface-card-dark rounded-xl border border-hairline-dark p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-yellow" />
                <h2 className="text-base font-semibold">Daily spend</h2>
              </div>
              <span className="text-xs text-[color:var(--muted-tone)]">last 30 days</span>
            </div>
            <SpendAreaChart data={daily} />
          </section>

          <section className="bg-surface-card-dark rounded-xl border border-hairline-dark p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-yellow" />
                <h2 className="text-base font-semibold">Top projects by cost</h2>
              </div>
              <span className="text-xs text-[color:var(--muted-tone)]">this month</span>
            </div>
            {projectTotals.length === 0 ? (
              <p className="py-8 text-center text-sm text-[color:var(--muted-tone)]">
                No project data yet.
              </p>
            ) : (
              <ProjectBarChart data={projectTotals} />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ProviderRow({
  name,
  symbol,
  value,
  share,
  dim,
}: {
  name: string;
  symbol: string;
  value: string;
  share: number;
  dim?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-3 border-b border-hairline-dark last:border-0 ${
        dim ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ background: "var(--surface-elevated-dark)", color: "var(--binance-yellow)" }}
        >
          {symbol}
        </div>
        <div>
          <div className="text-sm font-medium">{name}</div>
          <div className="text-[11px] text-[color:var(--muted-tone)] num">
            {share.toFixed(1)}% of MTD
          </div>
        </div>
      </div>
      <div className="num text-base font-semibold">{value}</div>
    </div>
  );
}

function BadgeStat({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: string;
  delta?: number;
  icon?: React.ReactNode;
}) {
  const showDelta = typeof delta === "number" && delta !== 0;
  const up = (delta ?? 0) >= 0;
  return (
    <div className="bg-surface-card-dark rounded-lg border border-hairline-dark px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--muted-tone)] font-semibold flex items-center gap-1.5">
          {icon}
          {label}
        </div>
      </div>
      <div className="num text-2xl font-bold tracking-tight">{value}</div>
      {showDelta ? (
        <div
          className={`num mt-1 text-xs font-medium ${up ? "text-trading-up" : "text-trading-down"}`}
        >
          {up ? "▲" : "▼"} {Math.abs(delta!).toFixed(1)}% vs yesterday
        </div>
      ) : (
        <div className="mt-1 text-xs text-[color:var(--muted-strong)]">—</div>
      )}
    </div>
  );
}
