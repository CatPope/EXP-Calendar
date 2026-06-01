"use client";

import { Api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Quest, QuestType } from "@/lib/types";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import ErrorBanner from "@/components/ErrorBanner";
import Spinner from "@/components/common/Spinner";
import ResetCountdown from "@/components/quests/ResetCountdown";
import QuestCard from "@/components/quests/QuestCard";
import DailyBonusPanel from "@/components/quests/DailyBonusPanel";

/** Display order per the wireframe (uxui_04). */
const QUEST_ORDER: QuestType[] = ["ADD_PLAN", "COMPLETE_PLAN", "VISIT_SHOWCASE"];

export default function QuestsPage() {
  const { data, loading, error, dismissError } = useAsyncData<Quest[]>(
    () => Api.todayQuests(),
    []
  );

  const quests = data ?? [];
  const byType = new Map(quests.map((q) => [q.quest_type, q]));

  // Keep a stable, wireframe-ordered list even if the API omits a quest type.
  const ordered: Quest[] = QUEST_ORDER.map(
    (qt) =>
      byType.get(qt) ?? { quest_type: qt, completed: false, reward_points: 0 }
  );

  const allComplete =
    quests.length > 0 && ordered.every((q) => q.completed);

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-1">일일 퀘스트</h1>
          <p className="mt-1 text-sm text-text-2">
            매일 자정 초기화 · 3종 미션 완료 시 보너스 포인트
          </p>
        </div>
        <ResetCountdown />
      </div>

      {error && <ErrorBanner message={error} onDismiss={dismissError} />}

      {loading ? (
        <Spinner block label="퀘스트 로딩 중..." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {ordered.map((q) => (
              <QuestCard
                key={q.quest_type}
                questType={q.quest_type}
                completed={q.completed}
                rewardPoints={q.reward_points}
              />
            ))}
          </div>

          <DailyBonusPanel allComplete={allComplete} />
        </>
      )}
    </div>
  );
}
