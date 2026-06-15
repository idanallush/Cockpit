"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";

const addSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google"]),
  name: z.string().min(1, "Name required").max(120),
  project_id: z.string().uuid().nullable(),
  is_admin_key: z.boolean(),
  key_value: z.string().min(8, "Key looks too short"),
});

type ActionResult = { ok: true } | { ok: false; error: string };

export async function addApiKey(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const rawProjectId = String(formData.get("project_id") ?? "");
  const isAdmin = formData.get("is_admin_key") === "on" || formData.get("is_admin_key") === "true";

  const parsed = addSchema.safeParse({
    provider: formData.get("provider"),
    name: formData.get("name"),
    project_id: isAdmin ? null : rawProjectId || null,
    is_admin_key: isAdmin,
    key_value: formData.get("key_value"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let encrypted: string;
  try {
    encrypted = encrypt(parsed.data.key_value);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Encryption failed" };
  }

  const { error } = await supabase.from("api_keys").insert({
    user_id: user.id,
    provider: parsed.data.provider,
    name: parsed.data.name,
    project_id: parsed.data.project_id,
    is_admin_key: parsed.data.is_admin_key,
    encrypted_key: encrypted,
    last_health_status: "unknown",
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/api-keys");
  return { ok: true };
}

export async function deleteApiKey(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing id" };

  const { error } = await supabase
    .from("api_keys")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/api-keys");
  return { ok: true };
}
