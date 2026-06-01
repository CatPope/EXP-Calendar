"use client";

import { Sparkles } from "lucide-react";

interface Props {
  allComplete: boolean;
}

/**
 * "DAILY BONUS" panel — full-clear reward.
 * Reflects whether all 3 quests are done; the bonus itself is awarded
 * server-side, so the button is a status indicator (not a claim action).
 */
export default function DailyBonusPanel({ allComplete }: Props) {
  return (
    <section className="card space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-2">
        DAILY BONUS
        <Sparkles className="h-3.5 w-3.5 text-gold" />
        <span className="text-text-1">전체 완료 보상</span>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-2/40 p-4">
        <div className="flex items-center gap-4">
          {/* dashed treasure placeholder */}
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md border-2 border-dashed border-accent/50 text-[10px] uppercase tracking-wide text-accent">
            treasure
          </div>
          <div className="space-y-1">
            <p className="text-sm text-text-1">
              3종 모두 완료 시 <span className="font-semibold text-gold">+50 P</span> 보너스
            </p>
            <p className="text-xs text-text-2">
              연속 달성 시 추가 보너스 (스트릭 7일 = ×2)
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled
          className={`btn flex-shrink-0 cursor-default ${
            allComplete
              ? "border border-success/50 bg-success/15 text-success"
              : "btn-ghost text-text-2"
          }`}
          aria-live="polite"
        >
          {allComplete ? "획득 완료" : "진행 중..."}
        </button>
      </div>
    </section>
  );
}
