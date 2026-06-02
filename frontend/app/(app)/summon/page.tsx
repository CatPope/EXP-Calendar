"use client";

import { useState } from "react";
import { Gift, Sparkles, Ticket, Star } from "lucide-react";
import Spinner from "@/components/common/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import CharacterAvatar from "@/components/CharacterAvatar";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type {
  GachaCharacter,
  OwnedCharacter,
  SummonInfo,
  SummonResult,
} from "@/lib/types";
import type { SkinId } from "@/lib/character";

type Rarity = GachaCharacter["rarity"];

const RARITY_COLOR: Record<Rarity, string> = {
  COMMON: "#8B949E",
  RARE: "#8B5CF6",
  EPIC: "#FFD700",
  LEGENDARY: "#FF6B6B",
};

const RARITY_ORDER: Rarity[] = ["LEGENDARY", "EPIC", "RARE", "COMMON"];

function pct(v: number): string {
  // multiply by 100, drop trailing zeros
  const n = v * 100;
  return parseFloat(n.toFixed(2)).toString();
}

type CostType = "POINTS" | "TICKET";

export default function SummonPage() {
  const pushToast = useAppStore((s) => s.pushToast);
  const setUser = useAppStore((s) => s.setUser);

  const {
    data: info,
    loading: infoLoading,
    error: infoError,
    reload: reloadInfo,
    dismissError: dismissInfoError,
  } = useAsyncData<SummonInfo>(() => Api.summonInfo(), []);

  const {
    data: collection,
    loading: colLoading,
    error: colError,
    reload: reloadCollection,
    dismissError: dismissColError,
  } = useAsyncData<{ catalog: GachaCharacter[]; owned: OwnedCharacter[] }>(
    () => Api.summonCollection(),
    []
  );

  const [costType, setCostType] = useState<CostType>("POINTS");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SummonResult | null>(null);

  async function refreshUser() {
    try {
      const me = await Api.me();
      setUser(me);
    } catch {
      /* non-fatal */
    }
  }

  async function doDraw(count: 1 | 10) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await Api.summonDraw(count, costType);
      setResult(res);
      const legend = res.draws.filter((d) => d.character.rarity === "LEGENDARY");
      if (legend.length > 0) {
        pushToast("success", `LEGENDARY ${legend.length}개 획득!`);
      } else {
        pushToast("info", `${res.draws.length}회 소환 완료`);
      }
      reloadInfo();
      reloadCollection();
      refreshUser();
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function buyTicket() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await Api.buyTickets(1);
      pushToast("success", `소환권 구매 완료 (보유 ${res.tickets}장)`);
      reloadInfo();
      refreshUser();
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function equip(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      await Api.summonEquip(id);
      pushToast("success", "캐릭터를 장착했습니다.");
      reloadCollection();
      refreshUser();
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setBusy(false);
    }
  }

  const ownedById = new Map<string, OwnedCharacter>(
    (collection?.owned ?? []).map((o) => [o.id, o])
  );

  const catalog = [...(collection?.catalog ?? [])].sort(
    (a, b) =>
      RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
  );

  const spentLabel = result
    ? result.spent_tickets > 0
      ? `${result.spent_tickets}티켓`
      : `${result.spent_points}P`
    : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-accent" />
        <h1 className="text-lg font-semibold">소환 · 도감</h1>
      </div>

      {infoError && (
        <ErrorBanner message={infoError} onDismiss={dismissInfoError} />
      )}

      {/* BANNER / PITY */}
      {infoLoading ? (
        <Spinner block label="소환 정보 불러오는 중..." />
      ) : info ? (
        <div className="card space-y-4">
          <div className="flex items-center gap-2 text-gold">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold">
              픽업 배너 — LEGENDARY 확률 2배!
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-text-2">
              <span>
                천장 {info.pity_counter}/{info.pity_threshold}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{
                  width: `${
                    info.pity_threshold > 0
                      ? Math.min(
                          100,
                          (info.pity_counter / info.pity_threshold) * 100
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-gold font-semibold">
              {info.points.toLocaleString()} P
            </span>
            <span className="inline-flex items-center gap-1 text-text-1">
              <Ticket className="h-4 w-4 text-accent" />
              {info.tickets}장
            </span>
          </div>
        </div>
      ) : null}

      {/* RATE TABLE */}
      {info && (
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold text-text-1">픽업 확률</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {RARITY_ORDER.map((r) => {
              const rate = info.pickup_rates?.[r];
              if (rate == null) return null;
              return (
                <li
                  key={r}
                  className="rounded-md bg-surface-2 border border-border px-3 py-2 text-xs font-semibold"
                  style={{ color: RARITY_COLOR[r] }}
                >
                  {r} {pct(rate)}%
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* SUMMON ACTIONS */}
      {info && (
        <div className="card space-y-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCostType("POINTS")}
              className={`text-xs rounded-full px-3 py-1 transition-colors ${
                costType === "POINTS"
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-text-2 hover:bg-border"
              }`}
            >
              포인트
            </button>
            <button
              onClick={() => setCostType("TICKET")}
              className={`text-xs rounded-full px-3 py-1 transition-colors ${
                costType === "TICKET"
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-text-2 hover:bg-border"
              }`}
            >
              소환권
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              disabled={busy}
              onClick={() => doDraw(1)}
              className="rounded-md py-2 text-sm font-semibold bg-surface-2 text-text-1 hover:bg-border disabled:opacity-50"
            >
              단차 소환 ({info.cost_single}P 또는 1티켓)
            </button>
            <button
              disabled={busy}
              onClick={() => doDraw(10)}
              className="rounded-md py-2 text-sm font-semibold bg-accent text-white hover:opacity-90 disabled:opacity-50"
            >
              10연차 소환 ({info.cost_multi}P 또는 {info.multi_count}티켓)
            </button>
          </div>

          <button
            disabled={busy}
            onClick={buyTicket}
            className="text-xs rounded-md py-1.5 px-3 bg-surface-2 text-text-2 hover:bg-border inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Ticket className="h-3.5 w-3.5" /> 소환권 구매 ({info.ticket_price}
            P/개)
          </button>
        </div>
      )}

      {/* RESULT */}
      {result && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-1">소환 결과</h2>
            <span className="text-xs text-text-2">
              {spentLabel} 소비 · {" "}
              <span className="text-gold">
                {result.refunded_points}P 환급
              </span>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {result.draws.map((d, i) => {
              const color = RARITY_COLOR[d.character.rarity];
              return (
                <div
                  key={`${d.character.id}-${i}`}
                  className="flex flex-col items-center gap-1 rounded-md bg-surface-2 p-2 border"
                  style={{ borderColor: color }}
                >
                  <CharacterAvatar
                    level={1}
                    skin={d.character.sprite_key as SkinId}
                    size={56}
                    animated={false}
                  />
                  <span className="text-[11px] text-text-1 text-center truncate w-full">
                    {d.character.name}
                  </span>
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color }}
                  >
                    {d.character.rarity}
                  </span>
                  {d.is_new ? (
                    <span className="text-[10px] font-bold text-accent">
                      NEW
                    </span>
                  ) : (
                    <span className="text-[10px] text-gold">
                      +{d.refund_points}P 환급
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* COLLECTION */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-gold" />
          <h2 className="text-sm font-semibold text-text-1">도감</h2>
        </div>

        {colError && (
          <ErrorBanner message={colError} onDismiss={dismissColError} />
        )}

        {colLoading ? (
          <Spinner block label="도감 불러오는 중..." />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {catalog.map((c) => {
              const owned = ownedById.get(c.id);
              const color = RARITY_COLOR[c.rarity];
              if (!owned) {
                return (
                  <div
                    key={c.id}
                    className="flex flex-col items-center gap-1 rounded-md bg-surface-2 p-2 border border-border opacity-40"
                  >
                    <div className="flex items-center justify-center h-[56px] w-[56px] text-2xl text-text-2">
                      ?
                    </div>
                    <span className="text-[11px] text-text-2">???</span>
                  </div>
                );
              }
              return (
                <div
                  key={c.id}
                  className="flex flex-col items-center gap-1 rounded-md bg-surface-2 p-2 border"
                  style={{ borderColor: color }}
                >
                  <CharacterAvatar
                    level={1}
                    skin={c.sprite_key as SkinId}
                    size={56}
                    animated={false}
                  />
                  <span className="text-[11px] text-text-1 text-center truncate w-full">
                    {c.name}
                  </span>
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color }}
                  >
                    {c.rarity} x{owned.count}
                  </span>
                  {owned.equipped ? (
                    <span className="text-[10px] text-accent inline-flex items-center gap-0.5">
                      <Star className="h-3 w-3" /> 장착중
                    </span>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() => equip(c.id)}
                      className="text-[10px] rounded px-2 py-0.5 bg-accent text-white hover:opacity-90 disabled:opacity-50"
                    >
                      장착
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
