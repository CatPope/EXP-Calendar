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
  Gift
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
        // FR-DORM-02: 복귀 시 성향 재설문 강제. 온보딩 페이지가 끝나면
        // POST /me/onboarding 이 needs_reonboarding 을 해제한다.
        if (me.needs_reonboarding && pathname !== "/onboarding") {
          router.replace("/onboarding");
          return;
        }
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
    // 데모 app.jsx 그리드 셸: 1행 헤더(전체 폭) · 2행 [nav | main | rail]
    <div className="h-screen grid grid-rows-[auto_1fr] grid-cols-[auto_1fr_auto] bg-base overflow-hidden">
      {/* top: 헤더 (전체 폭, 설정 기어는 우측) */}
      <div className="col-span-full row-start-1">
        <HUD />
      </div>

      {/* nav: 좌측 사이드바 — 열림 220px / 접힘·모바일 64px 아이콘 레일 */}
      <nav
        className={`row-start-2 col-start-1 bg-surface border-r border-border flex flex-col overflow-y-auto overflow-x-hidden transition-[width] duration-200 ${
          sidebarOpen ? "w-16 lg:w-[220px]" : "w-16"
        }`}
      >
        <div className="flex-1 p-2 space-y-1">
          {NAV.map(({ href, labelKey, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                title={t(`core.${labelKey}`)}
                className={`flex items-center gap-3 rounded-md py-2 text-sm border-l-2 transition-colors ${
                  sidebarOpen ? "px-0 justify-center lg:px-3 lg:justify-start" : "px-0 justify-center"
                } ${
                  active
                    ? "bg-accent/15 text-accent border-accent"
                    : "text-text-2 hover:bg-surface-2 hover:text-text-1 border-transparent"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && (
                  <span className="hidden lg:inline truncate">{t(`core.${labelKey}`)}</span>
                )}
              </Link>
            );
          })}
        </div>
        {/* footer: 로그아웃 (설정 항목은 헤더 기어로 이동) */}
        <div className="p-2 border-t border-border">
          <button
            onClick={onLogout}
            title={t("core.logout")}
            className={`w-full flex items-center gap-3 rounded-md py-2 text-sm text-text-2 hover:bg-danger/10 hover:text-danger ${
              sidebarOpen ? "px-0 justify-center lg:px-3 lg:justify-start" : "px-0 justify-center"
            }`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span className="hidden lg:inline">{t("core.logout")}</span>}
          </button>
        </div>
      </nav>

      {/* main: 중앙 본문 (독립 스크롤) */}
      <main className="row-start-2 col-start-2 min-w-0 overflow-auto">
        <div className="w-full max-w-5xl mx-auto p-4 md:p-6">{children}</div>
      </main>

      {/* rail: 우측 프로필 (xl 이상, 독립 스크롤) */}
      <aside className="row-start-2 col-start-3 hidden xl:block w-80 bg-surface border-l border-border overflow-auto p-4">
        <ProfileRail />
      </aside>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
