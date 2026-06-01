"use client";

import { Crown, Lock, Square } from "lucide-react";
import type { UserTitle } from "@/lib/types";
import { GRADE_BORDER, type GradeKey } from "@/lib/game";
import GradeBadge from "./GradeBadge";

export interface TitleCardModel {
  /** 보유 칭호이면 채워짐. 미보유(잠김/진행 중)이면 null. */
  owned: UserTitle | null;
  grade: string;
  name: string;
  /** 해금 조건 또는 진행 텍스트 (예: "7일 연속 완료", "진행 18/30"). */
  conditionText?: string;
  /** "locked"(미획득) | "progress"(획득 진행 중) — owned가 null일 때만 사용. */
  state?: "locked" | "progress";
}

interface Props {
  model: TitleCardModel;
  busy?: boolean;
  onEquip?: () => void;
  onDisplay?: () => void;
}

export default function TitleCard({ model, busy, onEquip, onDisplay }: Props) {
  const { owned, grade, name, conditionText, state } = model;
  const equipped = owned?.is_equipped ?? false;
  const displayed = owned?.is_displayed ?? false;
  const g = (grade as GradeKey) in GRADE_BORDER ? (grade as GradeKey) : "COMMON";
  const modifier = owned?.negative_modifier ?? null;

  return (
    <div
      className={`card flex flex-col items-center gap-2 text-center ${
        equipped ? `border-accent shadow-lg shadow-accent/10` : ""
      }`}
    >
      {/* 아이콘: 보유=왕관, 미획득=제네릭 사각 */}
      {owned ? (
        <Crown className="h-6 w-6 text-gold" aria-hidden />
      ) : (
        <Square className="h-6 w-6 text-text-2" aria-hidden />
      )}

      <GradeBadge grade={grade} />

      <h3 className={`text-sm font-semibold ${owned ? "text-text-1" : "text-text-2"}`}>
        {modifier ? (
          <span className="text-danger">&lt;{modifier} {name}&gt;</span>
        ) : (
          name
        )}
      </h3>

      {conditionText ? (
        <p className="text-xs text-text-2">{conditionText}</p>
      ) : null}

      {/* 상태별 하단 영역 */}
      {owned ? (
        <div className="mt-1 flex w-full items-center gap-2 border-t border-border pt-2">
          <button
            type="button"
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              equipped
                ? "bg-accent text-white"
                : "bg-surface-2 text-text-1 hover:bg-border"
            }`}
            disabled={busy}
            onClick={onEquip}
          >
            {equipped ? "장착됨" : "장착"}
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              displayed
                ? "bg-success text-base"
                : "bg-surface-2 text-text-1 hover:bg-border"
            }`}
            disabled={busy}
            onClick={onDisplay}
          >
            {displayed ? "전시★" : "전시"}
          </button>
        </div>
      ) : state === "progress" ? (
        <p className="mt-1 border-t border-border pt-2 text-xs text-accent w-full">
          획득 진행 중
        </p>
      ) : (
        <p className="mt-1 inline-flex w-full items-center justify-center gap-1 border-t border-border pt-2 text-xs text-text-2">
          <Lock className="h-3 w-3 text-gold" /> 미획득
        </p>
      )}
    </div>
  );
}
