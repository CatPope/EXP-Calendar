"use client";

import { useMemo, useState } from "react";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { ItemCategory, ShopItem } from "@/lib/types";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import ShopGrid from "@/components/shop/ShopGrid";
import ErrorBanner from "@/components/ErrorBanner";
import Spinner from "@/components/common/Spinner";

// 와이어프레임(uxui_08)의 탭 라벨 — ItemCategory 로 매핑.
const TABS: { category: ItemCategory; label: string }[] = [
  { category: "CUSTOMIZE", label: "커스터마이징" },
  { category: "DEFENSE", label: "방어 아이템" },
  { category: "PERSONA", label: "페르소나" }
];

export default function ShopPage() {
  const user = useAppStore((s) => s.user);
  const patchUser = useAppStore((s) => s.patchUser);
  const pushToast = useAppStore((s) => s.pushToast);

  const [tab, setTab] = useState<ItemCategory>("CUSTOMIZE");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: items, loading, error, dismissError } = useAsyncData<ShopItem[]>(
    () => Api.listShop(),
    []
  );
  const filtered = useMemo(
    () => (items ?? []).filter((it) => it.category === tab),
    [items, tab]
  );

  const points = user?.current_points ?? 0;

  async function purchase(item: ShopItem) {
    if (points < item.price) {
      pushToast("error", "포인트가 부족합니다.");
      return;
    }
    setBusyId(item.id);
    try {
      const res = await Api.purchase(item.id);
      // HUD 갱신: 잔여 포인트 + (PERSONA 구매 시) 페르소나 캐릭터 반영.
      patchUser({
        current_points: res.remaining_points,
        ...(item.category === "PERSONA"
          ? { persona_character_type: item.effect || user?.persona_character_type }
          : {})
      });
      pushToast("success", `${item.name} 구매 완료!`);
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* 헤더: 타이틀 + 부제 + 보유 포인트 칩 */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-1">상점</h1>
          <p className="mt-1 text-sm text-text-2">
            포인트로 재화 구매 · 무료 재화 (유료 결제는 V2)
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-sm font-semibold text-gold">
          <span aria-hidden>◎</span>
          보유 {points.toLocaleString()} P
        </span>
      </header>

      {/* 카테고리 탭 (세그먼트) */}
      <div className="inline-flex rounded-lg border border-border bg-surface p-1">
        {TABS.map((t) => {
          const active = t.category === tab;
          return (
            <button
              key={t.category}
              onClick={() => setTab(t.category)}
              aria-pressed={active}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent text-white"
                  : "text-text-2 hover:text-text-1"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {error && <ErrorBanner message={error} onDismiss={dismissError} />}

      {loading ? (
        <Spinner block label="아이템 로딩 중..." />
      ) : (
        <ShopGrid
          items={filtered}
          currentPoints={points}
          busyId={busyId}
          onPurchase={purchase}
        />
      )}
    </div>
  );
}
