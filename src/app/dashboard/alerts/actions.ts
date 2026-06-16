"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

const thresholdSchema = z.object({
  period: z.enum(["daily", "monthly"]),
  amount_usd: z.number().positive("Amount must be > 0"),
  provider: z.enum(["openai", "anthropic", "google"]).nullable(),
  project_id: z.string().uuid().nullable(),
});

export async function setThreshold(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const amount = parseFloat(String(formData.get("amount_usd") ?? "0"));
  const provider = (formData.get("provider") || null) as
    | "openai"
    | "anthropic"
    | "google"
    | null
    | "";
  const project = String(formData.get("project_id") ?? "") || null;

  const parsed = thresholdSchema.safeParse({
    period: formData.get("period"),
    amount_usd: amount,
    provider: provider === "" ? null : provider,
    project_id: project,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Upsert by (user_id, period, provider, project_id) — only one threshold per scope.
  const { data: existing } = await supabase
    .from("cost_thresholds")
    .select("id")
    .eq("user_id", user.id)
    .eq("period", parsed.data.period)
    .is("provider", parsed.data.provider as null)
    .is("project_id", parsed.data.project_id as null)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("cost_thresholds")
      .update({ amount_usd: parsed.data.amount_usd })
      .eq("id", existing.id)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("cost_thresholds").insert({
      user_id: user.id,
      period: parsed.data.period,
      amount_usd: parsed.data.amount_usd,
      provider: parsed.data.provider,
      project_id: parsed.data.project_id,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/alerts");
  return { ok: true };
}

export async function deleteThreshold(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing id" };

  const { error } = await supabase
    .from("cost_thresholds")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/alerts");
  return { ok: true };
}

export async function markAlertRead(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing id" };

  const { error } = await supabase
    .from("alerts")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/alerts");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function markAllAlertsRead(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("alerts")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/alerts");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
