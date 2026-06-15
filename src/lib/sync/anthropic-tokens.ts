import { createAdminClient } from "@/lib/supabase/admin";
import { buildProjectMapper } from "./project-mapping";
import type { SyncResult } from "./types";

type UsageResult = {
  uncached_input_tokens?: number | null;
  cache_creation?: {
    ephemeral_1h_input_tokens?: number | null;
    ephemeral_5m_input_tokens?: number | null;
  } | null;
  cache_read_input_tokens?: number | null;
  output_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
  api_key_id?: string | null;
  workspace_id?: string | null;
  account_id?: string | null;
  service_account_id?: string | null;
  model?: string | null;
  service_tier?: string | null;
  context_window?: string | null;
  inference_geo?: string | null;
  request_count?: number | null;
};

type UsageBucket = {
  starting_at: string;
  ending_at: string;
  results: UsageResult[];
};

type UsageResponse = {
  data: UsageBucket[];
  has_more: boolean;
  next_page: string | null;
};

const USAGE_URL = "https://api.anthropic.com/v1/organizations/usage_report/messages";

/**
 * Pulls token-level usage from Anthropic's usage_report/messages endpoint and
 * upserts token columns into `usage_records` (without overwriting cost_usd
 * already populated by syncAnthropicCosts).
 */
export async function syncAnthropicTokens(
  userId: string,
  daysBack: number = 30
): Promise<SyncResult> {
  const adminKey = process.env.ANTHROPIC_ADMIN_KEY;
  if (!adminKey) {
    return { success: false, recordsProcessed: 0, error: "ANTHROPIC_ADMIN_KEY not set" };
  }

  const now = new Date();
  const ending = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const starting = new Date(ending.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const supabase = createAdminClient();
  const mapper = await buildProjectMapper(supabase, userId);

  let processed = 0;
  let nextPage: string | null = null;
  let safetyPages = 0;

  // Wipe the slice we're about to repopulate — see comment in anthropic.ts.
  await supabase
    .from("usage_records")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "anthropic")
    .eq("raw_data->>source", "usage_report")
    .gte("date", starting.toISOString().slice(0, 10));

  try {
    do {
      const url = new URL(USAGE_URL);
      url.searchParams.set("starting_at", starting.toISOString());
      url.searchParams.set("ending_at", ending.toISOString());
      url.searchParams.set("bucket_width", "1d");
      url.searchParams.append("group_by[]", "model");
      url.searchParams.append("group_by[]", "workspace_id");
      if (nextPage) url.searchParams.set("page", nextPage);

      const res = await fetch(url.toString(), {
        headers: {
          "x-api-key": adminKey,
          "anthropic-version": "2023-06-01",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.text();
        const msg = `Anthropic usage ${res.status}: ${body.slice(0, 300)}`;
        console.error("[sync:anthropic-tokens]", msg);
        return { success: false, recordsProcessed: processed, error: msg };
      }

      const page = (await res.json()) as UsageResponse;

      for (const bucket of page.data ?? []) {
        const dateStr = bucket.starting_at.slice(0, 10);

        for (const r of bucket.results ?? []) {
          const model = r.model ?? null;
          const projectId = mapper.anthropic(r.workspace_id);

          const inTok = Number(r.uncached_input_tokens ?? 0);
          const outTok = Number(r.output_tokens ?? 0);
          const cacheRead = Number(r.cache_read_input_tokens ?? 0);
          const cacheCreate1h =
            Number(r.cache_creation?.ephemeral_1h_input_tokens ?? 0);
          const cacheCreate5m =
            Number(r.cache_creation?.ephemeral_5m_input_tokens ?? 0);
          const cachedTotal = cacheRead + cacheCreate1h + cacheCreate5m;
          const requests = Number(r.request_count ?? 0);

          if (
            inTok === 0 &&
            outTok === 0 &&
            cachedTotal === 0 &&
            requests === 0
          ) {
            continue;
          }

          // The Cost API stores rows keyed by `description` (e.g. "Claude
          // Sonnet 4 Usage - Input Tokens") not by raw model id, so we don't
          // collide with cost rows. We insert a separate row keyed by model
          // (and overwrite token fields if the same model+date+project re-syncs).
          const { error } = await supabase
            .from("usage_records")
            .upsert(
              {
                user_id: userId,
                project_id: projectId,
                provider: "anthropic",
                model,
                date: dateStr,
                input_tokens: inTok,
                cached_input_tokens: cachedTotal,
                output_tokens: outTok,
                requests_count: requests,
                raw_data: {
                  source: "usage_report",
                  bucket_starting_at: bucket.starting_at,
                  bucket_ending_at: bucket.ending_at,
                  workspace_id: r.workspace_id,
                  service_tier: r.service_tier,
                  context_window: r.context_window,
                  inference_geo: r.inference_geo,
                  raw: r,
                } satisfies Record<string, unknown>,
              },
              {
                onConflict: "user_id,provider,model,date,project_id",
                ignoreDuplicates: false,
              }
            );

          if (error) {
            console.error("[sync:anthropic-tokens] upsert error", error.message);
            continue;
          }
          processed += 1;
        }
      }

      nextPage = page.has_more ? page.next_page : null;
      safetyPages += 1;
    } while (nextPage && safetyPages < 20);

    return { success: true, recordsProcessed: processed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[sync:anthropic-tokens]", msg);
    return { success: false, recordsProcessed: processed, error: msg };
  }
}
