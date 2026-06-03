"use client";

import { useState } from "react";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { ShopItem } from "@/lib/types";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useT } from "@/lib/i18n";
import ItemCard from "@/components/ItemCard";
import ErrorBanner from "@/components/ErrorBanner";
import Loading from "@/components/Loading";

export default function ShopPage() {
  const t = useT();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const pushToast = useAppStore((s) => s.pushToast);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: items, loading, error, dismissError } = useAsyncData<ShopItem[]>(
    () => Api.listShop(),
    []
  );
  const list = items ?? [];

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
      {loading ? (
        <Loading label={t("play.itemLoading")} />
      ) : list.length === 0 ? (
        <div className="text-text-2 text-sm">{t("play.shopEmpty")}</div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((it) => (
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
