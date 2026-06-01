"use client";

import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import Spinner from "@/components/common/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import CharacterAvatar from "@/components/CharacterAvatar";
import TitleCard, { type TitleCardModel } from "@/components/titles/TitleCard";
import PenaltyBanner from "@/components/titles/PenaltyBanner";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { UserTitle } from "@/lib/types";
import { SKINS, unlockedSkins, skinFromLevel, type SkinId } from "@/lib/character";

const SKIN_GRADE_LABEL: Record<string, string> = {
  COMMON: "일반",
  RARE: "레어",
  EPIC: "에픽",
  LEGENDARY: "레전더리"
};

export default function TitlesPage() {
  const [busyId, setBusyId] = useState<string | null>(null);

  const pushToast = useAppStore((s) => s.pushToast);
  const setUser = useAppStore((s) => s.setUser);
  const patchUser = useAppStore((s) => s.patchUser);

  const { data, loading, error, dismissError } = useAsyncData<UserTitle[]>(
    () => Api.myTitles(),
    []
  );
  // 토글 시 재-fetch/로딩 깜빡임을 막기 위한 낙관적 로컬 미러.
  const [overrides, setOverrides] = useState<UserTitle[] | null>(null);
  const titles = overrides ?? data ?? [];

  // 카운터 — 획득/장착/전시 수.
  const ownedCount = titles.length;
  const totalCount = ownedCount; // 카탈로그 미제공 → 보유 수로 N/N 표기
  const equippedCount = titles.filter((t) => t.is_equipped).length;
  const displayedCount = titles.filter((t) => t.is_displayed).length;
  const penaltyTitle = titles.find((t) => t.is_equipped && t.negative_modifier);

  // 캐릭터 디자인: 보유 칭호 등급으로 해금, 선택은 서버(users.character_skin)에 저장.
  const user = useAppStore((s) => s.user);
  const level = user?.level ?? 1;
  const ownedGrades = titles.map((ut) => ut.title.grade);
  const unlocked = unlockedSkins(ownedGrades);
  const unlockedIds = new Set(unlocked.map((s) => s.id));

  const [skin, setSkin] = useState<SkinId | null>(null);
  useEffect(() => {
    const stored = (user?.character_skin as SkinId) || null;
    setSkin(stored ?? skinFromLevel(level).id);
  }, [level, user?.character_skin]);
  const activeSkin: SkinId =
    skin && unlockedIds.has(skin) ? skin : skinFromLevel(level).id;

  async function selectSkin(id: SkinId) {
    setSkin(id);
    patchUser({ character_skin: id });
    try {
      await Api.setCharacterSkin(id);
    } catch (e) {
      pushToast("error", humanizeError(e));
    }
  }

  function applyLocal(updater: (arr: UserTitle[]) => UserTitle[]) {
    setOverrides((cur) => updater(cur ?? data ?? []));
  }

  async function toggleEquip(t: UserTitle) {
    setBusyId(t.id);
    try {
      // 명세: 장착(equipped)은 1개만. true로 보내면 기존 장착은 서버가 해제.
      await Api.patchTitle(t.id, { is_equipped: !t.is_equipped });
      pushToast("success", t.is_equipped ? "칭호를 해제했습니다." : "칭호를 장착했습니다.");
      applyLocal((arr) =>
        arr.map((x) => ({
          ...x,
          // 단일 선택 강제: 대상은 토글, 나머지는 모두 해제.
          is_equipped: x.id === t.id ? !t.is_equipped : false
        }))
      );
      try {
        const me = await Api.me();
        setUser(me);
      } catch {
        /* non-fatal */
      }
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleDisplay(t: UserTitle) {
    setBusyId(t.id);
    try {
      await Api.patchTitle(t.id, { is_displayed: !t.is_displayed });
      applyLocal((arr) =>
        arr.map((x) =>
          x.id === t.id ? { ...x, is_displayed: !t.is_displayed } : x
        )
      );
      pushToast("success", t.is_displayed ? "전시를 해제했습니다." : "전시 목록에 추가했습니다.");
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setBusyId(null);
    }
  }

  function toModel(t: UserTitle): TitleCardModel {
    return {
      owned: t,
      grade: t.title.grade,
      name: t.title.name,
      conditionText: `획득: ${new Date(t.acquired_at).toLocaleDateString("ko-KR")}`
    };
  }

  return (
    <div className="space-y-4">
      {/* 헤더 + 카운터 */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Crown className="h-5 w-5 text-gold" /> 칭호 컬렉션
          </h1>
          <p className="text-xs text-text-2">
            획득 {ownedCount} / 전체 {totalCount} · 장착·전시용 분리 선택
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded border border-accent px-2 py-0.5 text-xs text-accent">
            장착 ×{equippedCount}
          </span>
          <span className="inline-flex items-center rounded border border-success px-2 py-0.5 text-xs text-success">
            전시 ◆ {displayedCount}
          </span>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={dismissError} />}

      {loading ? (
        <Spinner block label="칭호 불러오는 중..." />
      ) : titles.length === 0 ? (
        <div className="card text-center text-sm text-text-2">
          아직 보유한 칭호가 없습니다. 일정을 완료하고 레벨을 올려 칭호를 획득하세요!
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {titles.map((ut) => (
            <TitleCard
              key={ut.id}
              model={toModel(ut)}
              busy={busyId === ut.id}
              onEquip={() => toggleEquip(ut)}
              onDisplay={() => toggleDisplay(ut)}
            />
          ))}
        </div>
      )}

      {/* PENALTY 배너 — 장착 칭호에 부정 수식어가 있을 때만 */}
      {penaltyTitle?.negative_modifier && (
        <PenaltyBanner
          modifier={penaltyTitle.negative_modifier}
          defenseCount={0}
          onRecover={() =>
            pushToast(
              "info",
              "정상 일정을 완료하면 강등이 자동으로 복구됩니다. (시스템 초기화 불가)"
            )
          }
          onUseDefense={() =>
            pushToast("info", "보유한 등급 하락 방어권이 없습니다. 상점에서 구매하세요.")
          }
        />
      )}

      {/* 캐릭터 디자인: 보유 칭호 등급으로 해금 */}
      <div className="card flex flex-col items-center gap-4 sm:flex-row">
        <CharacterAvatar level={level} skin={activeSkin} size={180} withFrame />
        <div className="w-full flex-1 space-y-2">
          <h2 className="font-semibold">내 캐릭터 디자인</h2>
          <p className="text-xs text-text-2">
            보유한 칭호 등급에 따라 캐릭터 디자인이 해금됩니다.
          </p>
          <select
            value={activeSkin}
            onChange={(e) => selectSkin(e.target.value as SkinId)}
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-1 focus:border-accent focus:outline-none sm:max-w-xs"
          >
            {SKINS.map((s) => {
              const locked = !unlockedIds.has(s.id);
              const need = s.unlockGrade
                ? `${SKIN_GRADE_LABEL[s.unlockGrade]} 칭호 필요`
                : "";
              return (
                <option key={s.id} value={s.id} disabled={locked}>
                  {s.label}
                  {locked ? ` (잠김 · ${need})` : ""}
                </option>
              );
            })}
          </select>
          <p className="text-[11px] text-text-2">
            잠금 해제: 일반(러너) · 레어(무법자) · 에픽(사이보그) 등급 칭호를 획득하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
