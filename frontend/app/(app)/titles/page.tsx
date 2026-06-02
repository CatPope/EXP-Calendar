"use client";

import { useEffect, useState } from "react";
import { Crown, Eye, EyeOff, Star } from "lucide-react";
import Spinner from "@/components/common/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import TitleBadge from "@/components/TitleBadge";
import CharacterAvatar from "@/components/CharacterAvatar";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { UserTitle } from "@/lib/types";
import {
  groupedCharacters,
  skinById,
  DEFAULT_SKIN,
  type SkinId,
} from "@/lib/character";

export default function TitlesPage() {
  const [busyId, setBusyId] = useState<string | null>(null);

  const pushToast = useAppStore((s) => s.pushToast);
  const setUser = useAppStore((s) => s.setUser);
  const patchUser = useAppStore((s) => s.patchUser);

  const { data, loading, error, dismissError } = useAsyncData<UserTitle[]>(
    () => Api.myTitles(),
    []
  );
  // Local optimistic mirror so toggles don't trigger a re-fetch / loading flash.
  const [overrides, setOverrides] = useState<UserTitle[] | null>(null);
  const titles = overrides ?? data ?? [];

  // 캐릭터 디자인: 모든 캐릭터 선택 가능, 선택은 서버(users.character_skin)에 저장.
  const user = useAppStore((s) => s.user);
  const level = user?.level ?? 1;
  const groups = groupedCharacters();

  const [skin, setSkin] = useState<SkinId | null>(null);
  useEffect(() => {
    setSkin((user?.character_skin as SkinId) || DEFAULT_SKIN);
  }, [user?.character_skin]);
  const activeSkin: SkinId = skin || DEFAULT_SKIN;

  // 선택된 캐릭터가 속한 카테고리를 기본 탭으로.
  const activeCategory = skinById(activeSkin).category;
  const [tab, setTab] = useState<string | null>(null);
  useEffect(() => {
    setTab((t) => t ?? activeCategory);
  }, [activeCategory]);
  const currentTab = tab ?? groups[0]?.category ?? "";
  const tabItems = groups.find((g) => g.category === currentTab)?.items ?? [];

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-gold" />
        <h1 className="text-lg font-semibold">내 칭호</h1>
        <span className="text-xs text-text-2 ml-auto">
          총 {titles.length}개 · 장착은 1개만 가능
        </span>
      </div>

      {error && <ErrorBanner message={error} onDismiss={dismissError} />}

      {/* 캐릭터 디자인: 모든 캐릭터 선택 가능 */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <CharacterAvatar level={level} skin={activeSkin} size={140} withFrame />
          <div className="flex-1 space-y-1 w-full">
            <h2 className="font-semibold">내 캐릭터 디자인</h2>
            <p className="text-sm text-accent">{skinById(activeSkin).label}</p>
            <p className="text-xs text-text-2">
              원하는 캐릭터를 골라보세요. 모든 캐릭터를 사용할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex flex-wrap gap-1.5">
          {groups.map((g) => (
            <button
              key={g.category}
              onClick={() => setTab(g.category)}
              className={`text-xs rounded-full px-3 py-1 transition-colors ${
                g.category === currentTab
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-text-2 hover:bg-border"
              }`}
            >
              {g.category}
              <span className="ml-1 opacity-60">{g.items.length}</span>
            </button>
          ))}
        </div>

        {/* 캐릭터 그리드 */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-80 overflow-y-auto pr-1">
          {tabItems.map((c) => {
            const selected = c.id === activeSkin;
            return (
              <button
                key={c.id}
                onClick={() => selectSkin(c.id)}
                title={c.label}
                aria-pressed={selected}
                className={`flex items-center justify-center rounded-md p-1 border transition-colors ${
                  selected
                    ? "border-accent bg-accent/15"
                    : "border-border bg-surface-2 hover:border-accent/50"
                }`}
              >
                <CharacterAvatar level={level} skin={c.id} size={48} animated={false} />
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <Spinner block label="칭호 불러오는 중..." />
      ) : titles.length === 0 ? (
        <div className="card text-center text-text-2 text-sm">
          아직 보유한 칭호가 없습니다. 일정을 완료하고 레벨을 올려 칭호를 획득하세요!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {titles.map((ut) => (
            <div
              key={ut.id}
              className={`card flex flex-col gap-2 ${
                ut.is_equipped ? "border-accent/60 shadow-lg shadow-accent/10" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <TitleBadge title={ut.title} modifier={ut.negative_modifier} />
                {ut.is_equipped && (
                  <span className="text-[10px] text-accent inline-flex items-center gap-0.5">
                    <Star className="h-3 w-3" /> 장착중
                  </span>
                )}
              </div>
              <p className="text-xs text-text-2">
                획득: {new Date(ut.acquired_at).toLocaleDateString("ko-KR")}
              </p>
              {ut.negative_modifier && (
                <p className="text-xs text-danger">
                  페널티: {ut.negative_modifier}
                </p>
              )}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  className={`flex-1 text-xs rounded-md py-1.5 ${
                    ut.is_equipped
                      ? "bg-accent text-white"
                      : "bg-surface-2 text-text-1 hover:bg-border"
                  } disabled:opacity-50`}
                  disabled={busyId === ut.id}
                  onClick={() => toggleEquip(ut)}
                >
                  {ut.is_equipped ? "장착 해제" : "장착하기"}
                </button>
                <button
                  className="text-xs rounded-md py-1.5 px-2 bg-surface-2 hover:bg-border inline-flex items-center gap-1 disabled:opacity-50"
                  disabled={busyId === ut.id}
                  onClick={() => toggleDisplay(ut)}
                  title="쇼케이스 전시 토글"
                >
                  {ut.is_displayed ? (
                    <>
                      <Eye className="h-3 w-3" /> 전시중
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3 w-3" /> 미전시
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
