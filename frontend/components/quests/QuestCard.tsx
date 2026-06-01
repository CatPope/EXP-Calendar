"use client";

import Link from "next/link";
import { Check, Target } from "lucide-react";
import type { QuestType } from "@/lib/types";
import { QUEST_LABEL } from "@/lib/game";

/** Per-quest progress target (M) — matches the wireframe (uxui_04). */
export const QUEST_TARGET: Record<QuestType, number> = {
  ADD_PLAN: 2,
  COMPLETE_PLAN: 1,
  VISIT_SHOWCASE: 1
};

interface Props {
  questType: QuestType;
  completed: boolean;
  rewardPoints: number;
}

/**
 * A single daily-quest card.
 * - completed → success-colored border + filled check, full M/M segments
 * - incomplete → neutral border, hollow icon, 0/M
 * - VISIT_SHOWCASE links to /showcase so the user can satisfy it.
 */
export default function QuestCard({ questType, completed, rewardPoints }: Props) {
  const target = QUEST_TARGET[questType];
  const current = completed ? target : 0;
  const label = QUEST_LABEL[questType] ?? questType;

  const card = (
    <div
      className={`card flex h-full flex-col gap-3 transition-colors ${
        completed ? "border-success" : "border-border"
      }`}
    >
      {/* quest type code */}
      <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-text-2">
        {questType}
      </div>

      {/* big icon */}
      <div className="flex justify-center py-1">
        {completed ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="h-6 w-6" strokeWidth={3} />
          </span>
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-text-2">
            <Target className="h-6 w-6" />
          </span>
        )}
      </div>

      {/* human label */}
      <div className="text-center text-sm font-medium text-text-1">{label}</div>

      {/* segmented progress bar */}
      <div className="mt-auto flex gap-1" aria-hidden>
        {Array.from({ length: target }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < current ? "bg-success" : "bg-surface-2"
            }`}
          />
        ))}
      </div>

      {/* progress text + reward badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs tabular-nums text-text-2">
          {current}/{target}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-gold/50 bg-gold/10 px-2 py-1 text-xs font-semibold text-gold tabular-nums">
          ◎ +{rewardPoints} P
        </span>
      </div>
    </div>
  );

  if (questType === "VISIT_SHOWCASE" && !completed) {
    return (
      <Link
        href="/showcase"
        className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
        aria-label={`${label} — 쇼케이스로 이동`}
      >
        {card}
      </Link>
    );
  }

  return card;
}
