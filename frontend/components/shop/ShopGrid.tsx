"use client";

import type { ShopItem } from "@/lib/types";
import ItemCard from "@/components/ItemCard";

interface Props {
  items: ShopItem[];
  currentPoints: number;
  busyId?: string | null;
  onPurchase: (item: ShopItem) => void;
}

export default function ShopGrid({ items, currentPoints, busyId, onPurchase }: Props) {
  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-text-2">
        해당 카테고리에 판매 중인 아이템이 없습니다.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <ItemCard
          key={it.id}
          item={it}
          cantAfford={currentPoints < it.price}
          busy={busyId === it.id}
          onPurchase={() => onPurchase(it)}
        />
      ))}
    </div>
  );
}
