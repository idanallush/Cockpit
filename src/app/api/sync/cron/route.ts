import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncOneUser, type UserSyncSummary } from "@/lib/sync/run-all";
import { runHealthChecks } from "@/lib/health/check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron entry point — scheduled by `vercel.json`. Vercel sends a GET
 * with `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Set CRON_SECRET in env." },
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: ud, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });
  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const summaries: UserSyncSummary[] = [];
  const failures: Array<{ user_id: string; error: string }> = [];

  for (const user of ud?.users ?? []) {
    try {
      const summary = await syncOneUser(user.id, "cron", 30);
      summaries.push(summary);
      await runHealthChecks(user.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[cron] user ${user.id} failed:`, msg);
      failures.push({ user_id: user.id, error: msg });
    }
  }

  return NextResponse.json({
    ok: true,
    users_processed: summaries.length,
    failures,
    summaries,
  });
}
