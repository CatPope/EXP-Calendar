"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ShoppingBag,
  Crown,
  Sparkles,
  Users,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { Api, humanizeError } from "@/lib/api";
import { clearTokens, getStoredAccessToken } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import { loadSettings } from "@/lib/settings";
import HUD from "@/components/HUD";
import Spinner from "@/components/common/Spinner";

const NAV = [
  { href: "/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/titles", label: "Titles", icon: Crown },
  { href: "/persona", label: "Persona", icon: Sparkles },
  { href: "/showcase", label: "Showcase", icon: Users }
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const setUser = useAppStore((s) => s.setUser);
  const user = useAppStore((s) => s.user);
  const pushToast = useAppStore((s) => s.pushToast);
  const setSettings = useAppStore((s) => s.setSettings);

  const [booting, setBooting] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  // 저장된 테마/폰트 설정을 마운트 시 적용.
  useEffect(() => {
    setSettings(loadSettings());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      if (!getStoredAccessToken()) {
        router.replace("/login");
        return;
      }
      try {
        const me = await Api.me();
        setUser(me);
      } catch (e) {
        clearTokens();
        setUser(null);
        pushToast("error", humanizeError(e));
        router.replace("/login");
        return;
      } finally {
        setBooting(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onLogout() {
    try {
      await Api.logout();
    } catch {
      /* ignore */
    }
    clearTokens();
    setUser(null);
    router.replace("/login");
  }

  if (booting || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Spinner size={20} label="세션 로드 중..." />
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <HUD />

      <div className="flex-1 flex">
        {/* sidebar (md+) */}
        <aside className="hidden md:flex md:w-56 shrink-0 border-r border-border bg-surface/40 flex-col">
          <nav className="p-3 flex-1 space-y-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-accent/20 text-accent border border-accent/40"
                      : "text-text-2 hover:bg-surface-2 hover:text-text-1"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-border">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-2 hover:bg-danger/10 hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </aside>

        {/* mobile hamburger */}
        <div className="md:hidden fixed bottom-4 left-4 z-40">
          <button
            onClick={() => setNavOpen((v) => !v)}
            aria-label="메뉴"
            className="h-12 w-12 rounded-full bg-accent text-white shadow-lg flex items-center justify-center"
          >
            {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          {navOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-30"
              onClick={() => setNavOpen(false)}
            >
              <nav
                className="absolute bottom-20 left-4 right-4 bg-surface border border-border rounded-xl p-3 space-y-1"
                onClick={(e) => e.stopPropagation()}
              >
                {NAV.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setNavOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-1 hover:bg-surface-2"
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </Link>
                ))}
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-danger hover:bg-danger/10"
                >
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </button>
              </nav>
            </div>
          )}
        </div>

        <main className="flex-1 min-w-0 p-4 md:p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
