import { format, addHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthCheckButton } from "./health-check-button";

function Dot({ on }: { on: boolean }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ background: on ? "var(--trading-up)" : "var(--trading-down)" }}
    />
  );
}

/**
 * Schedule is "0 *\/6 * * *" — every 6 hours at minute 0 (00, 06, 12, 18 UTC).
 * Compute the next slot relative to now.
 */
function nextCronRunUTC(): Date {
  const now = new Date();
  const candidate = setMilliseconds(setSeconds(setMinutes(now, 0), 0), 0);
  const hour = candidate.getUTCHours();
  const nextHour = Math.ceil((hour + (now.getMinutes() > 0 || now.getSeconds() > 0 ? 1 : 0)) / 6) * 6;
  const delta = nextHour - hour;
  return addHours(candidate, delta || 6);
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const openaiSet = Boolean(process.env.OPENAI_ADMIN_KEY);
  const anthropicSet = Boolean(process.env.ANTHROPIC_ADMIN_KEY);
  const encryptionSet = Boolean(process.env.ENCRYPTION_KEY);
  const cronSet = Boolean(process.env.CRON_SECRET);

  const { data: lastCron } = await supabase
    .from("sync_runs")
    .select("created_at,status,records_processed,provider,error_message")
    .eq("trigger", "cron")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const next = nextCronRunUTC();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          Settings
        </h1>
        <p className="text-sm text-[color:var(--muted-tone)] mt-1">
          Account and server configuration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auto-sync (Vercel Cron)</CardTitle>
          <CardDescription>
            Runs every 6 hours when deployed on Vercel. Cron does not fire on localhost.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Last cron run: </span>
            {lastCron
              ? `${format(new Date(lastCron.created_at), "MMM d, yyyy HH:mm")} · ${lastCron.provider} · ${lastCron.status}${lastCron.records_processed ? ` (${lastCron.records_processed} rows)` : ""}`
              : "Never run automatically"}
          </div>
          <div>
            <span className="text-muted-foreground">Next scheduled run: </span>
            {format(next, "MMM d, yyyy HH:mm")} UTC
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Server config</CardTitle>
          <CardDescription>
            Admin keys are read from env vars on the server. Restart the dev
            server (or redeploy) after changing them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="OPENAI_ADMIN_KEY" on={openaiSet} />
          <Row label="ANTHROPIC_ADMIN_KEY" on={anthropicSet} />
          <Row label="ENCRYPTION_KEY" on={encryptionSet} />
          <Row label="CRON_SECRET" on={cronSet} />
          <div className="pt-3">
            <HealthCheckButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Dot on={on} />
      <span className="flex-1 font-mono text-xs">{label}</span>
      <span className="text-muted-foreground">{on ? "configured" : "missing"}</span>
    </div>
  );
}
