import { createAdminClient } from "@/lib/supabase/admin";

export type HealthResult = {
  provider: "openai" | "anthropic";
  ok: boolean;
  latency_ms: number;
  status_code: number | null;
  error?: string;
};

async function timed(url: string, init: RequestInit): Promise<{
  status: number;
  ok: boolean;
  latency: number;
  error?: string;
}> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, init);
    const latency = Date.now() - t0;
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      return { status: res.status, ok: false, latency, error: body };
    }
    return { status: res.status, ok: true, latency };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      latency: Date.now() - t0,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Pings cheap admin endpoints for each provider whose env-level admin key is
 * set, writes results into `health_checks` (under a synthetic api_key_id
 * derived from the admin row in `api_keys` if one exists, otherwise skipped)
 * and emits an `alerts` row on failure.
 */
export async function runHealthChecks(userId: string): Promise<HealthResult[]> {
  const supabase = createAdminClient();
  const results: HealthResult[] = [];

  // Find the user's admin key rows (one per provider, if any) so we have an
  // api_keys.id to anchor the health_checks row to (FK).
  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, provider")
    .eq("user_id", userId)
    .eq("is_admin_key", true);

  const adminRowByProvider = new Map<string, string>();
  for (const k of keys ?? []) {
    if (!adminRowByProvider.has(k.provider)) adminRowByProvider.set(k.provider, k.id);
  }

  // --- OpenAI ---
  if (process.env.OPENAI_ADMIN_KEY) {
    const r = await timed("https://api.openai.com/v1/organization/admin_api_keys?limit=1", {
      headers: { Authorization: `Bearer ${process.env.OPENAI_ADMIN_KEY}` },
      cache: "no-store",
    });
    results.push({
      provider: "openai",
      ok: r.ok,
      latency_ms: r.latency,
      status_code: r.status,
      error: r.error,
    });
    await persist(supabase, {
      userId,
      apiKeyId: adminRowByProvider.get("openai"),
      result: r,
      provider: "openai",
    });
  }

  // --- Anthropic ---
  if (process.env.ANTHROPIC_ADMIN_KEY) {
    const r = await timed("https://api.anthropic.com/v1/organizations/api_keys?limit=1", {
      headers: {
        "x-api-key": process.env.ANTHROPIC_ADMIN_KEY,
        "anthropic-version": "2023-06-01",
      },
      cache: "no-store",
    });
    results.push({
      provider: "anthropic",
      ok: r.ok,
      latency_ms: r.latency,
      status_code: r.status,
      error: r.error,
    });
    await persist(supabase, {
      userId,
      apiKeyId: adminRowByProvider.get("anthropic"),
      result: r,
      provider: "anthropic",
    });
  }

  return results;
}

async function persist(
  supabase: ReturnType<typeof createAdminClient>,
  args: {
    userId: string;
    apiKeyId: string | undefined;
    provider: "openai" | "anthropic";
    result: { status: number; ok: boolean; latency: number; error?: string };
  }
) {
  const { userId, apiKeyId, provider, result } = args;
  const status = result.ok ? "ok" : "error";

  if (apiKeyId) {
    await supabase.from("health_checks").insert({
      api_key_id: apiKeyId,
      status,
      latency_ms: result.latency,
      error_message: result.error ?? null,
    });
    await supabase
      .from("api_keys")
      .update({
        last_health_check_at: new Date().toISOString(),
        last_health_status: status,
      })
      .eq("id", apiKeyId);
  }

  if (!result.ok) {
    await supabase.from("alerts").insert({
      user_id: userId,
      type: "api_error",
      severity: "critical",
      message: `${provider} admin key check failed (HTTP ${result.status}): ${result.error?.slice(0, 200) ?? "unknown"}`,
      metadata: { provider, status_code: result.status, latency_ms: result.latency },
    });
  }
}
