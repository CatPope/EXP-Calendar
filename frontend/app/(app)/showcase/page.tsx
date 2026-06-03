"use client";

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
import { ChevronRight, User as UserIcon } from "lucide-react";
import type { SkinId } from "@/lib/character";

export default function ShowcaseListPage() {
  const t = useT();
  const user = useAppStore((s) => s.user);
  const { data, loading, error, dismissError } = useAsyncData<ShowcaseSummary[]>(
    () => Api.listShowcase(),
    []
  );
  const list = data ?? [];

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
      {error && <ErrorBanner message={error} onDismiss={dismissError} />}
      {loading ? (
        <Loading />
      ) : list.length === 0 ? (
        <div className="text-text-2 text-sm">{t("insights.noUsers")}</div>
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
                  <TitleBadge title={u.equipped_title} />
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
