"use client";

import { useAppStore } from "@/lib/store";
import { Coins, Menu, Zap } from "lucide-react";
import TitleBadge from "./TitleBadge";
import { useT } from "@/lib/i18n";

export default function HUD() {
  const t = useT();
  const user = useAppStore((s) => s.user);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  if (!user) return null;

  const levelTotalExp = user.level * user.level * 100;
  const prevLevelExp = (user.level - 1) * (user.level - 1) * 100;
  const intoLevel = Math.max(0, user.total_exp - prevLevelExp);
  const levelSpan = Math.max(1, levelTotalExp - prevLevelExp);
  const pct = Math.min(100, Math.round((intoLevel / levelSpan) * 100));

  const dailyPct = Math.min(
    100,
    Math.round((user.daily_points_earned / Math.max(1, user.daily_points_cap)) * 100)
  );

  return (
    <header className="sticky top-0 z-30 bg-base/90 backdrop-blur border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-2 flex flex-wrap items-center gap-4">
        <button
          type="button"
          aria-label={t("common.openMenu")}
          onClick={() => setSidebarOpen(true)}
          className="text-text-2 hover:text-text-1 transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-accent/20 border border-accent/50 flex items-center justify-center font-bold text-accent">
            {user.level}
          </div>
          <div className="text-sm">
            <div className="font-semibold text-text-1">
              {user.persona_name || user.display_name}
            </div>
            <div className="text-xs text-text-2">Lv. {user.level}</div>
            {user.status_message && (
              <div className="text-xs text-text-2 max-w-[140px] truncate opacity-70">
                {user.status_message}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-[180px]">
          <div className="flex justify-between text-xs text-text-2 mb-1">
            <span className="flex items-center gap-1"><Zap className="h-3 w-3" />EXP</span>
            <span className="font-mono">
              {user.total_exp} / {levelTotalExp}
            </span>
          </div>
          <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-success transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="text-sm">
          <div className="flex items-center gap-1 text-gold font-mono">
            <Coins className="h-4 w-4" /> {user.current_points}C
          </div>
          <div className="text-xs text-text-2">
            {t("common.todayLabel")} {user.daily_points_earned}/{user.daily_points_cap} ({dailyPct}%)
          </div>
        </div>

        <div>
          <TitleBadge
            title={user.equipped_title}
            modifier={user.equipped_title?.negative_modifier}
          />
        </div>
      </div>
    </header>
  );
}
