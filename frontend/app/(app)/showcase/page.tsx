"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, humanizeError } from "@/lib/api";
import type { ShowcaseSummary } from "@/lib/types";
import TitleBadge from "@/components/TitleBadge";
import ErrorBanner from "@/components/ErrorBanner";
import Loading from "@/components/Loading";
import { ChevronRight } from "lucide-react";

export default function ShowcaseListPage() {
  const [list, setList] = useState<ShowcaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<ShowcaseSummary[]>("/api/showcase");
        setList(data);
      } catch (e) {
        setErr(humanizeError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">다른 사용자 쇼케이스</h1>
      {err && <ErrorBanner message={err} onDismiss={() => setErr("")} />}
      {loading ? (
        <Loading />
      ) : list.length === 0 ? (
        <div className="text-text-2 text-sm">표시할 사용자가 없습니다.</div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((u) => (
            <Link
              key={u.user_id}
              href={`/showcase/${u.user_id}`}
              className="card hover:border-accent transition-colors flex items-center justify-between"
            >
              <div>
                <div className="font-semibold">{u.display_name}</div>
                <div className="text-xs text-text-2">Lv. {u.level}</div>
                <div className="mt-2">
                  <TitleBadge title={u.equipped_title} />
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-text-2" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
