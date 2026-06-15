import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UsageRow = {
  date: string;
  provider: "openai" | "anthropic" | "google";
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  requests_count: number | null;
  cost_usd: number;
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
  const days: Days =
    ALLOWED_DAYS.find((d) => d === Number(rawDays)) ?? 30;

  const supabase = await createClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: records } = await supabase
    .from("usage_records")
    .select("date,provider,model,input_tokens,output_tokens,requests_count,cost_usd")
    .gte("date", since)
    .order("date", { ascending: false })
    .limit(500);

  const list = (records ?? []) as UsageRow[];

  const totalCost = list.reduce((sum, r) => sum + Number(r.cost_usd), 0);
  const totalIn = list.reduce((sum, r) => sum + Number(r.input_tokens ?? 0), 0);
  const totalOut = list.reduce((sum, r) => sum + Number(r.output_tokens ?? 0), 0);

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
          <CardTitle className="text-base">Records — last {days} days</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No usage records in this range. Try clicking <strong>Sync Now</strong> on the Overview page.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Input</TableHead>
                  <TableHead className="text-right">Output</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r, i) => (
                  <TableRow key={`${r.date}-${r.provider}-${r.model ?? "x"}-${i}`}>
                    <TableCell>{format(new Date(r.date), "MMM d")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {r.provider}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.model ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtInt(r.input_tokens)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtInt(r.output_tokens)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtInt(r.requests_count)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtUSD(Number(r.cost_usd))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
