"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, ShoppingBag, Users, Sparkles, LogOut } from "lucide-react";
import { Api } from "@/lib/api";
import { clearTokens } from "@/lib/auth";
import { useAppStore } from "@/lib/store";

const ITEMS = [
  { href: "/calendar", label: "캘린더", icon: Calendar },
  { href: "/shop", label: "상점", icon: ShoppingBag },
  { href: "/showcase", label: "쇼케이스", icon: Users },
  { href: "/persona", label: "페르소나", icon: Sparkles }
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);

  async function handleLogout() {
    try {
      await Api.logout();
    } catch {}
    clearTokens();
    setUser(null);
    router.replace("/");
  }

  return (
    <nav className="bg-surface border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center gap-1 overflow-x-auto">
        {ITEMS.map((it) => {
          const active = pathname?.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${
                active
                  ? "bg-accent/20 text-accent border border-accent/40"
                  : "text-text-2 hover:bg-surface-2 hover:text-text-1"
              }`}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
        <div className="ml-auto">
          <button onClick={handleLogout} className="btn-ghost flex items-center gap-1">
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      </div>
    </nav>
  );
}
