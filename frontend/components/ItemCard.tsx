"use client";

import { Coins, ShoppingCart } from "lucide-react";
import type { ShopItem } from "@/lib/types";

interface Props {
  item: ShopItem;
  disabled?: boolean;
  onPurchase: () => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  CUSTOMIZE: "커스터마이즈",
  DEFENSE: "방어",
  PERSONA: "페르소나"
};

const CATEGORY_COLOR: Record<string, string> = {
  CUSTOMIZE: "text-accent border-accent/40",
  DEFENSE: "text-success border-success/40",
  PERSONA: "text-gold border-gold/40"
};

export default function ItemCard({ item, disabled, onPurchase }: Props) {
  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span
          className={`text-xs px-2 py-0.5 rounded border ${CATEGORY_COLOR[item.category] || ""}`}
        >
          {CATEGORY_LABEL[item.category] || item.category}
        </span>
        <span className="flex items-center gap-1 text-gold font-mono text-sm">
          <Coins className="h-4 w-4" /> {item.price}P
        </span>
      </div>
      <div className="font-semibold text-text-1">{item.name}</div>
      <div className="text-xs text-text-2 flex-1">{item.description}</div>
      <div className="text-[11px] text-success">{item.effect}</div>
      <button
        onClick={onPurchase}
        disabled={disabled}
        className="btn-primary flex items-center justify-center gap-1 disabled:opacity-50"
      >
        <ShoppingCart className="h-4 w-4" />
        구매
      </button>
    </div>
  );
}
