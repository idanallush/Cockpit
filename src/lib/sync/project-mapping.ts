import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Maps provider IDs (OpenAI project_id, Anthropic workspace_id) to internal
 * project rows. Returns a lookup function the syncers use to attribute each
 * usage record to a project at upsert time.
 */
export type ProjectMapper = {
  openai: (projectId: string | null | undefined) => string | null;
  anthropic: (workspaceId: string | null | undefined) => string | null;
};

export async function buildProjectMapper(
  supabase: SupabaseClient,
  userId: string
): Promise<ProjectMapper> {
  const { data: projects } = await supabase
    .from("projects")
    .select("id, openai_project_ids, anthropic_workspace_ids")
    .eq("user_id", userId);

  const openaiMap = new Map<string, string>();
  const anthropicMap = new Map<string, string>();

  for (const p of (projects ?? []) as Array<{
    id: string;
    openai_project_ids: string[] | null;
    anthropic_workspace_ids: string[] | null;
  }>) {
    for (const id of p.openai_project_ids ?? []) {
      openaiMap.set(id, p.id);
    }
    for (const id of p.anthropic_workspace_ids ?? []) {
      anthropicMap.set(id, p.id);
    }
  }

  return {
    openai: (projectId) => (projectId ? (openaiMap.get(projectId) ?? null) : null),
    anthropic: (workspaceId) =>
      workspaceId ? (anthropicMap.get(workspaceId) ?? null) : null,
  };
}
