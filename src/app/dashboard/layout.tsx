import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { Bell } from "lucide-react";
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
    <div className="min-h-screen flex flex-col bg-canvas-dark text-[color:var(--body-on-dark)]">
      {/* top-nav-dark */}
      <header className="h-16 bg-canvas-dark border-b border-hairline-dark sticky top-0 z-30 backdrop-blur-sm/0">
        <div className="h-full max-w-[1440px] mx-auto px-4 md:px-6 flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 mr-2">
            <span
              className="text-xl font-bold tracking-tight text-yellow"
              style={{ letterSpacing: "-0.02em" }}
            >
              COCKPIT
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1">
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

          <div className="flex items-center gap-2 md:gap-3 ml-auto">
            <Link
              href="/dashboard/alerts"
              className={`relative inline-flex items-center justify-center h-9 w-9 rounded-md transition-colors hover:bg-surface-elevated-dark ${
                hasUnread ? "text-yellow" : "text-[color:var(--muted-tone)]"
              }`}
              aria-label="Alerts"
            >
              <Bell className="h-[18px] w-[18px]" />
              {hasUnread ? (
                <>
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[color:var(--trading-down)]" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full pulse-ring" />
                </>
              ) : null}
            </Link>

            <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-md">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                style={{ background: "var(--binance-yellow)", color: "var(--on-primary)" }}
              >
                {initial}
              </div>
              <span className="text-xs text-[color:var(--muted-tone)] max-w-[160px] truncate">
                {user.email}
              </span>
            </div>

            <form action={signOut}>
              <button
                type="submit"
                className="h-9 px-4 rounded-md text-sm font-semibold bg-surface-card-dark text-[color:var(--on-dark)] hover:bg-surface-elevated-dark transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-8 md:py-10">{children}</div>
      </main>

      {/* footer-light — Binance signature inversion */}
      <footer className="bg-surface-soft-light text-[color:var(--body-on-light)] border-t border-hairline-light">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 grid gap-8 md:grid-cols-3">
          <div>
            <div
              className="text-lg font-bold tracking-tight"
              style={{ color: "#181a20", letterSpacing: "-0.02em" }}
            >
              COCKPIT
            </div>
            <p className="text-sm mt-2 text-[color:var(--muted-tone)] max-w-xs">
              Central dashboard for API usage, cost, and health across OpenAI, Anthropic, and Google.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Surfaces</div>
            <ul className="space-y-2 text-sm text-[color:var(--muted-tone)]">
              <li><Link href="/dashboard" className="hover:text-[color:var(--ink)]">Overview</Link></li>
              <li><Link href="/dashboard/usage" className="hover:text-[color:var(--ink)]">Usage</Link></li>
              <li><Link href="/dashboard/projects" className="hover:text-[color:var(--ink)]">Projects</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Control</div>
            <ul className="space-y-2 text-sm text-[color:var(--muted-tone)]">
              <li><Link href="/dashboard/api-keys" className="hover:text-[color:var(--ink)]">API Keys</Link></li>
              <li><Link href="/dashboard/alerts" className="hover:text-[color:var(--ink)]">Alerts</Link></li>
              <li><Link href="/dashboard/settings" className="hover:text-[color:var(--ink)]">Settings</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-hairline-light">
          <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-5 text-xs text-[color:var(--muted-tone)] flex flex-wrap items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} Cockpit — Personal cost tracking</span>
            <span>Signed in as {user.email}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
