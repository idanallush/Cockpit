import { createAdminClient } from "@/lib/supabase/admin";
import type { SyncResult } from "./types";

type OpenAICostResult = {
  object: "organization.costs.result";
  amount: { value: number | string; currency: string };
  line_item: string | null;
  project_id: string | null;
  project_name?: string | null;
  organization_id?: string | null;
};

type OpenAICostBucket = {
  object: "bucket";
  start_time: number;
  end_time: number;
  results: OpenAICostResult[];
};

type OpenAICostPage = {
  object: "page";
  data: OpenAICostBucket[];
  has_more: boolean;
  next_page: string | null;
};

const BASE_URL = "https://api.openai.com/v1/organization/costs";

/**
 * Pulls daily costs from OpenAI's organization costs endpoint and upserts
 * them into `usage_records` for the given user.
 *
 * Reads OPENAI_ADMIN_KEY from env. Admin keys look like `sk-admin-...`.
 */
export async function syncOpenAICosts(
  userId: string,
  daysBack: number = 30
): Promise<SyncResult> {
  const adminKey = process.env.OPENAI_ADMIN_KEY;
  if (!adminKey) {
    return { success: false, recordsProcessed: 0, error: "OPENAI_ADMIN_KEY not set" };
  }

  const now = Math.floor(Date.now() / 1000);
  const startTime = now - daysBack * 24 * 60 * 60;

  const supabase = createAdminClient();
  let processed = 0;
  let nextPage: string | null = null;
  let safetyPages = 0;

  try {
    do {
      const url = new URL(BASE_URL);
      url.searchParams.set("start_time", String(startTime));
      url.searchParams.set("bucket_width", "1d");
      url.searchParams.set("limit", String(Math.min(daysBack, 180)));
      url.searchParams.append("group_by", "line_item");
      url.searchParams.append("group_by", "project_id");
      if (nextPage) url.searchParams.set("page", nextPage);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${adminKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.text();
        const msg = `OpenAI costs ${res.status}: ${body.slice(0, 300)}`;
        console.error("[sync:openai]", msg);
        return { success: false, recordsProcessed: processed, error: msg };
      }

      const page = (await res.json()) as OpenAICostPage;

      for (const bucket of page.data ?? []) {
        const dateStr = new Date(bucket.start_time * 1000)
          .toISOString()
          .slice(0, 10);

        for (const result of bucket.results ?? []) {
          const model = result.line_item ?? null;
          const raw = result.amount?.value ?? 0;
          const cost = typeof raw === "string" ? parseFloat(raw) : raw;
          if (!Number.isFinite(cost)) continue;
          if (cost === 0 && !model) continue;

          const { error } = await supabase
            .from("usage_records")
            .upsert(
              {
                user_id: userId,
                project_id: null,
                provider: "openai",
                model,
                date: dateStr,
                cost_usd: cost,
                raw_data: {
                  openai_project_id: result.project_id,
                  bucket_start: bucket.start_time,
                  bucket_end: bucket.end_time,
                  amount: result.amount,
                  line_item: result.line_item,
                } satisfies Record<string, unknown>,
              },
              { onConflict: "user_id,provider,model,date,project_id" }
            );

          if (error) {
            console.error("[sync:openai] upsert error", error.message);
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
    console.error("[sync:openai]", msg);
    return { success: false, recordsProcessed: processed, error: msg };
  }
}
