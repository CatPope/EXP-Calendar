"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useT } from "@/lib/i18n";
import type { ShowcaseDetail } from "@/lib/types";
import TitleBadge from "@/components/TitleBadge";
import GrassGraph from "@/components/GrassGraph";
import CosmeticAvatar from "@/components/CosmeticAvatar";
import ErrorBanner from "@/components/ErrorBanner";
import Loading from "@/components/Loading";
import type { SkinId } from "@/lib/character";

export default function ShowcaseDetailPage() {
  const t = useT();
  const params = useParams<{ userId: string }>();
  const setUser = useAppStore((s) => s.setUser);
  const [grassOpen, setGrassOpen] = useState(false);

  const { data: detail, loading, error, dismissError } = useAsyncData<ShowcaseDetail>(
    () => Api.showcaseDetail(params.userId),
    [params.userId]
  );

  // Fire-and-forget quest completion + /me refresh after a successful load.
  useEffect(() => {
    if (!detail) return;
    let cancelled = false;
    (async () => {
      try {
        await Api.completeQuest("VISIT_SHOWCASE");
      } catch {
        /* non-fatal */
      }
      try {
        const me = await Api.me();
        if (!cancelled) setUser(me);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail, setUser]);

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={dismissError} />}
      {loading ? (
        <Loading />
      ) : !detail ? (
        <div className="text-text-2">{t("insights.userNotFound")}</div>
      ) : (
        <>
          {/* 프로필 카드: 정보만 */}
          <div className="card space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-accent/20 border border-accent/50 flex items-center justify-center font-bold text-accent text-lg">
                  {detail.level}
                </div>
                <div>
                  <h1 className="text-xl font-bold">{detail.display_name}</h1>
                  <div className="text-sm text-text-2">
                    Lv. {detail.level} · {t("insights.gradeLabel")} {detail.rating_grade}
                  </div>
                </div>
              </div>
              <TitleBadge title={detail.equipped_title} />
            </div>
            {detail.displayed_titles?.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2 border-t border-border">
                {detail.displayed_titles.map((t) => (
                  <TitleBadge key={t.id} title={t} />
                ))}
              </div>
            )}
          </div>

          {/* 캐릭터: 큰 비주얼 + 인게임 이름 + 대사 */}
          <div className="card flex flex-col items-center gap-3 py-6">
            <CosmeticAvatar
              level={detail.level}
              skin={(detail.character_skin as SkinId) || undefined}
              size={320}
              cosmetic={
                (detail as unknown as { active_cosmetic?: string }).active_cosmetic
              }
            />
            {(detail.persona_name || detail.status_message) && (
              <div className="text-center space-y-1">
                {detail.persona_name && (
                  <div className="text-base font-bold text-text-1">
                    {detail.persona_name}
                  </div>
                )}
                {detail.status_message && (
                  <div className="text-sm text-text-2 italic max-w-xs">
                    &ldquo;{detail.status_message}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>

          {detail.persona_showcase_text && (
            <div className="card space-y-2">
              <h2 className="text-sm font-semibold text-text-2">{t("insights.personaQuote")}</h2>
              <div className="text-text-1 whitespace-pre-wrap">{detail.persona_llm_output}</div>
              <div className="text-xs text-text-2 border-t border-border pt-2">
                {t("insights.originalText")}: {detail.persona_showcase_text}
              </div>
            </div>
          )}

          {/* 최근 1년 활동: 토글 */}
          <div className="card">
            <button
              type="button"
              onClick={() => setGrassOpen((o) => !o)}
              className="flex w-full items-center justify-between text-sm font-semibold text-text-2 hover:text-text-1 transition-colors"
              aria-expanded={grassOpen}
            >
              <span>{t("insights.recentYearActivity")}</span>
              {grassOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {grassOpen && (
              <div className="pt-3">
                <GrassGraph data={detail.grass || {}} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
