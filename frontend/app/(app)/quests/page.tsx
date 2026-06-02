"use client";

import { useEffect, useRef } from "react";
import { ListChecks, Check, Gift, Flame, Loader2, RefreshCw } from "lucide-react";
import Spinner from "@/components/common/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import { Api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { Quest, QuestType } from "@/lib/types";

const QUEST_META: Record<QuestType, { title: string; desc: string }> = {
  ADD_PLAN: { title: "계획 세우기", desc: "오늘 일정 2개 이상 추가" },
  COMPLETE_PLAN: { title: "실천하기", desc: "오늘 일정 1개 이상 완료" },
  VISIT_SHOWCASE: { title: "이웃 방문", desc: "다른 사용자 쇼케이스 1회 방문" },
};

export default function QuestsPage() {
  const pushToast = useAppStore((s) => s.pushToast);
  const setUser = useAppStore((s) => s.setUser);

  // 퀘스트는 서버에서 조건 충족 시 자동 완료·지급된다. 목록을 불러오는 것만으로
  // (일정 추가/완료, 쇼케이스 방문) 자동 평가가 트리거되므로 버튼이 필요 없다.
  const { data, loading, error, reload, dismissError } = useAsyncData<Quest[]>(
    () => Api.todayQuests(),
    []
  );

  const quests = data ?? [];
  const completedCount = quests.filter((q) => q.completed).length;
  const allDone = quests.length > 0 && completedCount === quests.length;

  // 자동 새로고침: 화면 포커스 복귀 시 + 20초 주기로 재평가.
  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(reload, 20000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [reload]);

  // 퀘스트가 새로 완료되면(이전엔 미완료) 보상 토스트 + HUD(유저) 갱신.
  const prevCompleted = useRef<Set<QuestType> | null>(null);
  useEffect(() => {
    if (!data) return;
    const nowDone = new Set(data.filter((q) => q.completed).map((q) => q.quest_type));
    if (prevCompleted.current === null) {
      prevCompleted.current = nowDone; // 최초 로드는 토스트 생략
      return;
    }
    const newly = data.filter(
      (q) => q.completed && !prevCompleted.current!.has(q.quest_type)
    );
    prevCompleted.current = nowDone;
    if (newly.length > 0) {
      for (const q of newly) {
        pushToast("success", `${QUEST_META[q.quest_type].title} 완료! +${q.reward_points}P`);
      }
      Api.me().then(setUser).catch(() => {});
    }
  }, [data, pushToast, setUser]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ListChecks className="h-5 w-5 text-accent" />
        <h1 className="text-lg font-semibold">일일 퀘스트</h1>
        <button
          type="button"
          onClick={() => reload()}
          title="새로고침"
          className="ml-auto text-text-2 hover:text-text-1"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <span className="text-xs text-text-2">매일 0시(KST) 초기화</span>
      </div>

      {error && <ErrorBanner message={error} onDismiss={dismissError} />}

      {loading && !data ? (
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
                      <span className="text-sm text-text-2 inline-flex items-center gap-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> 진행 중
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card flex items-start gap-2">
            <Flame className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-text-2">
              조건을 충족하면 자동으로 완료·지급됩니다. 3종 모두 완료 시 보너스 +50P ·
              7일 연속 전체 완료 시 포인트 ×2
            </p>
          </div>
        </>
      )}
    </div>
  );
}
