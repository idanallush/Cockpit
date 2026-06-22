import { format, startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncButton } from "./sync-button";
import { SpendAreaChart } from "@/components/charts/spend-area-chart";
import { ProjectBarChart } from "@/components/charts/project-bar-chart";
import { aggregateDailySpend, aggregateByProject } from "@/lib/aggregate";
import {
  CalendarClock,
  CalendarRange,
  Sparkles,
  Bot,
  TrendingUp,
  BarChart3,
  LayoutGrid,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

  const lastSync = list.length
    ? list.reduce((max, r) => (r.created_at > max ? r.created_at : max), list[0].created_at)
    : null;

  const empty = list.length === 0;

  const last30Rows = list.filter((r) => r.date >= thirtyDaysAgo);
  const daily = aggregateDailySpend(last30Rows, 30);
  const projectTotals = aggregateByProject(monthRows, projectList);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Clock className="h-3.5 w-3.5" />
            {lastSync
              ? `Last synced ${format(new Date(lastSync), "MMM d, HH:mm")}`
              : "Never synced"}
          </p>
        </div>
        <SyncButton />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today"
          value={fmtUSD(todayTotal)}
          icon={CalendarClock}
          accent="primary"
          hint="across all providers"
        />
        <StatCard
          label="This month"
          value={fmtUSD(monthTotal)}
          icon={CalendarRange}
          accent="primary"
          hint={`since ${format(new Date(monthStart), "MMM d")}`}
        />
        <StatCard
          label="OpenAI"
          value={fmtUSD(openaiMonth)}
          icon={Sparkles}
          accent="openai"
          hint="this month"
        />
        <StatCard
          label="Anthropic"
          value={fmtUSD(anthropicMonth)}
          icon={Bot}
          accent="anthropic"
          hint="this month"
        />
      </div>

      {empty ? (
        <Card className="card-lift">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              No data yet. Click <strong className="text-foreground">Sync Now</strong> to pull the latest costs from your providers.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="card-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Daily spend</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">last 30 days</span>
            </CardHeader>
            <CardContent>
              <SpendAreaChart data={daily} />
            </CardContent>
          </Card>

          <Card className="card-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Top projects by cost</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">this month</span>
            </CardHeader>
            <CardContent>
              {projectTotals.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No project data yet.
                </p>
              ) : (
                <ProjectBarChart data={projectTotals} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

const accentStyles: Record<
  string,
  { iconBg: string; iconColor: string; ring: string }
> = {
  primary: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    ring: "before:bg-primary",
  },
  openai: {
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
    ring: "before:bg-emerald-500",
  },
  anthropic: {
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-600",
    ring: "before:bg-orange-500",
  },
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: "primary" | "openai" | "anthropic";
  hint?: string;
}) {
  const style = accentStyles[accent];
  return (
    <Card
      className={`card-lift relative overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-0.5 ${style.ring}`}
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-md ${style.iconBg}`}
        >
          <Icon className={`h-3.5 w-3.5 ${style.iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </div>
        {hint && (
          <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>
        )}
      </CardContent>
    </Card>
  );
}
