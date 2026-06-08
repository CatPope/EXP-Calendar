"use client";

import { useState } from "react";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { ShopItem, ItemCategory } from "@/lib/types";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useT } from "@/lib/i18n";
import ItemCard from "@/components/ItemCard";
import ErrorBanner from "@/components/ErrorBanner";
import Loading from "@/components/Loading";

const CATEGORIES: { key: ItemCategory; labelKey: string }[] = [
  { key: "CUSTOMIZE", labelKey: "play.catCustomize" },
  { key: "DEFENSE", labelKey: "play.catDefense" },
  { key: "PERSONA", labelKey: "play.catPersona" },
  { key: "SUMMON", labelKey: "play.catSummon" },
];

export default function ShopPage() {
  const t = useT();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const pushToast = useAppStore((s) => s.pushToast);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<ItemCategory>("CUSTOMIZE");

  const { data: items, loading, error, dismissError } = useAsyncData<ShopItem[]>(
    () => Api.listShop(),
    []
  );
  const list = items ?? [];
  const filtered = list.filter((it) => it.category === activeCategory);

  async function purchase(item: ShopItem) {
    setBusyId(item.id);
    try {
      const res = await Api.purchase(item.id);
      if (user) setUser({ ...user, current_points: res.remaining_points });
      pushToast("success", t("play.purchaseToast", { name: item.name }));
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("play.shopTitle")}</h1>
      {error && <ErrorBanner message={error} onDismiss={dismissError} />}

      {/* Category tab bar */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(({ key, labelKey }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveCategory(key)}
            aria-pressed={activeCategory === key}
            className={`text-xs rounded-md px-3 py-1.5 border transition-colors ${
              activeCategory === key
                ? "bg-accent text-white border-accent"
                : "bg-surface-2 text-text-1 border-border hover:border-accent/50"
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading label={t("play.itemLoading")} />
      ) : filtered.length === 0 ? (
        <div className="text-text-2 text-sm">{t("play.shopEmpty")}</div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((it) => (
            <ItemCard
              key={it.id}
              item={it}
              disabled={busyId === it.id || (user ? user.current_points < it.price : false)}
              onPurchase={() => purchase(it)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
