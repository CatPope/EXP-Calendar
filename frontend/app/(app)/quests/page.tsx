"use client";

import { useState } from "react";
import { ListChecks, Check, Gift, Flame } from "lucide-react";
import Spinner from "@/components/common/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { Quest, QuestType } from "@/lib/types";

const QUEST_META: Record<QuestType, { title: string; desc: string }> = {
  ADD_PLAN: { title: "계획 세우기", desc: "오늘 일정 2개 이상 추가" },
  COMPLETE_PLAN: { title: "실천하기", desc: "오늘 일정 1개 이상 완료" },
  VISIT_SHOWCASE: { title: "이웃 방문", desc: "다른 사용자 쇼케이스 1회 방문" },
};

export default function QuestsPage() {
  const [busy, setBusy] = useState<QuestType | null>(null);

  const pushToast = useAppStore((s) => s.pushToast);
  const setUser = useAppStore((s) => s.setUser);

  const { data, loading, error, reload, dismissError } = useAsyncData<Quest[]>(
    () => Api.todayQuests(),
    []
  );

  const quests = data ?? [];
  const completedCount = quests.filter((q) => q.completed).length;
  const allDone = quests.length > 0 && completedCount === quests.length;

  async function handleComplete(qt: QuestType) {
    setBusy(qt);
    try {
      const result = await Api.completeQuest(qt);
      if (result.reward_points > 0 || result.completed) {
        let msg = `+${result.reward_points}P 획득!`;
        if (result.bonus_points > 0) msg += ` (보너스 +${result.bonus_points}P)`;
        if (result.streak_mult > 1) msg += ` ×${result.streak_mult} 스트릭!`;
        pushToast("success", msg);
      }
      await reload();
      try {
        const me = await Api.me();
        setUser(me);
      } catch {
        /* non-fatal */
      }
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ListChecks className="h-5 w-5 text-accent" />
        <h1 className="text-lg font-semibold">일일 퀘스트</h1>
        <span className="text-xs text-text-2 ml-auto">매일 0시(KST) 초기화</span>
      </div>

      {error && <ErrorBanner message={error} onDismiss={dismissError} />}

      {loading ? (
        <Spinner block label="퀘스트 불러오는 중..." />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-2">{completedCount}/3 완료</span>
            {allDone && (
              <span className="text-sm text-success inline-flex items-center gap-1">
                <Gift className="h-4 w-4" /> 전체 완료! 보너스 지급됨
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quests.map((q) => {
              const meta = QUEST_META[q.quest_type];
              return (
                <div
                  key={q.quest_type}
                  className={`card flex flex-col gap-2 ${
                    q.completed ? "border-success/50" : ""
                  }`}
                >
                  <h2 className="font-semibold text-text-1">{meta.title}</h2>
                  <p className="text-xs text-text-2 flex-1">{meta.desc}</p>
                  <p className="text-sm font-semibold text-gold">
                    +{q.reward_points}P
                  </p>
                  <div className="pt-2 border-t border-border">
                    {q.completed ? (
                      <span className="text-sm text-success inline-flex items-center gap-1">
                        <Check className="h-4 w-4" /> 완료
                      </span>
                    ) : (
                      <button
                        className="w-full text-xs rounded-md py-1.5 bg-surface-2 text-text-1 hover:bg-border disabled:opacity-50"
                        disabled={busy === q.quest_type}
                        onClick={() => handleComplete(q.quest_type)}
                      >
                        완료 처리
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card flex items-start gap-2">
            <Flame className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-text-2">
              3종 모두 완료 시 보너스 +50P · 7일 연속 전체 완료 시 포인트 ×2
            </p>
          </div>
        </>
      )}
    </div>
  );
}
