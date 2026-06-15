import { createAdminClient } from "@/lib/supabase/admin";
import type { SyncResult } from "./types";

type AnthropicCostResult = {
  currency: string;
  amount: string | number;
  workspace_id?: string | null;
  description?: string | null;
  cost_type?: string | null;
  context_window?: string | null;
  service_tier?: string | null;
  token_type?: string | null;
  model?: string | null;
};

type AnthropicCostBucket = {
  starting_at: string;
  ending_at: string;
  results: AnthropicCostResult[];
};

type AnthropicCostResponse = {
  data: AnthropicCostBucket[];
  has_more: boolean;
  next_page: string | null;
};

const COST_URL = "https://api.anthropic.com/v1/organizations/cost_report";

/**
 * Pulls daily Anthropic costs from the org cost report and upserts them into
 * `usage_records`.
 *
 * Note: the real endpoint is `/v1/organizations/cost_report` (no `/messages`
 * suffix). Group-by is restricted to `description` and `workspace_id`; we use
 * `description` so each line item (e.g. "claude-sonnet-4 input tokens") lands
 * on its own row.
 *
 * Reads ANTHROPIC_ADMIN_KEY from env. Admin keys look like `sk-ant-admin01-...`.
 */
export async function syncAnthropicCosts(
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
  let processed = 0;
  let nextPage: string | null = null;
  let safetyPages = 0;

  try {
    do {
      const url = new URL(COST_URL);
      url.searchParams.set("starting_at", starting.toISOString());
      url.searchParams.set("ending_at", ending.toISOString());
      url.searchParams.set("bucket_width", "1d");
      url.searchParams.append("group_by[]", "description");
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
        const msg = `Anthropic costs ${res.status}: ${body.slice(0, 300)}`;
        console.error("[sync:anthropic]", msg);
        return { success: false, recordsProcessed: processed, error: msg };
      }

      const page = (await res.json()) as AnthropicCostResponse;

      for (const bucket of page.data ?? []) {
        const dateStr = bucket.starting_at.slice(0, 10);

        // Group by description (Anthropic's line item label, e.g. model name).
        // Per the Cost API docs: "All costs in USD, reported as decimal
        // strings in lowest units (cents)" — divide by 100 to get dollars.
        const byKey = new Map<
          string | null,
          { cost: number; entries: AnthropicCostResult[] }
        >();
        for (const r of bucket.results ?? []) {
          const key = r.description ?? r.model ?? null;
          const rawAmount =
            typeof r.amount === "string" ? parseFloat(r.amount) : (r.amount ?? 0);
          if (!Number.isFinite(rawAmount)) continue;
          const amountUsd = rawAmount / 100; // cents → dollars
          const entry = byKey.get(key) ?? { cost: 0, entries: [] };
          entry.cost += amountUsd;
          entry.entries.push(r);
          byKey.set(key, entry);
        }

        for (const [key, { cost, entries }] of byKey.entries()) {
          if (cost === 0 && entries.length === 0) continue;
          const { error } = await supabase
            .from("usage_records")
            .upsert(
              {
                user_id: userId,
                project_id: null,
                provider: "anthropic",
                model: key,
                date: dateStr,
                cost_usd: cost,
                raw_data: {
                  bucket_starting_at: bucket.starting_at,
                  bucket_ending_at: bucket.ending_at,
                  entries,
                } satisfies Record<string, unknown>,
              },
              { onConflict: "user_id,provider,model,date,project_id" }
            );

          if (error) {
            console.error("[sync:anthropic] upsert error", error.message);
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
    console.error("[sync:anthropic]", msg);
    return { success: false, recordsProcessed: processed, error: msg };
  }
}
