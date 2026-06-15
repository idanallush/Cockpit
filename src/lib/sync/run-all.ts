import { createAdminClient } from "@/lib/supabase/admin";
import { syncOpenAICosts } from "./openai";
import { syncAnthropicCosts } from "./anthropic";
import { syncAnthropicTokens } from "./anthropic-tokens";
import { logSyncRun, type SyncTrigger } from "./audit";
import type { SyncResult } from "./types";

export type UserSyncSummary = {
  user_id: string;
  openai: SyncResult;
  anthropic: SyncResult;
  anthropic_tokens: SyncResult;
};

/**
 * Runs every sync for one user, writes audit rows, returns the result triple.
 */
export async function syncOneUser(
  userId: string,
  trigger: SyncTrigger,
  daysBack: number = 30
): Promise<UserSyncSummary> {
  const supabase = createAdminClient();

  const t0 = Date.now();
  const openai = await syncOpenAICosts(userId, daysBack);
  await logSyncRun(supabase, {
    userId,
    provider: "openai",
    trigger,
    result: openai,
    durationMs: Date.now() - t0,
  });

  const t1 = Date.now();
  const anthropic = await syncAnthropicCosts(userId, daysBack);
  await logSyncRun(supabase, {
    userId,
    provider: "anthropic",
    trigger,
    result: anthropic,
    durationMs: Date.now() - t1,
  });

  const t2 = Date.now();
  const anthropic_tokens = await syncAnthropicTokens(userId, daysBack);
  await logSyncRun(supabase, {
    userId,
    provider: "anthropic_tokens",
    trigger,
    result: anthropic_tokens,
    durationMs: Date.now() - t2,
  });

  return { user_id: userId, openai, anthropic, anthropic_tokens };
}
