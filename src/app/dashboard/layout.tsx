import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FolderKanban,
  KeyRound,
  Activity,
  Bell,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/dashboard/usage", label: "Usage", icon: Activity },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count: unreadCount } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="w-60 border-r bg-background hidden md:flex md:flex-col">
        <div className="h-14 flex items-center px-4 border-b font-semibold">
          Cockpit
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-background flex items-center justify-between px-4 md:px-6">
          <div className="text-sm text-muted-foreground md:hidden">Cockpit</div>
          <div className="flex items-center gap-3 ml-auto">
            <Link
              href="/dashboard/alerts"
              className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent"
              aria-label="Alerts"
            >
              <Bell className="h-4 w-4" />
              {unreadCount && unreadCount > 0 ? (
                <Badge
                  className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] leading-none rounded-full bg-red-500 text-white"
                  variant="default"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              ) : null}
            </Link>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user.email}
            </span>
            <form action={signOut}>
              <Button variant="outline" size="sm" type="submit">Sign out</Button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
