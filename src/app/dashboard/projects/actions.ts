"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const projectSchema = z.object({
  name: z.string().min(1, "Name required").max(120),
  description: z.string().max(500).optional().or(z.literal("")),
});

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createProject(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error } = await supabase.from("projects").insert({
    user_id: user.id,
    name: parsed.data.name,
    description: parsed.data.description || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/api-keys");
  return { ok: true };
}

export async function updateProject(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing id" };

  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error } = await supabase
    .from("projects")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/projects");
  return { ok: true };
}

export async function deleteProject(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing id" };

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/api-keys");
  return { ok: true };
}
