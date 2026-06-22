import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Bell, Gauge } from "lucide-react";
import { NavLink, type NavIcon } from "./nav-link";

const nav: { href: string; label: string; icon: NavIcon }[] = [
  { href: "/dashboard", label: "Overview", icon: "LayoutDashboard" },
  { href: "/dashboard/projects", label: "Projects", icon: "FolderKanban" },
  { href: "/dashboard/api-keys", label: "API Keys", icon: "KeyRound" },
  { href: "/dashboard/usage", label: "Usage", icon: "Activity" },
  { href: "/dashboard/alerts", label: "Alerts", icon: "Bell" },
  { href: "/dashboard/settings", label: "Settings", icon: "Settings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count: unreadCount } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  const hasUnread = !!unreadCount && unreadCount > 0;
  const initial = (user.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r bg-sidebar/80 backdrop-blur-sm hidden md:flex md:flex-col">
        <div className="h-14 flex items-center gap-2 px-4 border-b">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/60 shadow-sm">
            <Gauge className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">Cockpit</span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {nav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              badge={item.href === "/dashboard/alerts" ? unreadCount ?? 0 : undefined}
            />
          ))}
        </nav>
        <div className="border-t p-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary/40 text-xs font-medium text-primary-foreground shadow-sm">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{user.email}</div>
            <div className="text-[10px] text-muted-foreground">Signed in</div>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-background/70 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
          <div className="text-sm text-muted-foreground md:hidden flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Cockpit
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Link
              href="/dashboard/alerts"
              className={`relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors ${
                hasUnread ? "text-foreground" : "text-muted-foreground"
              }`}
              aria-label="Alerts"
            >
              <Bell className={`h-4 w-4 ${hasUnread ? "fill-current/10" : ""}`} />
              {hasUnread ? (
                <>
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full pulse-ring" />
                </>
              ) : null}
            </Link>
            <form action={signOut}>
              <Button variant="outline" size="sm" type="submit" className="transition-all hover:border-primary/40 hover:text-primary">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
