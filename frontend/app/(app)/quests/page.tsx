"use client";

import { useEffect, useRef, useState } from "react";
import { ListChecks, Check, Gift, Flame, Loader2, RefreshCw, Star } from "lucide-react";
import Spinner from "@/components/common/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useT } from "@/lib/i18n";
import type { Quest, QuestType } from "@/lib/types";

const QUEST_META: Record<QuestType, { titleKey: string; descKey: string }> = {
  ADD_PLAN: { titleKey: "play.questAddPlanTitle", descKey: "play.questAddPlanDesc" },
  COMPLETE_PLAN: { titleKey: "play.questCompletePlanTitle", descKey: "play.questCompletePlanDesc" },
  VISIT_SHOWCASE: { titleKey: "play.questVisitShowcaseTitle", descKey: "play.questVisitShowcaseDesc" },
};

export default function QuestsPage() {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);
  const patchUser = useAppStore((s) => s.patchUser);

  const { data, loading, error, reload, dismissError } = useAsyncData<Quest[]>(
    () => Api.todayQuests(),
    []
  );

  const quests = data ?? [];
  const completedCount = quests.filter((q) => q.completed).length;
  const allDone = quests.length > 0 && completedCount === quests.length;

  // Track which quests are currently being claimed (to disable button while in-flight).
  const [claiming, setClaiming] = useState<Set<QuestType>>(new Set());

  async function handleClaim(quest: Quest) {
    if (claiming.has(quest.quest_type)) return;
    setClaiming((prev) => new Set(prev).add(quest.quest_type));
    try {
      const result = await Api.claimQuest(quest.quest_type);
      // Update HUD balance immediately without a full /me round-trip.
      patchUser({ current_points: result.current_points });
      // Build toast message — show bonus separately if non-zero.
      const bonusPart =
        result.bonus_points > 0
          ? t("play.claimBonusLabel", { bonus: result.bonus_points })
          : "";
      pushToast(
        "success",
        t("play.claimToast", {
          title: t(QUEST_META[quest.quest_type].titleKey),
          p: result.reward_points,
          bonus: bonusPart,
        })
      );
      // Refresh quest list so `claimed` flag updates.
      reload();
    } catch (e) {
      pushToast("error", `${t("play.claimError")}: ${humanizeError(e)}`);
    } finally {
      setClaiming((prev) => {
        const next = new Set(prev);
        next.delete(quest.quest_type);
        return next;
      });
    }
  }

  // Auto-refresh: on window focus + every 20 seconds.
  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(reload, 20000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [reload]);

  // Track newly-completed quests — but do NOT show a reward toast here any more.
  // Rewards are only granted on claim, so we just silently refresh to update UI state.
  const prevCompleted = useRef<Set<QuestType> | null>(null);
  useEffect(() => {
    if (!data) return;
    const nowDone = new Set(data.filter((q) => q.completed).map((q) => q.quest_type));
    if (prevCompleted.current === null) {
      prevCompleted.current = nowDone; // skip toast on initial load
      return;
    }
    prevCompleted.current = nowDone;
    // No toast — user will see the "수령" button appear; reward comes only on explicit claim.
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ListChecks className="h-5 w-5 text-accent" />
        <h1 className="text-lg font-semibold">{t("play.questsTitle")}</h1>
        <button
          type="button"
          onClick={() => reload()}
          title={t("play.refresh")}
          className="ml-auto text-text-2 hover:text-text-1"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <span className="text-xs text-text-2">{t("play.resetNotice")}</span>
      </div>

      {error && <ErrorBanner message={error} onDismiss={dismissError} />}

      {loading && !data ? (
        <Spinner block label={t("play.questLoading")} />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-2">{t("play.completedCount", { n: completedCount })}</span>
            {allDone && (
              <span className="text-sm text-success inline-flex items-center gap-1">
                <Gift className="h-4 w-4" /> {t("play.allDoneBonus")}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quests.map((q) => {
              const meta = QUEST_META[q.quest_type];
              const isClaiming = claiming.has(q.quest_type);
              return (
                <div
                  key={q.quest_type}
                  className={`card flex flex-col gap-2 ${
                    q.claimed
                      ? "border-success/50"
                      : q.completed
                      ? "border-accent/50"
                      : ""
                  }`}
                >
                  <h2 className="font-semibold text-text-1">{t(meta.titleKey)}</h2>
                  <p className="text-xs text-text-2 flex-1">{t(meta.descKey)}</p>
                  <p className="text-sm font-semibold text-gold">
                    +{q.reward_points}C
                  </p>
                  <div className="pt-2 border-t border-border">
                    {/* State 3: completed AND claimed */}
                    {q.claimed ? (
                      <span className="text-sm text-success inline-flex items-center gap-1">
                        <Check className="h-4 w-4" /> {t("play.claimedLabel")}
                      </span>
                    ) : q.completed ? (
                      /* State 2: completed but NOT yet claimed — show Claim button */
                      <button
                        type="button"
                        disabled={isClaiming}
                        onClick={() => handleClaim(q)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isClaiming ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Star className="h-3.5 w-3.5" />
                        )}
                        {t("play.claimBtn")}
                      </button>
                    ) : (
                      /* State 1: not yet completed */
                      <span className="text-sm text-text-2 inline-flex items-center gap-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("play.inProgress")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card flex items-start gap-2">
            <Flame className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-text-2">{t("play.questHint")}</p>
          </div>
        </>
      )}
    </div>
  );
}
