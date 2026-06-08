"use client";

import { useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useT } from "@/lib/i18n";
import type { ShowcaseSummary } from "@/lib/types";
import TitleBadge from "@/components/TitleBadge";
import CharacterAvatar from "@/components/CharacterAvatar";
import ErrorBanner from "@/components/ErrorBanner";
import Loading from "@/components/Loading";
import { ChevronRight, User as UserIcon, Search, X } from "lucide-react";
import type { SkinId } from "@/lib/character";

export default function ShowcaseListPage() {
  const t = useT();
  const user = useAppStore((s) => s.user);
  // `input` is the live text; `query` is the submitted search term used for fetching.
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const { data, loading, error, dismissError } = useAsyncData<ShowcaseSummary[]>(
    () => Api.listShowcase(query || undefined),
    [query]
  );
  const list = data ?? [];
  const searching = query.trim().length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setQuery(input.trim());
  }
  function clear() {
    setInput("");
    setQuery("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t("insights.showcaseListTitle")}</h1>
        {user && (
          <Link
            href={`/showcase/${user.id}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent/15 text-accent border border-accent/40 px-3 py-1.5 text-sm hover:bg-accent/25 transition-colors"
          >
            <UserIcon className="h-4 w-4" />{t("insights.myShowcase")}
          </Link>
        )}
      </div>

      {/* 사용자 이름 검색 (FR-SOC-04) */}
      <form onSubmit={submit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-2" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("insights.searchPlaceholder")}
            className="w-full rounded-md bg-surface-2 border border-border pl-9 pr-9 py-2 text-sm text-text-1 placeholder:text-text-2 focus:outline-none focus:border-accent"
          />
          {searching && (
            <button
              type="button"
              onClick={clear}
              title={t("insights.searchClear")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-2 hover:text-text-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/80 transition-colors"
        >
          {t("insights.searchBtn")}
        </button>
      </form>

      {error && <ErrorBanner message={error} onDismiss={dismissError} />}
      {loading ? (
        <Loading />
      ) : list.length === 0 ? (
        <div className="text-text-2 text-sm">
          {searching ? t("insights.searchEmpty") : t("insights.noUsers")}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((u) => (
            <Link
              key={u.user_id}
              href={`/showcase/${u.user_id}`}
              className="card hover:border-accent transition-colors flex items-center gap-3"
            >
              <CharacterAvatar
                level={u.level}
                skin={(u.character_skin as SkinId) || undefined}
                size={48}
                animated={false}
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{u.display_name}</div>
                <div className="text-xs text-text-2">Lv. {u.level}</div>
                <div className="mt-2">
                  <TitleBadge
                    title={u.equipped_title}
                    modifier={u.equipped_title?.negative_modifier}
                  />
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-text-2 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
