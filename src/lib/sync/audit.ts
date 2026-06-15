import type { SupabaseClient } from "@supabase/supabase-js";
import type { SyncResult } from "./types";

export type SyncTrigger = "manual" | "cron";

export async function logSyncRun(
  supabase: SupabaseClient,
  args: {
    userId: string;
    provider: "openai" | "anthropic" | "anthropic_tokens";
    trigger: SyncTrigger;
    result: SyncResult;
    durationMs: number;
  }
) {
  const status: "success" | "partial" | "error" = args.result.success
    ? args.result.recordsProcessed === 0
      ? "partial"
      : "success"
    : "error";

  await supabase.from("sync_runs").insert({
    user_id: args.userId,
    provider: args.provider,
    trigger: args.trigger,
    status,
    records_processed: args.result.recordsProcessed,
    error_message: args.result.error ?? null,
    duration_ms: args.durationMs,
  });
}
