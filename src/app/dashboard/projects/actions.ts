"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const projectSchema = z.object({
  name: z.string().min(1, "Name required").max(120),
  description: z.string().max(500).optional().or(z.literal("")),
});

type ActionResult = { ok: true } | { ok: false; error: string };

function parseIdsField(value: FormDataEntryValue | null): string[] {
  if (!value) return [];
  return String(value)
    .split(/[,\s\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

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
    openai_project_ids: parseIdsField(formData.get("openai_project_ids")),
    anthropic_workspace_ids: parseIdsField(formData.get("anthropic_workspace_ids")),
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
      openai_project_ids: parseIdsField(formData.get("openai_project_ids")),
      anthropic_workspace_ids: parseIdsField(formData.get("anthropic_workspace_ids")),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  // Re-attribute existing usage_records to this project based on new mappings.
  // We use the admin client so we can scan raw_data across all the user's rows.
  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, openai_project_ids, anthropic_workspace_ids")
    .eq("id", id)
    .single();
  if (project) {
    const openaiIds: string[] = project.openai_project_ids ?? [];
    const anthropicIds: string[] = project.anthropic_workspace_ids ?? [];

    if (openaiIds.length > 0) {
      await admin
        .from("usage_records")
        .update({ project_id: id })
        .eq("user_id", user.id)
        .eq("provider", "openai")
        .in("raw_data->>openai_project_id", openaiIds);
    }
    if (anthropicIds.length > 0) {
      await admin
        .from("usage_records")
        .update({ project_id: id })
        .eq("user_id", user.id)
        .eq("provider", "anthropic")
        .in("raw_data->>workspace_id", anthropicIds);
    }
  }

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/usage");
  revalidatePath("/dashboard");
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
