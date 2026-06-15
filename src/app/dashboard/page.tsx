import { format, startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncButton } from "./sync-button";
import { SpendAreaChart } from "@/components/charts/spend-area-chart";
import { ProjectBarChart } from "@/components/charts/project-bar-chart";
import { aggregateDailySpend, aggregateByProject } from "@/lib/aggregate";

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
          <p className="text-sm text-muted-foreground">
            {lastSync
              ? `Last synced: ${format(new Date(lastSync), "MMM d, yyyy HH:mm")}`
              : "Never synced"}
          </p>
        </div>
        <SyncButton />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today" value={fmtUSD(todayTotal)} />
        <StatCard label="This month" value={fmtUSD(monthTotal)} />
        <StatCard label="OpenAI (mo)" value={fmtUSD(openaiMonth)} />
        <StatCard label="Anthropic (mo)" value={fmtUSD(anthropicMonth)} />
      </div>

      {empty ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No data yet. Click <strong>Sync Now</strong> to pull the latest costs from your providers.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily spend — last 30 days</CardTitle>
            </CardHeader>
            <CardContent>
              <SpendAreaChart data={daily} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Top projects by cost — this month
              </CardTitle>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
