"use client";

// MY CHARACTER 카드 (uxui_09): 아바타 + 이름/외형 + 등급/Lv/장착칭호 배지 +
// 전시 칭호 배지 + 상태 메시지(대사) 인라인 편집(localStorage 저장).

import { useEffect, useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import CharacterAvatar from "@/components/CharacterAvatar";
import TitleBadge from "@/components/TitleBadge";
import { gradeBadgeClass, gradeLabel } from "@/lib/game";
import { skinById, skinFromLevel, type SkinId } from "@/lib/character";
import type { Title, User } from "@/lib/types";
import type { RatingLetter } from "./rating";

const STATUS_KEY = "exp-calendar.status-message";
const DEFAULT_STATUS =
  '"흥, 오늘 일정 정도는 가뿐하게 끝냈다구! ...딱히 너 보라고 한 건 아니니까 착각하지 마."';

interface Props {
  user: User;
  rating: RatingLetter;
  /** 전시(is_displayed) 칭호 목록. */
  displayedTitles: Title[];
}

export default function CharacterCard({ user, rating, displayedTitles }: Props) {
  const level = user.level ?? 1;
  const skinId = (user.character_skin as SkinId) || null;
  const skinDef = skinId ? skinById(skinId) : skinFromLevel(level);
  const equipped = user.equipped_title;

  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(DEFAULT_STATUS);

  // 최초 마운트 시 localStorage 에서 복원.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STATUS_KEY);
    if (saved) {
      setStatus(saved);
      setDraft(saved);
    }
  }, []);

  function startEdit() {
    setDraft(status);
    setEditing(true);
  }
  function save() {
    const next = draft.trim() || DEFAULT_STATUS;
    setStatus(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STATUS_KEY, next);
    }
    setEditing(false);
  }
  function cancel() {
    setDraft(status);
    setEditing(false);
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-sm font-semibold text-text-2">◆ MY CHARACTER · 내 캐릭터</h2>

      <div className="flex flex-col gap-4 sm:flex-row">
        {/* 아바타 + 이름/외형 */}
        <div className="flex flex-col items-center gap-1 sm:w-44 sm:shrink-0">
          <CharacterAvatar level={level} skin={skinId || undefined} size={140} withFrame />
          <div className="mt-1 text-center font-semibold">{user.display_name}</div>
          <div className="text-xs text-text-2">외형: {skinDef.label}</div>
        </div>

        {/* 우측: 배지 + 전시칭호 + 대사 */}
        <div className="flex-1 space-y-3">
          {/* 배지 행: 등급 / Lv / 장착 칭호 등급 + 이름 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded border border-gold px-2 py-0.5 text-xs font-semibold text-gold">
              등급 {rating}
            </span>
            <span className="inline-flex items-center rounded border border-border px-2 py-0.5 text-xs text-text-1">
              Lv.{level}
            </span>
            {equipped && (
              <span
                className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${gradeBadgeClass(
                  equipped.grade
                )}`}
              >
                ★ {gradeLabel(equipped.grade)}
              </span>
            )}
            {equipped && (
              <span className="inline-flex items-center rounded border border-border px-2 py-0.5 text-xs text-text-1">
                「{equipped.name}」
              </span>
            )}
          </div>

          {/* 전시 칭호 */}
          <div className="space-y-1">
            <div className="text-xs text-text-2">전시 칭호</div>
            {displayedTitles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {displayedTitles.map((t) => (
                  <span
                    key={t.id}
                    className={`inline-flex items-center rounded border px-2 py-0.5 ${gradeBadgeClass(
                      t.grade
                    )}`}
                  >
                    <TitleBadge title={t} />
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-2">전시 중인 칭호가 없습니다.</div>
            )}
          </div>

          {/* 상태 메시지(대사) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-2">상태 메시지 (대사)</span>
              {!editing && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="btn-ghost inline-flex items-center gap-1 px-2 py-1 text-xs"
                >
                  <Pencil className="h-3 w-3" /> 대사 수정
                </button>
              )}
            </div>
            {editing ? (
              <div className="space-y-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  className="input w-full resize-none"
                  placeholder="캐릭터의 한마디를 입력하세요"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancel}
                    className="btn-ghost inline-flex items-center gap-1 px-2 py-1 text-xs"
                  >
                    <X className="h-3 w-3" /> 취소
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    className="btn-primary inline-flex items-center gap-1 px-2 py-1 text-xs"
                  >
                    <Check className="h-3 w-3" /> 저장
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-1 whitespace-pre-wrap">
                {status}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
