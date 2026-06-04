"use client";

import { Coins, Zap, Flame, CalendarClock } from "lucide-react";
import CharacterAvatar from "@/components/CharacterAvatar";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useT } from "@/lib/i18n";
import { Api } from "@/lib/api";
import type { StatsSummary, Schedule, GachaCharacter, OwnedCharacter } from "@/lib/types";
import { skinById, type SkinId } from "@/lib/character";

// 데모 app.jsx 의 CharRail(aside.a-rail)을 실제 데이터로 재현하는 우측 고정 프로필 레일.
// 모든 (app) 화면에서 동일하게 노출된다 (lg 이상).
export default function ProfileRail() {
  const t = useT();
  const user = useAppStore((s) => s.user);

  const { data: stats } = useAsyncData<StatsSummary>(() => Api.statsSummary(), []);

  // 다가오는 가장 가까운 PENDING 일정 (오늘 ~ +30일).
  const today = new Date();
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const to = new Date(today);
  to.setDate(to.getDate() + 30);
  const { data: schedules } = useAsyncData<Schedule[]>(
    () => Api.listSchedules(ymd(today), ymd(to)),
    []
  );

  // 스킨 도감 카탈로그(sprite_key → 캐릭터 이름). 1회만 받아두고, 장착 변경은
  // user.character_skin(=sprite_key)이 /me로 갱신되며 반응형으로 반영된다.
  const { data: collection } = useAsyncData<{
    catalog: GachaCharacter[];
    owned: OwnedCharacter[];
  }>(() => Api.summonCollection(), []);

  if (!user) return null;

  // 장착 스킨 이름: 도감 캐릭터 이름 우선, 없으면 스프라이트 매니페스트 라벨.
  const skinNameMap = new Map((collection?.catalog ?? []).map((c) => [c.sprite_key, c.name]));
  const skin = user.character_skin;
  const skinName = skin
    ? skinNameMap.get(skin) || skinById(skin as SkinId).label
    : "";

  const levelTotalExp = user.level * user.level * 100;
  const prevLevelExp = (user.level - 1) * (user.level - 1) * 100;
  const intoLevel = Math.max(0, user.total_exp - prevLevelExp);
  const levelSpan = Math.max(1, levelTotalExp - prevLevelExp);
  const expPct = Math.min(100, Math.round((intoLevel / levelSpan) * 100));
  const dailyPct = Math.min(
    100,
    Math.round((user.daily_points_earned / Math.max(1, user.daily_points_cap)) * 100)
  );

  const now = Date.now();
  const next = (schedules ?? [])
    .filter((s) => s.status === "PENDING" && new Date(s.due_date).getTime() >= now)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

  return (
    <div className="space-y-4">
      {/* 캐릭터 프로필 카드 */}
      <div className="card space-y-3">
        <div className="flex justify-center pt-1">
          <CharacterAvatar
            level={user.level}
            skin={(user.character_skin as SkinId) || undefined}
            size={120}
            withFrame
          />
        </div>

        <div className="text-center">
          <div className="font-semibold text-text-1">{user.display_name}</div>
          {skinName && (
            <div className="text-xs text-text-2 mt-0.5">{skinName}</div>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-1.5">
          <span className="text-[11px] rounded-full px-2 py-0.5 border border-accent/50 text-accent">
            Lv.{user.level}
          </span>
          {user.equipped_title && (
            <span className="text-[11px] rounded-full px-2 py-0.5 border border-border text-text-1">
              「{user.equipped_title.name}」
            </span>
          )}
          {stats?.rating_grade && (
            <span className="text-[11px] rounded-full px-2 py-0.5 border border-gold/50 text-gold">
              {t("core.railGrade")} {stats.rating_grade}
            </span>
          )}
        </div>

        {user.status_message && (
          <p className="text-[11px] text-text-2 text-center leading-relaxed line-clamp-3">
            “{user.status_message}”
          </p>
        )}

        {/* EXP 바 */}
        <div>
          <div className="flex justify-between text-[11px] text-text-2 mb-1">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {t("core.railExp")}
            </span>
            <span className="font-mono">
              {user.total_exp} / {levelTotalExp}
            </span>
          </div>
          <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-success transition-all"
              style={{ width: `${expPct}%` }}
            />
          </div>
        </div>

        {/* 스탯 행 */}
        <div className="divide-y divide-border text-xs">
          <StatRow
            icon={<Coins className="h-3.5 w-3.5 text-gold" />}
            label={t("core.railPoints")}
            value={<span className="text-gold font-mono">{user.current_points}C</span>}
          />
          <StatRow
            icon={<Zap className="h-3.5 w-3.5 text-accent" />}
            label={t("core.railToday")}
            value={
              <span className="font-mono">
                {user.daily_points_earned}/{user.daily_points_cap} ({dailyPct}%)
              </span>
            }
          />
          <StatRow
            icon={<Flame className="h-3.5 w-3.5 text-danger" />}
            label={t("core.railStreak")}
            value={
              <span className="font-mono">
                {t("core.railDays", { n: stats?.current_streak ?? 0 })}
              </span>
            }
          />
        </div>
      </div>

      {/* 다음 일정 */}
      <div className="card space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-text-2">
          <CalendarClock className="h-3.5 w-3.5" />
          {t("core.railNext")}
        </div>
        {next ? (
          <div>
            <div className="text-sm text-text-1 truncate">{next.title}</div>
            <div className="text-[11px] text-text-2 mt-0.5">
              {new Date(next.due_date).toLocaleString(undefined, {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </div>
          </div>
        ) : (
          <div className="text-xs text-text-2">{t("core.railNoNext")}</div>
        )}
      </div>
    </div>
  );
}

function StatRow({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="flex items-center gap-1.5 text-text-2">
        {icon}
        {label}
      </span>
      {value}
    </div>
  );
}
