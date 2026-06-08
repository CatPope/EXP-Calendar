"use client";

import Link from "next/link";
import { useState } from "react";
import { Star, ChevronRight } from "lucide-react";
import Spinner from "@/components/common/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import CharacterAvatar from "@/components/CharacterAvatar";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useT } from "@/lib/i18n";
import type { GachaCharacter, OwnedCharacter } from "@/lib/types";
import type { SkinId } from "@/lib/character";

type Rarity = GachaCharacter["rarity"];

const RARITY_COLOR: Record<Rarity, string> = {
  COMMON: "#8B949E",
  RARE: "#8B5CF6",
  EPIC: "#FFD700",
  LEGENDARY: "#FF6B6B",
};

const RARITY_ORDER: Rarity[] = ["LEGENDARY", "EPIC", "RARE", "COMMON"];

export default function CharacterPage() {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);
  const setUser = useAppStore((s) => s.setUser);

  const {
    data: collection,
    loading,
    error,
    reload,
    dismissError,
  } = useAsyncData<{ catalog: GachaCharacter[]; owned: OwnedCharacter[] }>(
    () => Api.summonCollection(),
    []
  );

  const [busyId, setBusyId] = useState<string | null>(null);

  async function equip(id: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      await Api.summonEquip(id);
      pushToast("success", t("character.equipDone"));
      reload();
      try {
        const me = await Api.me();
        setUser(me);
      } catch {
        /* non-fatal */
      }
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setBusyId(null);
    }
  }

  const ownedById = new Map<string, OwnedCharacter>(
    (collection?.owned ?? []).map((o) => [o.id, o])
  );

  const ownedCatalog = [...(collection?.catalog ?? [])]
    .filter((c) => ownedById.has(c.id))
    .sort(
      (a, b) =>
        RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
    );

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-gold" />
        <h1 className="text-lg font-semibold">
          {t("character.customizeTitle")}
        </h1>
      </div>
      <p className="text-xs text-text-2 -mt-2">
        {t("character.customizeSubtitle")}
      </p>

      {error && <ErrorBanner message={error} onDismiss={dismissError} />}

      {loading ? (
        <Spinner block label={t("character.loadingCollection")} />
      ) : ownedCatalog.length === 0 ? (
        <div className="card text-center space-y-3 py-8">
          <p className="text-sm text-text-2">{t("character.ownedEmpty")}</p>
          <Link
            href="/summon"
            className="btn-primary inline-flex items-center gap-1 text-sm"
          >
            {t("character.goToSummon")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {ownedCatalog.map((c) => {
            const owned = ownedById.get(c.id)!;
            const color = RARITY_COLOR[c.rarity];
            const isEquipped = owned.equipped;
            return (
              <div
                key={c.id}
                className={`flex flex-col items-center gap-2 rounded-md p-3 border ${
                  isEquipped
                    ? "border-accent/60 bg-accent/5 shadow shadow-accent/10"
                    : "border-border bg-surface-2"
                }`}
              >
                <CharacterAvatar
                  level={1}
                  skin={c.sprite_key as SkinId}
                  size={72}
                  animated={false}
                />
                <span className="text-xs text-text-1 text-center truncate w-full">
                  {c.name}
                </span>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color }}
                >
                  {t("character.rarityCount", {
                    rarity: c.rarity,
                    n: owned.count,
                  })}
                </span>
                {isEquipped ? (
                  <span className="text-[10px] text-accent inline-flex items-center gap-0.5">
                    <Star className="h-3 w-3" /> {t("character.equipped")}
                  </span>
                ) : (
                  <button
                    disabled={busyId !== null}
                    onClick={() => equip(c.id)}
                    className="text-xs rounded-md px-3 py-1 bg-accent text-white hover:opacity-90 disabled:opacity-50 w-full"
                  >
                    {t("character.equip")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="card text-xs text-text-2 flex items-center justify-between">
        <span>{t("character.gotoSummonHint")}</span>
        <Link
          href="/summon"
          className="text-accent hover:underline inline-flex items-center gap-1"
        >
          {t("character.goToSummon")} <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
