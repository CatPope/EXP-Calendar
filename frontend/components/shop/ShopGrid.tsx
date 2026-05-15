"use client";

import { Coins } from "lucide-react";
import type { ShopItem } from "@/lib/types";
import { CATEGORY_LABEL } from "@/lib/game";
import Button from "@/components/common/Button";

interface Props {
  items: ShopItem[];
  currentPoints: number;
  busyId?: string | null;
  onPurchase: (item: ShopItem) => void;
}

const CATEGORY_COLOR: Record<string, string> = {
  CUSTOMIZE: "text-success border-success/40 bg-success/10",
  DEFENSE: "text-accent border-accent/40 bg-accent/10",
  PERSONA: "text-gold border-gold/40 bg-gold/10"
};

export default function ShopGrid({ items, currentPoints, busyId, onPurchase }: Props) {
  if (items.length === 0) {
    return <p className="text-text-2 text-sm">상점에 아이템이 없습니다.</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((it) => {
        const cantAfford = currentPoints < it.price;
        return (
          <div key={it.id} className="card flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{it.name}</h3>
              <span
                className={`text-[10px] rounded border px-1.5 py-0.5 ${
                  CATEGORY_COLOR[it.category] || ""
                }`}
              >
                {CATEGORY_LABEL[it.category] || it.category}
              </span>
            </div>
            <p className="text-xs text-text-2 leading-relaxed">{it.description}</p>
            {it.effect && (
              <p className="text-xs text-accent leading-relaxed">효과: {it.effect}</p>
            )}
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
              <span className="inline-flex items-center gap-1 text-gold font-mono">
                <Coins className="h-3.5 w-3.5" /> {it.price}
              </span>
              <Button
                size="sm"
                variant={cantAfford ? "ghost" : "primary"}
                disabled={cantAfford}
                loading={busyId === it.id}
                onClick={() => onPurchase(it)}
              >
                {cantAfford ? "포인트 부족" : "구매"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
