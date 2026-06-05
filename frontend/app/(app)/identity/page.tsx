"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Crown, AlertTriangle, Wand2, Send, Palette } from "lucide-react";
import Spinner from "@/components/common/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import CosmeticAvatar from "@/components/CosmeticAvatar";
import TitleBadge from "@/components/TitleBadge";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useT } from "@/lib/i18n";
import type { UserTitle, StatsSummary } from "@/lib/types";
import { skinById } from "@/lib/character";
import type { SkinId } from "@/lib/character";

export default function IdentityPage() {
  const t = useT();
  const user = useAppStore((s) => s.user);
  const pushToast = useAppStore((s) => s.pushToast);

  // AI 페르소나 한마디 (변환 → 쇼케이스 게시)
  // 게시는 항상 "직전 변환 결과"를 그대로 올린다. 변환을 한 적이 없거나,
  // 변환 이후 입력 텍스트가 바뀐 경우엔 경고만 띄우고 중단한다.
  const [voice, setVoice] = useState("");
  const [genResult, setGenResult] = useState<string | null>(null);
  const [convertedFor, setConvertedFor] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState(false);

  async function doGenerate() {
    const text = voice.trim();
    if (!text) return;
    setGenerating(true);
    try {
      const r = await Api.generatePersona(text);
      setGenResult(r.llm_output);
      setConvertedFor(text);
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setGenerating(false);
    }
  }

  async function doPost() {
    const text = voice.trim();
    if (!text) return;
    // 변환 결과가 없거나, 변환 이후 입력이 바뀌었으면 게시하지 않고 안내.
    if (!genResult || convertedFor !== text) {
      pushToast("error", t("identity.aiNeedConvert"));
      return;
    }
    setPosting(true);
    try {
      const r = await Api.postShowcase(text, genResult);
      setGenResult(r.llm_output);
      pushToast("success", t("identity.aiPostSuccess"));
      // 게시 시 백엔드가 status_message("나의 한마디")도 같이 갱신하므로
      // 프로필 레일/통계 화면이 즉시 반영되도록 /me 를 다시 받아 store 갱신.
      try {
        const me = await Api.me();
        useAppStore.getState().setUser(me);
      } catch {
        /* non-fatal */
      }
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setPosting(false);
    }
  }

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
          {/* Avatar — 캐릭터 박스/버튼 모두 /character (스킨 변경) 진입점 */}
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/character"
              className="block group"
              aria-label={t("identity.changeSkin")}
            >
              <div className="transition-transform group-hover:scale-[1.02]">
                <CosmeticAvatar
                  level={level}
                  skin={skinId}
                  size={120}
                  withFrame
                  cosmetic={user?.active_cosmetic}
                />
              </div>
            </Link>
            <p className="text-xs text-text-2">
              {t("identity.skinLabel")}: {skinDef.label}
            </p>
            <Link
              href="/character"
              className="inline-flex items-center gap-1 text-xs btn-ghost"
            >
              <Palette className="h-3.5 w-3.5" /> {t("identity.changeSkin")}
            </Link>
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

      {/* AI 페르소나 한마디 — 입력 텍스트를 캐릭터 말투로 변환해 쇼케이스에 게시 */}
      <div className="card space-y-3">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-accent" /> {t("identity.aiTitle")}
          </h2>
          <p className="text-xs text-text-2">{t("identity.aiDesc")}</p>
        </div>
        <textarea
          value={voice}
          onChange={(e) => setVoice(e.target.value.slice(0, 300))}
          placeholder={t("identity.aiPlaceholder")}
          rows={3}
          className="w-full rounded-md bg-surface-2 border border-border px-3 py-2 text-sm text-text-1 resize-none"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-text-2">
            {t("identity.aiCounter", { n: voice.length })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={doGenerate}
              disabled={generating || !voice.trim()}
              className="text-xs rounded-md px-3 py-1.5 bg-surface-2 border border-border text-text-1 hover:border-accent/50 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Wand2 className="h-3.5 w-3.5" />
              {generating ? t("identity.converting") : t("identity.convert")}
            </button>
            <button
              type="button"
              onClick={doPost}
              disabled={posting || !voice.trim()}
              className="text-xs rounded-md px-3 py-1.5 bg-accent text-white hover:bg-accent/80 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {posting ? t("identity.posting") : t("identity.postShowcase")}
            </button>
          </div>
        </div>
        {genResult && (
          <div className="rounded-md border border-accent/30 bg-accent/5 p-3">
            <div className="text-[10px] text-text-2 mb-1">
              {t("identity.resultTitle")}
            </div>
            <p className="text-sm text-text-1 whitespace-pre-wrap">{genResult}</p>
          </div>
        )}
      </div>
    </div>
  );
}
