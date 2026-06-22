import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            Usage
          </h1>
          <p className="text-sm text-[color:var(--muted-tone)] mt-1">
            Daily cost and token usage by provider and model.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-md border border-hairline-dark bg-surface-card-dark p-1">
          {ALLOWED_DAYS.map((d) => (
            <Link
              key={d}
              href={`/dashboard/usage?days=${d}`}
              className={`px-4 py-1.5 text-sm rounded transition-colors ${
                d === days
                  ? "bg-[color:var(--binance-yellow)] text-[color:var(--on-primary)] font-semibold"
                  : "text-[color:var(--muted-tone)] hover:text-yellow"
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Total cost" value={fmtUSD(totalCost)} accent />
        <Stat label="Input tokens" value={fmtInt(totalIn)} />
        <Stat label="Output tokens" value={fmtInt(totalOut)} />
      </div>

      <section className="bg-surface-card-dark rounded-xl border border-hairline-dark p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Spend — last {days} days</h2>
          <span className="text-xs text-[color:var(--muted-tone)]">stacked by provider</span>
        </div>
        <SpendAreaChart data={daily} />
      </section>

      <section className="bg-surface-card-dark rounded-xl border border-hairline-dark overflow-hidden">
        <div className="px-6 py-4 border-b border-hairline-dark flex items-center justify-between">
          <h2 className="text-base font-semibold">Records</h2>
          <span className="text-xs text-[color:var(--muted-tone)]">
            {list.length.toLocaleString()} rows
          </span>
        </div>
        {list.length === 0 ? (
          <div className="py-12 text-center text-sm text-[color:var(--muted-tone)]">
            No usage records in this range. Try clicking{" "}
            <strong className="text-yellow">Sync Now</strong> on Overview.
          </div>
        ) : (
          <UsageTable rows={list} projectNameById={nameByIdObj} />
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-surface-card-dark border border-hairline-dark rounded-lg px-5 py-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--muted-tone)] font-semibold mb-2">
        {label}
      </div>
      <div
        className={`num text-2xl font-bold tracking-tight ${accent ? "text-yellow" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
