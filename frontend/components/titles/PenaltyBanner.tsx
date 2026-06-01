"use client";

import { AlertOctagon, Heart } from "lucide-react";

interface Props {
  /** 부착된 부정 수식어 (예: "게으른"). */
  modifier: string;
  /** 보유 방어권 수량 — "♡ 방어권 사용 (N)"에 노출. */
  defenseCount?: number;
  onRecover?: () => void;
  onUseDefense?: () => void;
  busy?: boolean;
}

// 장착 칭호에 부정 수식어가 붙었을 때만 렌더 (uxui_05 하단 PENALTY 카드).
export default function PenaltyBanner({
  modifier,
  defenseCount = 0,
  onRecover,
  onUseDefense,
  busy
}: Props) {
  return (
    <div className="card border-danger/60 bg-danger/5">
      <div className="flex items-center gap-2 border-b border-danger/30 pb-2 text-sm font-semibold text-danger">
        PENALTY <AlertOctagon className="h-4 w-4" /> 페널티 / 강등
      </div>
      <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center">
        <AlertOctagon className="h-5 w-5 flex-shrink-0 text-danger" aria-hidden />
        <div className="flex-1">
          <p className="text-sm text-text-1">
            장착 칭호에{" "}
            <span className="font-semibold text-danger">&apos;{modifier}&apos;</span>{" "}
            수식어가 부착되었습니다
          </p>
          <p className="text-xs text-text-2">
            일정 지연으로 자동 강등 · 정상 완료 또는 방어권으로만 복구 가능 (시스템 초기화 불가)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost text-xs disabled:opacity-50"
            disabled={busy}
            onClick={onRecover}
          >
            정상 완료로 복구
          </button>
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-1 text-xs disabled:opacity-50"
            disabled={busy || defenseCount <= 0}
            onClick={onUseDefense}
          >
            <Heart className="h-3 w-3" /> 방어권 사용 ({defenseCount})
          </button>
        </div>
      </div>
    </div>
  );
}
