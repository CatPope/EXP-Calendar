"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import CharacterAvatar from "@/components/CharacterAvatar";
import { gradeBadgeClass, gradeLabel } from "@/lib/game";
import { skinById, type SkinId } from "@/lib/character";
import type { ShowcaseSummary } from "@/lib/types";

interface Props {
  user: ShowcaseSummary;
}

// 와이어프레임의 미니 잔디 블록(5행 x 12열) — 고정 패턴(장식용, 실제 데이터 비공개).
const MINI_GRASS: boolean[] = [
  true, false, true, true, false, true, true, true, false, true, true, true,
  true, true, false, true, true, false, true, true, true, false, true, false,
  false, true, true, true, false, true, true, false, true, true, false, true,
  true, false, true, false, true, true, false, true, true, true, false, true,
  true, true, true, false, true, false, true, true, false, true, true, false,
];

// 쇼케이스 유저 카드 — uxui_11/12 정합.
// 상단: Lv 배지(좌) / 등급 배지(우, 데이터 있을 때만)
// 중앙: 캐릭터 · 이름 · 동반자 · 칭호 등급 · 「칭호」
// 하단: 미니 잔디 + 프로필 방문 ▶
export default function ShowcaseCard({ user }: Props) {
  const skin = (user.character_skin as SkinId) || undefined;
  const companion = skin ? skinById(skin).label : null;
  const title = user.equipped_title;

  return (
    <div className="card flex flex-col gap-3">
      {/* 상단 배지 행 */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs font-semibold text-text-2">
          Lv. {user.level}
        </span>
        {title && (
          <span
            className={`inline-flex items-center rounded-md border bg-surface-2/40 px-2 py-0.5 text-xs font-semibold ${gradeBadgeClass(
              title.grade
            )}`}
          >
            등급 {gradeLabel(title.grade)}
          </span>
        )}
      </div>

      {/* 캐릭터 + 정체성 */}
      <div className="flex flex-col items-center gap-1 text-center">
        <CharacterAvatar level={user.level} skin={skin} size={88} animated={false} />
        <div className="mt-1 truncate font-semibold">{user.display_name}</div>
        {companion && <div className="text-xs text-text-2">동반자: {companion}</div>}
        {title ? (
          <>
            <span
              className={`mt-1 inline-flex items-center rounded-md border bg-surface-2/40 px-2 py-0.5 text-xs font-semibold ${gradeBadgeClass(
                title.grade
              )}`}
            >
              ★ {gradeLabel(title.grade)}
            </span>
            <div className="text-sm text-text-1">「 {title.name} 」</div>
          </>
        ) : (
          <div className="text-xs text-text-2">칭호 없음</div>
        )}
      </div>

      {/* 미니 잔디 (요약 카드는 활동 강도만 시각적으로 암시 — 상세는 프로필에서 열람) */}
      <div className="border-t border-border pt-3" aria-hidden>
        <div className="grid grid-cols-12 gap-0.5">
          {MINI_GRASS.map((lit, i) => (
            <div
              key={i}
              className={`aspect-square rounded-sm ${lit ? "bg-accent/60" : "bg-surface-2"}`}
            />
          ))}
        </div>
      </div>

      {/* 프로필 방문 */}
      <Link
        href={`/showcase/${user.user_id}`}
        className="btn-ghost mt-1 flex items-center justify-center gap-1 border-t border-border pt-3 text-sm font-medium hover:text-accent"
      >
        프로필 방문 <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
