import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, Bell, CircleAlert, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThresholdForm } from "./threshold-form";
import { ThresholdRow } from "./threshold-row";
import { AlertActions, MarkAllReadButton } from "./alert-actions";

type Threshold = {
  id: string;
  period: "daily" | "monthly";
  amount_usd: number;
  provider: "openai" | "anthropic" | "google" | null;
  project_id: string | null;
};

type AlertRow = {
  id: string;
  type: "cost_threshold" | "api_error" | "quota_warning";
  severity: "info" | "warning" | "critical";
  message: string;
  is_read: boolean;
  created_at: string;
  project_id: string | null;
};

type SearchParams = Promise<{ filter?: string }>;

function sevIcon(s: AlertRow["severity"]) {
  if (s === "critical") return <CircleAlert className="h-4 w-4 text-trading-down" />;
  if (s === "warning") return <AlertTriangle className="h-4 w-4 text-yellow" />;
  return <Info className="h-4 w-4" style={{ color: "#3b82f6" }} />;
}

export default async function AlertsPage({ searchParams }: { searchParams: SearchParams }) {
  const { filter } = await searchParams;
  const unreadOnly = filter === "unread";

  const supabase = await createClient();
  const [{ data: thresholds }, { data: projects }, alertsRes] = await Promise.all([
    supabase
      .from("cost_thresholds")
      .select("id,period,amount_usd,provider,project_id")
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("id,name").order("name"),
    (async () => {
      let q = supabase
        .from("alerts")
        .select("id,type,severity,message,is_read,created_at,project_id")
        .order("created_at", { ascending: false })
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(100);
      if (unreadOnly) q = q.eq("is_read", false);
      return q;
    })(),
  ]);

  const ts = (thresholds ?? []) as Threshold[];
  const ps = (projects ?? []) as Array<{ id: string; name: string }>;
  const alerts = (alertsRes.data ?? []) as AlertRow[];
  const nameById = new Map(ps.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          Alerts
        </h1>
        <p className="text-sm text-[color:var(--muted-tone)] mt-1">
          Configure cost thresholds and review recent budget breaches or API errors.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add threshold</CardTitle>
          <CardDescription>
            Get a warning at 80% and a critical alert at 100% of budget.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThresholdForm projects={ps} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active thresholds</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No thresholds configured.
            </p>
          ) : (
            <ul className="divide-y">
              {ts.map((t) => (
                <li key={t.id} className="flex items-center gap-3 p-4">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-semibold tabular-nums">${Number(t.amount_usd).toFixed(2)}</span>{" "}
                      <Badge variant="outline" className="ml-1 capitalize">{t.period}</Badge>{" "}
                      {t.provider && (
                        <Badge variant="outline" className="ml-1 capitalize">{t.provider}</Badge>
                      )}
                      {t.project_id && (
                        <Badge variant="outline" className="ml-1">
                          {nameById.get(t.project_id) ?? "—"}
                        </Badge>
                      )}
                      {!t.provider && !t.project_id && (
                        <span className="ml-2 text-xs text-muted-foreground">All providers · All projects</span>
                      )}
                    </div>
                  </div>
                  <ThresholdRow id={t.id} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Recent alerts (last 30 days)</CardTitle>
            <CardDescription>
              {unreadOnly ? "Unread only" : "All alerts"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border p-1 text-sm">
              <Link
                href="/dashboard/alerts"
                className={`px-2.5 py-1 rounded ${!unreadOnly ? "bg-accent" : "text-muted-foreground"}`}
              >
                All
              </Link>
              <Link
                href="/dashboard/alerts?filter=unread"
                className={`px-2.5 py-1 rounded ${unreadOnly ? "bg-accent" : "text-muted-foreground"}`}
              >
                Unread
              </Link>
            </div>
            <MarkAllReadButton />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {alerts.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No alerts.
            </p>
          ) : (
            <ul className="divide-y">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  className={`flex items-start gap-3 p-4 ${a.is_read ? "opacity-60" : ""}`}
                >
                  {sevIcon(a.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{a.message}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">{a.type.replace("_", " ")}</Badge>
                      <span>{format(new Date(a.created_at), "MMM d, HH:mm")}</span>
                    </div>
                  </div>
                  {!a.is_read && <AlertActions id={a.id} />}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
