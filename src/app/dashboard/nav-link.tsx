"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  KeyRound,
  Activity,
  Bell,
  Settings,
} from "lucide-react";

const icons = {
  LayoutDashboard,
  FolderKanban,
  KeyRound,
  Activity,
  Bell,
  Settings,
} as const;

export type NavIcon = keyof typeof icons;

export function NavLink({
  href,
  label,
  icon,
  badge,
}: {
  href: string;
  label: string;
  icon: NavIcon;
  badge?: number;
}) {
  const Icon = icons[icon];
  const pathname = usePathname();
  const isActive =
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-150 ${
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-primary" />
      )}
      <Icon
        className={`h-4 w-4 transition-transform duration-150 ${
          isActive ? "text-primary" : "group-hover:scale-110"
        }`}
      />
      <span className="flex-1">{label}</span>
      {badge && badge > 0 ? (
        <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-none text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
