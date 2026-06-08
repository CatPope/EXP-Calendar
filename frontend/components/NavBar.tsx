"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, ShoppingBag, Users, Sparkles, LogOut } from "lucide-react";
import { Api } from "@/lib/api";
import { clearTokens } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

const ITEMS = [
  { href: "/calendar", labelKey: "common.navCalendar", icon: Calendar },
  { href: "/shop", labelKey: "common.navShop", icon: ShoppingBag },
  { href: "/showcase", labelKey: "common.navShowcase", icon: Users },
  { href: "/persona", labelKey: "common.navPersona", icon: Sparkles }
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
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
              {t(it.labelKey)}
            </Link>
          );
        })}
        <div className="ml-auto">
          <button onClick={handleLogout} className="btn-ghost flex items-center gap-1">
            <LogOut className="h-4 w-4" />
            {t("common.logout")}
          </button>
        </div>
      </div>
    </nav>
  );
}
