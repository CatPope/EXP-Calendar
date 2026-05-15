"use client";

import { useEffect, useState } from "react";
import { apiFetch, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { ShopItem, User } from "@/lib/types";
import ItemCard from "@/components/ItemCard";
import ErrorBanner from "@/components/ErrorBanner";
import Loading from "@/components/Loading";

export default function ShopPage() {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const pushToast = useAppStore((s) => s.pushToast);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await apiFetch<ShopItem[]>("/api/shop/items");
        setItems(list);
      } catch (e) {
        setErr(humanizeError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function purchase(item: ShopItem) {
    setBusyId(item.id);
    try {
      const res = await apiFetch<{ remaining_points: number }>("/api/shop/purchase", {
        method: "POST",
        body: JSON.stringify({ item_id: item.id })
      });
      if (user) setUser({ ...user, current_points: res.remaining_points });
      pushToast("success", `${item.name} 구매 완료!`);
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">상점</h1>
      {err && <ErrorBanner message={err} onDismiss={() => setErr("")} />}
      {loading ? (
        <Loading label="아이템 로딩 중..." />
      ) : items.length === 0 ? (
        <div className="text-text-2 text-sm">판매 중인 아이템이 없습니다.</div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
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
