"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { ShowcaseDetail, User } from "@/lib/types";
import TitleBadge from "@/components/TitleBadge";
import GrassGraph from "@/components/GrassGraph";
import ErrorBanner from "@/components/ErrorBanner";
import Loading from "@/components/Loading";

export default function ShowcaseDetailPage() {
  const params = useParams<{ userId: string }>();
  const setUser = useAppStore((s) => s.setUser);
  const [detail, setDetail] = useState<ShowcaseDetail | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<ShowcaseDetail>(`/api/showcase/${params.userId}`);
        setDetail(data);
        try {
          await apiFetch("/api/quests/VISIT_SHOWCASE/complete", { method: "POST" });
        } catch {}
        try {
          const me = await apiFetch<User>("/api/me");
          setUser(me);
        } catch {}
      } catch (e) {
        setErr(humanizeError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [params.userId, setUser]);

  return (
    <div className="space-y-4">
      {err && <ErrorBanner message={err} onDismiss={() => setErr("")} />}
      {loading ? (
        <Loading />
      ) : !detail ? (
        <div className="text-text-2">사용자를 찾을 수 없습니다.</div>
      ) : (
        <>
          <div className="card space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-xl font-bold">{detail.display_name}</h1>
                <div className="text-sm text-text-2">
                  Lv. {detail.level} · 등급 {detail.rating_grade}
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
