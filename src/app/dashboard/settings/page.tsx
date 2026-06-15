import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function Dot({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${on ? "bg-green-500" : "bg-red-500"}`}
    />
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const openaiSet = Boolean(process.env.OPENAI_ADMIN_KEY);
  const anthropicSet = Boolean(process.env.ANTHROPIC_ADMIN_KEY);
  const encryptionSet = Boolean(process.env.ENCRYPTION_KEY);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Account and server configuration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Server config</CardTitle>
          <CardDescription>
            Admin keys are read from env vars on the server. Restart the dev
            server (or redeploy) after changing them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Dot on={openaiSet} />
            <span className="flex-1">OPENAI_ADMIN_KEY</span>
            <span className="text-muted-foreground">
              {openaiSet ? "configured" : "missing"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Dot on={anthropicSet} />
            <span className="flex-1">ANTHROPIC_ADMIN_KEY</span>
            <span className="text-muted-foreground">
              {anthropicSet ? "configured" : "missing"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Dot on={encryptionSet} />
            <span className="flex-1">ENCRYPTION_KEY</span>
            <span className="text-muted-foreground">
              {encryptionSet ? "configured" : "missing"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
