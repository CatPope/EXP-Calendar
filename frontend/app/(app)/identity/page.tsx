"use client";

import Link from "next/link";
import { Sparkles, Crown, AlertTriangle } from "lucide-react";
import Spinner from "@/components/common/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import CharacterAvatar from "@/components/CharacterAvatar";
import TitleBadge from "@/components/TitleBadge";
import { Api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useT } from "@/lib/i18n";
import type { UserTitle, StatsSummary } from "@/lib/types";
import { skinById } from "@/lib/character";
import type { SkinId } from "@/lib/character";

export default function IdentityPage() {
  const t = useT();
  const user = useAppStore((s) => s.user);

  const {
    data: titles,
    loading: titlesLoading,
    error: titlesError,
    dismissError: dismissTitlesError,
  } = useAsyncData<UserTitle[]>(() => Api.myTitles(), []);

  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    dismissError: dismissSummaryError,
  } = useAsyncData<StatsSummary>(() => Api.statsSummary(), []);

  const activeTitles = (titles ?? []).filter(
    (ut) => ut.is_equipped || ut.is_displayed
  );

  // Find any active title with a penalty
  const penaltyTitle = activeTitles.find(
    (ut) => ut.negative_modifier && ut.negative_modifier.trim().length > 0
  );

  const skinId = (user?.character_skin as SkinId) || undefined;
  const skinDef = skinById(skinId);
  const level = user?.level ?? 1;

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            {t("identity.title")}
          </h1>
          <p className="text-sm text-text-2">{t("identity.subtitle")}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Link
            href="/identity/settings"
            className="btn-ghost text-sm inline-flex items-center gap-1"
          >
            ✎ {t("identity.edit")}
          </Link>
          {!titlesLoading && titles && (
            <span className="text-xs text-text-2">
              {t("identity.titlesCount", { n: titles.length })}
            </span>
          )}
        </div>
      </div>

      {/* Penalty Banner */}
      {penaltyTitle && (
        <div className="rounded-md border border-danger/50 bg-danger/10 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <span className="text-danger font-medium">
              ⚠ {t("identity.penaltyBanner", { name: penaltyTitle.title.name })}
            </span>
          </div>
          <Link
            href="/identity/settings"
            className="text-xs text-danger underline shrink-0"
          >
            {t("identity.recoverInSettings")} →
          </Link>
        </div>
      )}

      {summaryError && (
        <ErrorBanner message={summaryError} onDismiss={dismissSummaryError} />
      )}

      {/* MY IDENTITY card */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-text-2">{t("identity.myIdentity")}</h2>
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <CharacterAvatar level={level} skin={skinId} size={120} withFrame />
            <p className="text-xs text-text-2">
              {t("identity.skinLabel")}: {skinDef.label}
            </p>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-3 w-full">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-text-1">
                {user?.persona_name || user?.display_name || "—"}
              </span>
              <span className="text-sm font-semibold text-accent">
                Lv.{level}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {summaryLoading ? (
                <span className="text-xs text-text-2">{t("identity.loading")}</span>
              ) : summary ? (
                <span className="text-sm font-semibold">
                  {t("identity.ratingLabel")}{" "}
                  <span className="text-accent">
                    {summary.rating_grade?.toUpperCase() || "D"}
                  </span>
                </span>
              ) : null}
              {user?.equipped_title && (
                <TitleBadge title={user.equipped_title} />
              )}
            </div>

            {user?.persona_tone && (
              <div className="rounded bg-surface-2 border border-border px-3 py-2">
                <p className="text-[10px] text-text-2 mb-1">
                  {t("identity.toneLabel")}
                </p>
                <p className="text-sm text-text-1">{user.persona_tone}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Titles */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Crown className="h-4 w-4 text-gold" />
            {t("identity.activeTitlesSection")}
          </h2>
          <Link
            href="/identity/settings"
            className="text-xs text-accent hover:underline"
          >
            ♛ {t("identity.manageTitles")} →
          </Link>
        </div>

        {titlesError && (
          <ErrorBanner message={titlesError} onDismiss={dismissTitlesError} />
        )}

        {titlesLoading ? (
          <Spinner block label={t("identity.loading")} />
        ) : activeTitles.length === 0 ? (
          <p className="text-sm text-text-2 text-center py-2">
            {t("identity.noActiveTitles")}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeTitles.map((ut) => (
              <div
                key={ut.id}
                className={`rounded-md border px-3 py-2 space-y-1 ${
                  ut.is_equipped
                    ? "border-accent/50 bg-accent/5"
                    : "border-border bg-surface-2"
                }`}
              >
                <TitleBadge title={ut.title} modifier={ut.negative_modifier} />
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {ut.is_equipped && (
                    <span className="text-[10px] text-accent border border-accent/40 rounded px-1.5 py-0.5">
                      ⚔ {t("identity.equipped")}
                    </span>
                  )}
                  {ut.is_displayed && (
                    <span className="text-[10px] text-gold border border-gold/40 rounded px-1.5 py-0.5">
                      ★ {t("identity.displayed")}
                    </span>
                  )}
                  {ut.negative_modifier && (
                    <span className="text-[10px] text-danger border border-danger/40 rounded px-1.5 py-0.5">
                      ⚠ {t("identity.penalty")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History & Thoughts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold text-text-2">
            {t("identity.history")}
          </h2>
          {user?.persona_history ? (
            <p className="text-sm text-text-1 whitespace-pre-wrap">
              {user.persona_history}
            </p>
          ) : (
            <p className="text-sm text-text-2 italic">{t("identity.noHistory")}</p>
          )}
        </div>
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold text-text-2">
            {t("identity.thoughts")}
          </h2>
          {user?.persona_thoughts ? (
            <p className="text-sm text-text-1 whitespace-pre-wrap">
              {user.persona_thoughts}
            </p>
          ) : (
            <p className="text-sm text-text-2 italic">{t("identity.noThoughts")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
