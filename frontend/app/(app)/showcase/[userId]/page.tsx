"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { ShowcaseDetail } from "@/lib/types";
import TitleBadge from "@/components/TitleBadge";
import GrassGraph from "@/components/GrassGraph";
import CharacterAvatar from "@/components/CharacterAvatar";
import ErrorBanner from "@/components/ErrorBanner";
import Loading from "@/components/Loading";
import type { SkinId } from "@/lib/character";

export default function ShowcaseDetailPage() {
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
        <div className="text-text-2">사용자를 찾을 수 없습니다.</div>
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
                    Lv. {detail.level} · 등급 {detail.rating_grade}
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

          {/* 캐릭터: 큰 비주얼 */}
          <div className="card flex justify-center py-6">
            <CharacterAvatar
              level={detail.level}
              skin={(detail.character_skin as SkinId) || undefined}
              size={320}
            />
          </div>

          {detail.persona_showcase_text && (
            <div className="card space-y-2">
              <h2 className="text-sm font-semibold text-text-2">한마디 (페르소나 변환)</h2>
              <div className="text-text-1 whitespace-pre-wrap">{detail.persona_llm_output}</div>
              <div className="text-xs text-text-2 border-t border-border pt-2">
                원문: {detail.persona_showcase_text}
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
              <span>최근 1년 활동</span>
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
