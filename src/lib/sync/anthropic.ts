import { createAdminClient } from "@/lib/supabase/admin";
import { buildProjectMapper } from "./project-mapping";
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
 * `usage_records`. Note: amounts come back in cents (per Anthropic docs:
 * "All costs in USD, reported as decimal strings in lowest units (cents)"),
 * so we divide by 100 before storing.
 *
 * The cost endpoint only supports group_by[]=description or workspace_id; we
 * use both so we can attribute each line to a workspace and an internal project.
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
  const mapper = await buildProjectMapper(supabase, userId);

  let processed = 0;
  let nextPage: string | null = null;
  let safetyPages = 0;

  // Wipe the slice we're about to repopulate. Keeps the sync idempotent even
  // when the underlying unique constraint treats NULL project_ids as distinct.
  // Includes legacy rows that pre-date the `source` tag (source IS NULL) so
  // the first run after deploy cleans up any accumulated duplicates.
  await supabase
    .from("usage_records")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "anthropic")
    .gte("date", starting.toISOString().slice(0, 10))
    .or("raw_data->>source.eq.cost_report,raw_data->>source.is.null");

  try {
    do {
      const url = new URL(COST_URL);
      url.searchParams.set("starting_at", starting.toISOString());
      url.searchParams.set("ending_at", ending.toISOString());
      url.searchParams.set("bucket_width", "1d");
      url.searchParams.append("group_by[]", "description");
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
        const msg = `Anthropic costs ${res.status}: ${body.slice(0, 300)}`;
        console.error("[sync:anthropic]", msg);
        return { success: false, recordsProcessed: processed, error: msg };
      }

      const page = (await res.json()) as AnthropicCostResponse;

      for (const bucket of page.data ?? []) {
        const dateStr = bucket.starting_at.slice(0, 10);

        // Key by (description, workspace) so each project bucket gets its own row.
        type Group = {
          cost: number;
          entries: AnthropicCostResult[];
          workspace_id: string | null;
          projectId: string | null;
        };
        const groups = new Map<string, Group>();

        for (const r of bucket.results ?? []) {
          const desc = r.description ?? r.model ?? null;
          const ws = r.workspace_id ?? null;
          const rawAmount =
            typeof r.amount === "string" ? parseFloat(r.amount) : (r.amount ?? 0);
          if (!Number.isFinite(rawAmount)) continue;
          const amountUsd = rawAmount / 100; // cents → dollars

          const projectId = mapper.anthropic(ws);
          const groupKey = `${desc ?? ""}__${projectId ?? ""}`;
          const entry = groups.get(groupKey) ?? {
            cost: 0,
            entries: [],
            workspace_id: ws,
            projectId,
          };
          entry.cost += amountUsd;
          entry.entries.push(r);
          groups.set(groupKey, entry);
        }

        for (const [groupKey, { cost, entries, workspace_id, projectId }] of groups.entries()) {
          if (cost === 0 && entries.length === 0) continue;
          const model = groupKey.split("__")[0] || null;
          const { error } = await supabase
            .from("usage_records")
            .upsert(
              {
                user_id: userId,
                project_id: projectId,
                provider: "anthropic",
                model,
                date: dateStr,
                cost_usd: cost,
                raw_data: {
                  source: "cost_report",
                  bucket_starting_at: bucket.starting_at,
                  bucket_ending_at: bucket.ending_at,
                  workspace_id,
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
