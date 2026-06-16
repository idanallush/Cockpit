import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpendAreaChart } from "@/components/charts/spend-area-chart";
import { aggregateDailySpend } from "@/lib/aggregate";
import { UsageTable } from "./usage-table";

type UsageRow = {
  date: string;
  provider: "openai" | "anthropic" | "google";
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  requests_count: number | null;
  cost_usd: number;
  project_id: string | null;
};

const ALLOWED_DAYS = [7, 30, 90] as const;
type Days = (typeof ALLOWED_DAYS)[number];

type SearchParams = Promise<{ days?: string }>;

function fmtUSD(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtInt(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("en-US");
}

export default async function UsagePage({ searchParams }: { searchParams: SearchParams }) {
  const { days: rawDays } = await searchParams;
  const days: Days = ALLOWED_DAYS.find((d) => d === Number(rawDays)) ?? 30;

  const supabase = await createClient();
  const since = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [{ data: records }, { data: projects }] = await Promise.all([
    supabase
      .from("usage_records")
      .select("date,provider,model,input_tokens,output_tokens,requests_count,cost_usd,project_id")
      .gte("date", since)
      .order("date", { ascending: false })
      .limit(1000),
    supabase.from("projects").select("id,name"),
  ]);

  const list = (records ?? []) as UsageRow[];
  const projectArr = (projects ?? []) as Array<{ id: string; name: string }>;
  const nameByIdObj: Record<string, string> = Object.fromEntries(
    projectArr.map((p) => [p.id, p.name])
  );

  const totalCost = list.reduce((sum, r) => sum + Number(r.cost_usd), 0);
  const totalIn = list.reduce((sum, r) => sum + Number(r.input_tokens ?? 0), 0);
  const totalOut = list.reduce((sum, r) => sum + Number(r.output_tokens ?? 0), 0);

  const daily = aggregateDailySpend(list, days);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usage</h1>
          <p className="text-sm text-muted-foreground">
            Daily cost and token usage by provider and model.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border p-1">
          {ALLOWED_DAYS.map((d) => (
            <Link
              key={d}
              href={`/dashboard/usage?days=${d}`}
              className={`px-3 py-1 text-sm rounded-md ${
                d === days
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Total cost" value={fmtUSD(totalCost)} />
        <Stat label="Input tokens" value={fmtInt(totalIn)} />
        <Stat label="Output tokens" value={fmtInt(totalOut)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spend — last {days} days</CardTitle>
        </CardHeader>
        <CardContent>
          <SpendAreaChart data={daily} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No usage records in this range. Try clicking <strong>Sync Now</strong> on the Overview page.
            </div>
          ) : (
            <UsageTable rows={list} projectNameById={nameByIdObj} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
