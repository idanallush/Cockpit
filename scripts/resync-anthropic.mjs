// One-off: wipe Anthropic rows and re-sync via the real API + DB.
// Mirrors src/lib/sync/anthropic.ts exactly (including cents→dollars fix).
// Run: node --env-file=.env.local scripts/resync-anthropic.mjs

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: ud } = await sb.auth.admin.listUsers({ page: 1, perPage: 1 });
const user = ud?.users?.[0];
if (!user) {
  console.error("no user found");
  process.exit(1);
}
console.log("user:", user.email, user.id);

const { error: delErr } = await sb
  .from("usage_records")
  .delete()
  .eq("user_id", user.id)
  .eq("provider", "anthropic");
if (delErr) {
  console.error("delete error:", delErr);
  process.exit(1);
}
console.log("✓ deleted existing anthropic rows");

const adminKey = process.env.ANTHROPIC_ADMIN_KEY;
const now = new Date();
const ending = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const starting = new Date(ending.getTime() - 30 * 24 * 60 * 60 * 1000);

let nextPage = null;
let processed = 0;
do {
  const url = new URL("https://api.anthropic.com/v1/organizations/cost_report");
  url.searchParams.set("starting_at", starting.toISOString());
  url.searchParams.set("ending_at", ending.toISOString());
  url.searchParams.set("bucket_width", "1d");
  url.searchParams.append("group_by[]", "description");
  if (nextPage) url.searchParams.set("page", nextPage);

  const res = await fetch(url, {
    headers: { "x-api-key": adminKey, "anthropic-version": "2023-06-01" },
  });
  if (!res.ok) {
    console.error("Anthropic", res.status, await res.text());
    process.exit(1);
  }
  const page = await res.json();

  for (const bucket of page.data ?? []) {
    const dateStr = bucket.starting_at.slice(0, 10);
    const byKey = new Map();
    for (const r of bucket.results ?? []) {
      const key = r.description ?? r.model ?? null;
      const rawAmount = typeof r.amount === "string" ? parseFloat(r.amount) : r.amount ?? 0;
      if (!Number.isFinite(rawAmount)) continue;
      const amountUsd = rawAmount / 100; // cents → dollars (per Anthropic docs)
      const entry = byKey.get(key) ?? { cost: 0, entries: [] };
      entry.cost += amountUsd;
      entry.entries.push(r);
      byKey.set(key, entry);
    }
    for (const [key, { cost, entries }] of byKey.entries()) {
      const { error } = await sb.from("usage_records").upsert(
        {
          user_id: user.id,
          project_id: null,
          provider: "anthropic",
          model: key,
          date: dateStr,
          cost_usd: cost,
          raw_data: {
            bucket_starting_at: bucket.starting_at,
            bucket_ending_at: bucket.ending_at,
            entries,
          },
        },
        { onConflict: "user_id,provider,model,date,project_id" }
      );
      if (error) console.error("upsert error:", error.message);
      else processed += 1;
    }
  }

  nextPage = page.has_more ? page.next_page : null;
} while (nextPage);

console.log(`✓ synced ${processed} rows`);

const { data: rows } = await sb
  .from("usage_records")
  .select("cost_usd")
  .eq("user_id", user.id)
  .eq("provider", "anthropic");
let sum = 0;
for (const r of rows ?? []) sum += Number(r.cost_usd);
console.log(`\nAnthropic total (USD): $${sum.toFixed(4)}`);
console.log(`Rows: ${rows?.length ?? 0}`);
