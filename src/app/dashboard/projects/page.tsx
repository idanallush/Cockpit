import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewProjectDialog } from "./new-project-dialog";
import { ProjectRowActions } from "./project-row-actions";

type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  openai_project_ids: string[] | null;
  anthropic_workspace_ids: string[] | null;
};

type UsageHint = { raw_data: Record<string, unknown> | null; provider: string };

export default async function ProjectsPage() {
  const supabase = await createClient();
  const [{ data: projects }, { data: usage }] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,description,created_at,openai_project_ids,anthropic_workspace_ids")
      .order("created_at", { ascending: false }),
    supabase
      .from("usage_records")
      .select("raw_data,provider")
      .limit(1000),
  ]);

  const list = (projects ?? []) as Project[];

  // Distinct provider IDs found in the user's data — surface as suggestions.
  const openaiIds = new Set<string>();
  const anthropicIds = new Set<string>();
  for (const r of (usage ?? []) as UsageHint[]) {
    const raw = r.raw_data ?? {};
    if (r.provider === "openai") {
      const id = raw["openai_project_id"];
      if (typeof id === "string" && id) openaiIds.add(id);
    } else if (r.provider === "anthropic") {
      const id = raw["workspace_id"];
      if (typeof id === "string" && id) anthropicIds.add(id);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Group API keys and attribute provider usage to internal projects.
          </p>
        </div>
        <NewProjectDialog
          openaiSuggestions={[...openaiIds]}
          anthropicSuggestions={[...anthropicIds]}
        />
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No projects yet. Add your first one to start tracking costs.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{p.name}</div>
                    {p.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {p.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(p.openai_project_ids ?? []).map((id) => (
                        <Badge key={`oa-${id}`} variant="outline" className="text-[10px] font-mono">
                          oa:{id.slice(-6)}
                        </Badge>
                      ))}
                      {(p.anthropic_workspace_ids ?? []).map((id) => (
                        <Badge key={`an-${id}`} variant="outline" className="text-[10px] font-mono">
                          an:{id.slice(-6)}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Created {format(new Date(p.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <ProjectRowActions
                    id={p.id}
                    name={p.name}
                    description={p.description ?? ""}
                    openaiIds={p.openai_project_ids ?? []}
                    anthropicIds={p.anthropic_workspace_ids ?? []}
                    openaiSuggestions={[...openaiIds]}
                    anthropicSuggestions={[...anthropicIds]}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
