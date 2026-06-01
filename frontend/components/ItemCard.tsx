"use client";

import type { ShopItem } from "@/lib/types";
import Spinner from "@/components/common/Spinner";

interface Props {
  item: ShopItem;
  /** true이면 포인트 부족(구매 비활성 + 가격 강조 제거). */
  cantAfford?: boolean;
  /** 구매 진행 중(버튼 스피너). */
  busy?: boolean;
  onPurchase: () => void;
}

export default function ItemCard({ item, cantAfford, busy, onPurchase }: Props) {
  return (
    <div className="card flex flex-col gap-3">
      {/* 아이템 아트 플레이스홀더 (와이어프레임의 점선 박스) */}
      <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-border bg-surface-2">
        <span className="rounded border border-border bg-base px-2 py-0.5 text-[11px] text-text-2">
          item art
        </span>
      </div>

      {/* 이름 + 설명 */}
      <div className="text-center">
        <h3 className="font-semibold text-text-1">{item.name}</h3>
        <p className="mt-0.5 text-xs text-text-2">{item.description}</p>
        {item.effect && (
          <p className="mt-1 text-[11px] text-success">{item.effect}</p>
        )}
      </div>

      {/* 푸터: 가격 + 구매 버튼 */}
      <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
        <span
          className={`inline-flex items-center gap-1 font-mono text-sm ${
            cantAfford ? "text-text-2" : "text-gold"
          }`}
        >
          <span aria-hidden>◎</span>
          {item.price} P
        </span>
        <button
          onClick={onPurchase}
          disabled={cantAfford || busy}
          className="btn-primary px-4 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Spinner size={14} /> : cantAfford ? "포인트 부족" : "구매"}
        </button>
      </div>
    </div>
  );
}
