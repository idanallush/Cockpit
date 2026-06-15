import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { NewProjectDialog } from "./new-project-dialog";
import { ProjectRowActions } from "./project-row-actions";

type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id,name,description,created_at")
    .order("created_at", { ascending: false });

  const list = (projects ?? []) as Project[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Group API keys and track costs per project.
          </p>
        </div>
        <NewProjectDialog />
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
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    {p.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {p.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Created {format(new Date(p.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <ProjectRowActions
                    id={p.id}
                    name={p.name}
                    description={p.description ?? ""}
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
