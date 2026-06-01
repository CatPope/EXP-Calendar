"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Api } from "@/lib/api";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { ShowcaseSummary } from "@/lib/types";
import ShowcaseCard from "@/components/showcase/ShowcaseCard";
import PrivacyNotice from "@/components/showcase/PrivacyNotice";
import ErrorBanner from "@/components/ErrorBanner";
import Loading from "@/components/Loading";

export default function ShowcaseListPage() {
  const { data, loading, error, dismissError } = useAsyncData<ShowcaseSummary[]>(
    () => Api.listShowcase(),
    []
  );
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => u.display_name.toLowerCase().includes(q));
  }, [data, query]);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">쇼케이스</h1>
          <p className="mt-1 text-sm text-text-2">
            다른 유저의 공개 프로필 · 캐릭터·칭호·잔디·등급만 열람 (상세 일정/실패율 비공개)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSearch((s) => !s)}
          className="btn-ghost flex items-center gap-1 text-sm"
          aria-pressed={search}
        >
          유저 검색 <Search className="h-4 w-4" />
        </button>
      </div>

      {search && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="유저 이름으로 검색"
          className="input w-full sm:max-w-xs"
          autoFocus
        />
      )}

      {error && <ErrorBanner message={error} onDismiss={dismissError} />}

      {/* 서브 라인 */}
      <p className="text-xs text-text-2">
        친구 · 추천 유저 {(data ?? []).length}명 · 클릭하여 공개 프로필 열람
      </p>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="text-sm text-text-2">
          {query ? "검색 결과가 없습니다." : "표시할 사용자가 없습니다."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((u) => (
            <ShowcaseCard key={u.user_id} user={u} />
          ))}
        </div>
      )}

      {/* 🔒 비공개 항목 안내 */}
      <PrivacyNotice />
    </div>
  );
}
