"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { ShowcaseDetail } from "@/lib/types";
import TitleBadge from "@/components/TitleBadge";
import GrassGraph from "@/components/GrassGraph";
import CharacterAvatar from "@/components/CharacterAvatar";
import ErrorBanner from "@/components/ErrorBanner";
import Loading from "@/components/Loading";

export default function ShowcaseDetailPage() {
  const params = useParams<{ userId: string }>();
  const setUser = useAppStore((s) => s.setUser);

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
          <div className="card space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <CharacterAvatar level={detail.level} size={96} withFrame />
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

          {detail.persona_showcase_text && (
            <div className="card space-y-2">
              <h2 className="text-sm font-semibold text-text-2">한마디 (페르소나 변환)</h2>
              <div className="text-text-1 whitespace-pre-wrap">{detail.persona_llm_output}</div>
              <div className="text-xs text-text-2 border-t border-border pt-2">
                원문: {detail.persona_showcase_text}
              </div>
            </div>
          )}

          <div className="card space-y-2">
            <h2 className="text-sm font-semibold text-text-2">최근 1년 활동</h2>
            <GrassGraph data={detail.grass || {}} />
          </div>
        </>
      )}
    </div>
  );
}
