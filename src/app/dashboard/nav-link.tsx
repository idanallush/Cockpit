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
      className={`relative inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm transition-colors ${
        isActive
          ? "text-yellow font-semibold"
          : "text-[color:var(--body-on-dark)] hover:text-yellow font-medium"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {badge && badge > 0 ? (
        <span
          className="ml-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none"
          style={{ background: "var(--trading-down)", color: "#fff" }}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
      {isActive ? (
        <span
          className="absolute left-3 right-3 -bottom-[17px] h-[2px] rounded-full"
          style={{ background: "var(--binance-yellow)" }}
        />
      ) : null}
    </Link>
  );
}
