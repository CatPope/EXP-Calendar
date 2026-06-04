"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ShoppingBag,
  Sparkles,
  Users,
  LogOut,
  Settings,
  ListChecks,
  BarChart3,
  Gift,
  PanelLeftClose,
  PanelLeftOpen,
  X
} from "lucide-react";
import { Api, humanizeError } from "@/lib/api";
import { clearTokens, getStoredAccessToken } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import { loadSettings } from "@/lib/settings";
import { applyPalette, getStoredPalette } from "@/lib/palette";
import { useT } from "@/lib/i18n";
import HUD from "@/components/HUD";
import ProfileRail from "@/components/ProfileRail";
import SettingsModal from "@/components/SettingsModal";
import Spinner from "@/components/common/Spinner";

const NAV = [
  { href: "/calendar", labelKey: "navCalendar", icon: CalendarIcon },
  { href: "/quests", labelKey: "navQuests", icon: ListChecks },
  { href: "/shop", labelKey: "navShop", icon: ShoppingBag },
  { href: "/summon", labelKey: "navSummon", icon: Gift },
  { href: "/identity", labelKey: "navIdentity", icon: Sparkles },
  { href: "/stats", labelKey: "navStats", icon: BarChart3 },
  { href: "/showcase", labelKey: "navShowcase", icon: Users },
  { href: "/settings", labelKey: "settings", icon: Settings }
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const setUser = useAppStore((s) => s.setUser);
  const user = useAppStore((s) => s.user);
  const pushToast = useAppStore((s) => s.pushToast);
  const setSettings = useAppStore((s) => s.setSettings);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const settingsOpen = useAppStore((s) => s.settingsOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  const [booting, setBooting] = useState(true);

  // 저장된 테마/폰트 설정을 마운트 시 적용.
  useEffect(() => {
    setSettings(loadSettings());
    applyPalette(getStoredPalette());
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
        <Spinner size={20} label={t("core.sessionLoading")} />
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <HUD />

      {/* dim overlay — 모바일에서만 (데스크톱은 푸시 레이아웃이라 미사용) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* 좌측 가장자리 토글 버튼 — 사이드바 모서리를 따라 이동(열기/닫기) */}
      <button
        type="button"
        aria-label={sidebarOpen ? t("core.closeMenu") : t("common.openMenu")}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed top-20 z-[60] flex h-9 w-9 items-center justify-center rounded-r-lg border border-l-0 border-border bg-surface text-text-2 hover:text-text-1 hover:bg-surface-2 shadow-md transition-all duration-200 ${
          sidebarOpen ? "left-64" : "left-0"
        }`}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="h-5 w-5" />
        ) : (
          <PanelLeftOpen className="h-5 w-5" />
        )}
      </button>

      {/* 사이드바 (데모 nav 참고: 기본 열림 · 데스크톱 푸시 · 모바일 드로어) */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-surface border-r border-border flex flex-col transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <span className="font-bold text-accent">EXP Calendar</span>
          <button
            type="button"
            aria-label={t("core.closeMenu")}
            onClick={() => setSidebarOpen(false)}
            className="text-text-2 hover:text-text-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-3 flex-1 space-y-1 overflow-y-auto">
          {NAV.map(({ href, labelKey, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  // 데스크톱은 고정 사이드바라 유지, 모바일에서만 닫기.
                  if (typeof window !== "undefined" && window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                }}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-accent/20 text-accent border border-accent/40"
                    : "text-text-2 hover:bg-surface-2 hover:text-text-1"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(`core.${labelKey}`)}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-2 hover:bg-surface-2 hover:text-text-1"
          >
            <Settings className="h-4 w-4" />
            {t("core.settings")}
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-2 hover:bg-danger/10 hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
            {t("core.logout")}
          </button>
        </div>
      </aside>

      {/* 본문 + 우측 고정 프로필 레일. 데스크톱은 사이드바만큼 우측으로 밀림. */}
      <div
        className={`flex-1 transition-[padding] duration-200 ${
          sidebarOpen ? "lg:pl-64" : ""
        }`}
      >
        <div className="w-full max-w-7xl mx-auto flex gap-4 lg:gap-6 p-4 md:p-6">
          <main className="flex-1 min-w-0">{children}</main>
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-20">
              <ProfileRail />
            </div>
          </aside>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
