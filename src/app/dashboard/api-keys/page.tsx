import { createClient } from "@/lib/supabase/server";
import { decrypt, maskKey } from "@/lib/crypto";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddApiKeyDialog } from "./add-api-key-dialog";
import { DeleteApiKeyButton } from "./delete-api-key-button";

type ApiKeyRow = {
  id: string;
  provider: "openai" | "anthropic" | "google";
  name: string;
  is_admin_key: boolean;
  encrypted_key: string;
  last_health_status: "ok" | "error" | "unknown" | null;
  last_health_check_at: string | null;
  project_id: string | null;
  projects: { name: string } | null;
};

type Project = { id: string; name: string };

const providerLabel: Record<ApiKeyRow["provider"], string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
};

function statusDot(status: ApiKeyRow["last_health_status"]) {
  const color =
    status === "ok"
      ? "var(--trading-up)"
      : status === "error"
        ? "var(--trading-down)"
        : "var(--muted-tone)";
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />;
}

export default async function ApiKeysPage() {
  const supabase = await createClient();
  const [{ data: keys }, { data: projectsData }] = await Promise.all([
    supabase
      .from("api_keys")
      .select(
        "id,provider,name,is_admin_key,encrypted_key,last_health_status,last_health_check_at,project_id,projects(name)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("id,name").order("name"),
  ]);

  const list = (keys ?? []) as unknown as ApiKeyRow[];
  const projects: Project[] = (projectsData ?? []) as Project[];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            API Keys
          </h1>
          <p className="text-sm text-[color:var(--muted-tone)] mt-1">
            Admin keys are read from env. Project-level keys are encrypted in the DB.
          </p>
        </div>
        <AddApiKeyDialog projects={projects} />
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No keys yet. Add one to track its health.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {list.map((k) => {
            let masked = "";
            try {
              masked = maskKey(decrypt(k.encrypted_key));
            } catch {
              masked = "(decrypt error)";
            }
            return (
              <Card key={k.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {statusDot(k.last_health_status)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{k.name}</span>
                        <Badge variant="outline">{providerLabel[k.provider]}</Badge>
                        {k.is_admin_key && <Badge>Admin</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                        <span className="font-mono">{masked}</span>
                        <span>
                          {k.projects?.name ?? (k.is_admin_key ? "Org level" : "No project")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <DeleteApiKeyButton id={k.id} name={k.name} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
