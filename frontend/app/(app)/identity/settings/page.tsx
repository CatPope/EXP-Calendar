"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, Crown, Shield, Info, Lock } from "lucide-react";
import Spinner from "@/components/common/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import CosmeticAvatar from "@/components/CosmeticAvatar";
import { cosmeticById, ALL_COSMETIC_IDS } from "@/lib/cosmetics";
import { Api, humanizeError } from "@/lib/api";
import TitleBadge from "@/components/TitleBadge";
import { useAppStore } from "@/lib/store";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useT } from "@/lib/i18n";
import type { TitleCatalogEntry, UserTitle } from "@/lib/types";
import { skinById } from "@/lib/character";
import type { SkinId } from "@/lib/character";

export default function IdentitySettingsPage() {
  const t = useT();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const pushToast = useAppStore((s) => s.pushToast);

  // -- Persona form state (initialized from user) --
  const [personaName, setPersonaName] = useState(user?.persona_name ?? "");
  const [personaTone, setPersonaTone] = useState(user?.persona_tone ?? "");
  const [personaHistory, setPersonaHistory] = useState(user?.persona_history ?? "");
  const [personaThoughts, setPersonaThoughts] = useState(user?.persona_thoughts ?? "");
  const [saving, setSaving] = useState(false);

  // -- Titles: fetch myTitles for user_title ids (needed by patchTitle equip endpoint)
  //    and allTitles for the full catalog including locked entries --
  const [busyId, setBusyId] = useState<string | null>(null);

  const {
    data: myTitles,
    loading: myTitlesLoading,
    error: myTitlesError,
    dismissError: dismissMyTitlesError,
    reload: reloadMyTitles,
  } = useAsyncData<UserTitle[]>(() => Api.myTitles(), []);

  const {
    data: catalogEntries,
    loading: catalogLoading,
    error: catalogError,
    dismissError: dismissCatalogError,
    reload: reloadCatalog,
  } = useAsyncData<TitleCatalogEntry[]>(() => Api.allTitles(), []);

  // Local overrides for owned-title toggle state (optimistic updates).
  // Map: master title id → { is_equipped, is_displayed, negative_modifier }
  const [ownedOverrides, setOwnedOverrides] = useState<
    Map<string, Pick<UserTitle, "is_equipped" | "is_displayed" | "negative_modifier">>
  >(new Map());

  // Build a lookup map: master title id → UserTitle (for equip/display actions).
  const masterToUserTitle = useMemo<Map<string, UserTitle>>(() => {
    const m = new Map<string, UserTitle>();
    for (const ut of myTitles ?? []) {
      m.set(ut.title.id, ut);
    }
    return m;
  }, [myTitles]);

  // -- Cosmetics --
  const [cosmeticBusy, setCosmeticBusy] = useState(false);

  async function handleEquipCosmetic(effect: string) {
    setCosmeticBusy(true);
    try {
      const updated = await Api.setCosmetic(effect);
      setUser(updated);
      pushToast("success", t("identity.cosmeticEquip"));
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setCosmeticBusy(false);
    }
  }

  async function handleUnequipCosmetic() {
    setCosmeticBusy(true);
    try {
      const updated = await Api.setCosmetic("");
      setUser(updated);
      pushToast("success", t("identity.cosmeticUnequip"));
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setCosmeticBusy(false);
    }
  }

  // -- Defense ticket --
  const [defenseLoading, setDefenseLoading] = useState(false);

  const skinId = (user?.character_skin as SkinId) || undefined;
  const skinDef = skinById(skinId);
  const level = user?.level ?? 1;
  const defenseTickets = user?.defense_tickets ?? 0;

  const titlesLoading = myTitlesLoading || catalogLoading;
  const titlesError = myTitlesError || catalogError;

  function dismissTitlesError() {
    dismissMyTitlesError();
    dismissCatalogError();
  }

  function resetPersonaForm() {
    setPersonaName(user?.persona_name ?? "");
    setPersonaTone(user?.persona_tone ?? "");
    setPersonaHistory(user?.persona_history ?? "");
    setPersonaThoughts(user?.persona_thoughts ?? "");
  }

  async function savePersona() {
    setSaving(true);
    try {
      const updated = await Api.updatePersona({
        persona_name: personaName,
        persona_tone: personaTone,
        persona_history: personaHistory,
        persona_thoughts: personaThoughts,
      });
      setUser(updated);
      pushToast("success", t("identity.saveSuccess"));
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setSaving(false);
    }
  }

  // Resolve effective state for a catalog entry (apply local overrides).
  function effectiveOwned(entry: TitleCatalogEntry): {
    is_equipped: boolean;
    is_displayed: boolean;
    negative_modifier: string | null;
  } {
    const override = ownedOverrides.get(entry.title.id);
    if (override) return override;
    return {
      is_equipped: entry.is_equipped,
      is_displayed: entry.is_displayed,
      negative_modifier: entry.negative_modifier,
    };
  }

  async function toggleEquip(entry: TitleCatalogEntry) {
    // Resolve the user_title id (patchTitle expects user_title.id, not master title id).
    const ut = masterToUserTitle.get(entry.title.id);
    if (!ut) return;
    const nextEquipped = !effectiveOwned(entry).is_equipped;
    setBusyId(ut.id);
    try {
      await Api.patchTitle(ut.id, { is_equipped: nextEquipped });
      // Optimistic: when equipping, unequip all others; when unequipping just flip this one.
      setOwnedOverrides((cur) => {
        const next = new Map(cur);
        if (nextEquipped) {
          // Unequip all other owned entries.
          for (const [masterId, state] of next) {
            if (masterId !== entry.title.id) {
              next.set(masterId, { ...state, is_equipped: false });
            }
          }
          // Also mark any currently equipped catalog entry as unequipped.
          for (const e of catalogEntries ?? []) {
            if (e.owned && e.title.id !== entry.title.id && !next.has(e.title.id)) {
              next.set(e.title.id, {
                is_equipped: false,
                is_displayed: e.is_displayed,
                negative_modifier: e.negative_modifier,
              });
            }
          }
        }
        const cur2 = next.get(entry.title.id) ?? {
          is_equipped: entry.is_equipped,
          is_displayed: entry.is_displayed,
          negative_modifier: entry.negative_modifier,
        };
        next.set(entry.title.id, { ...cur2, is_equipped: nextEquipped });
        return next;
      });
      pushToast("success", nextEquipped ? t("identity.equip") : t("identity.unequip"));
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

  async function toggleDisplay(entry: TitleCatalogEntry) {
    const ut = masterToUserTitle.get(entry.title.id);
    if (!ut) return;
    const nextDisplayed = !effectiveOwned(entry).is_displayed;
    setBusyId(ut.id);
    try {
      await Api.patchTitle(ut.id, { is_displayed: nextDisplayed });
      setOwnedOverrides((cur) => {
        const next = new Map(cur);
        const cur2 = next.get(entry.title.id) ?? {
          is_equipped: entry.is_equipped,
          is_displayed: entry.is_displayed,
          negative_modifier: entry.negative_modifier,
        };
        next.set(entry.title.id, { ...cur2, is_displayed: nextDisplayed });
        return next;
      });
      pushToast(
        "success",
        nextDisplayed ? t("identity.display") : t("identity.undisplay")
      );
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleUseDefense() {
    setDefenseLoading(true);
    try {
      const res = await Api.redeemDefenseTicket();
      const me = await Api.me();
      setUser(me);
      // Reload both lists and clear local overrides.
      reloadMyTitles();
      reloadCatalog();
      setOwnedOverrides(new Map());
      pushToast(
        res.cleared ? "success" : "info",
        res.cleared ? t("identity.defenseSuccess") : t("identity.defensePartial")
      );
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setDefenseLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/identity" className="text-sm text-text-2 hover:text-text-1">
          {t("identity.back")}
        </Link>
        <span className="text-text-2">/</span>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          {t("identity.settingsTitle")}
        </h1>
      </div>

      {/* Skin Section */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          {t("identity.skinSection")}
        </h2>
        <div className="flex items-center gap-5">
          <CosmeticAvatar level={level} skin={skinId} size={96} withFrame cosmetic={user?.active_cosmetic} />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-text-1">{skinDef.label}</p>
            <Link
              href="/character"
              className="inline-flex items-center gap-1 text-xs btn-ghost"
            >
              ◈ {t("identity.changeSkin")} →
            </Link>
            <p className="text-xs text-text-2">{t("identity.skinNote")}</p>
          </div>
        </div>
      </div>

      {/* Cosmetics Section */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          ✨ {t("identity.cosmeticSection")}
        </h2>

        {(() => {
          const ownedCosmetics = (user?.purchased_cosmetics ?? []).filter(
            (id) => ALL_COSMETIC_IDS.includes(id)
          );
          const activeCosmetic = user?.active_cosmetic ?? "";

          if (ownedCosmetics.length === 0) {
            return (
              <p className="text-sm text-text-2 italic">
                {t("identity.cosmeticEmpty")}
              </p>
            );
          }

          return (
            <div className="space-y-3">
              {/* Un-equip button if something is active */}
              {activeCosmetic && (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleUnequipCosmetic}
                    disabled={cosmeticBusy}
                    className="text-xs rounded-md px-3 py-1.5 bg-surface-2 border border-border text-text-2 hover:border-accent/50 disabled:opacity-50"
                  >
                    {t("identity.cosmeticUnequip")}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ownedCosmetics.map((effectId) => {
                  const def = cosmeticById(effectId);
                  if (!def) return null;
                  const isActive = activeCosmetic === effectId;
                  return (
                    <div
                      key={effectId}
                      className={`rounded-md border p-3 flex items-center gap-3 ${
                        isActive
                          ? "border-accent/60 bg-accent/5 shadow shadow-accent/10"
                          : "border-border"
                      }`}
                    >
                      {/* Small preview avatar with this cosmetic */}
                      <CosmeticAvatar
                        level={level}
                        skin={skinId}
                        size={48}
                        cosmetic={effectId}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-1 truncate">
                          {t(def.labelKey)}
                        </p>
                        {isActive && (
                          <p className="text-[10px] text-accent mt-0.5">
                            ⚔ {t("identity.cosmeticEquipped")}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={cosmeticBusy || isActive}
                        onClick={() => handleEquipCosmetic(effectId)}
                        className={`text-xs rounded-md px-3 py-1.5 shrink-0 transition-colors disabled:opacity-50 ${
                          isActive
                            ? "bg-accent text-white cursor-default"
                            : "bg-surface-2 border border-border text-text-1 hover:border-accent/50"
                        }`}
                      >
                        {isActive
                          ? t("identity.cosmeticEquipped")
                          : t("identity.cosmeticEquip")}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Persona Section */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          {t("identity.makePersonality")}
        </h2>

        {/* Name */}
        <div className="space-y-1">
          <label className="text-xs text-text-2">{t("identity.name")}</label>
          <div className="relative">
            <input
              type="text"
              value={personaName}
              onChange={(e) => setPersonaName(e.target.value)}
              placeholder={t("identity.namePlaceholder")}
              maxLength={16}
              className="input w-full pr-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-2">
              {t("identity.nameCounter", { n: personaName.length })}
            </span>
          </div>
        </div>

        {/* Tone */}
        <div className="space-y-1">
          <label className="text-xs text-text-2">{t("identity.toneFieldLabel")}</label>
          <div className="relative">
            <input
              type="text"
              value={personaTone}
              onChange={(e) => setPersonaTone(e.target.value)}
              placeholder={t("identity.tonePlaceholder")}
              maxLength={60}
              className="input w-full pr-14"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-2">
              {t("identity.toneCounter", { n: personaTone.length })}
            </span>
          </div>
        </div>

        {/* History */}
        <div className="space-y-1">
          <label className="text-xs text-text-2">{t("identity.historyFieldLabel")}</label>
          <textarea
            value={personaHistory}
            onChange={(e) => setPersonaHistory(e.target.value)}
            placeholder={t("identity.historyPlaceholder")}
            maxLength={300}
            rows={4}
            className="input w-full resize-none"
          />
          <p className="text-[10px] text-text-2 text-right">
            {t("identity.historyCounter", { n: personaHistory.length })}
          </p>
        </div>

        {/* Thoughts */}
        <div className="space-y-1">
          <label className="text-xs text-text-2">{t("identity.thoughtsFieldLabel")}</label>
          <textarea
            value={personaThoughts}
            onChange={(e) => setPersonaThoughts(e.target.value)}
            placeholder={t("identity.thoughtsPlaceholder")}
            maxLength={200}
            rows={3}
            className="input w-full resize-none"
          />
          <p className="text-[10px] text-text-2 text-right">
            {t("identity.thoughtsCounter", { n: personaThoughts.length })}
          </p>
        </div>

        {/* Status note */}
        <p className="text-xs text-text-2 flex items-start gap-1">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          ※ {t("identity.statusNote")}
        </p>

        {/* Form actions */}
        <div className="flex items-center gap-2 justify-end pt-1 border-t border-border">
          <button
            type="button"
            onClick={resetPersonaForm}
            disabled={saving}
            className="btn-ghost text-sm disabled:opacity-50"
          >
            {t("identity.reset")}
          </button>
          <button
            type="button"
            onClick={savePersona}
            disabled={saving}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {saving ? t("identity.saving") : t("identity.save")}
          </button>
        </div>
      </div>

      {/* All Titles Catalog Section */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Crown className="h-4 w-4 text-gold" />
          {t("identity.allTitlesSection")}
        </h2>

        {titlesError && (
          <ErrorBanner message={titlesError} onDismiss={dismissTitlesError} />
        )}

        {titlesLoading ? (
          <Spinner block label={t("identity.titlesLoading")} />
        ) : !catalogEntries || catalogEntries.length === 0 ? (
          <p className="text-sm text-text-2 text-center py-2">
            {t("identity.titlesEmpty")}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {catalogEntries.map((entry) => {
              if (entry.owned) {
                // Owned entry: equip/display toggles
                const ut = masterToUserTitle.get(entry.title.id);
                const isBusy = ut ? busyId === ut.id : false;
                const state = effectiveOwned(entry);
                return (
                  <div
                    key={entry.title.id}
                    className={`rounded-md border p-3 space-y-2 ${
                      state.is_equipped
                        ? "border-accent/60 shadow-lg shadow-accent/10"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <TitleBadge title={entry.title} modifier={state.negative_modifier} />
                      {state.is_equipped && (
                        <span className="text-[10px] text-accent">
                          ⚔ {t("identity.equipped")}
                        </span>
                      )}
                    </div>
                    {state.negative_modifier && (
                      <p className="text-[10px] text-danger">
                        {t("identity.penaltyLabel", { modifier: state.negative_modifier })}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <button
                        className={`flex-1 text-xs rounded-md py-1.5 transition-colors ${
                          state.is_equipped
                            ? "bg-accent text-white"
                            : "bg-surface-2 text-text-1 hover:bg-border"
                        } disabled:opacity-50`}
                        disabled={isBusy || !ut}
                        onClick={() => toggleEquip(entry)}
                      >
                        {state.is_equipped ? t("identity.unequip") : t("identity.equip")}
                      </button>
                      <button
                        className={`text-xs rounded-md py-1.5 px-2 transition-colors inline-flex items-center gap-1 disabled:opacity-50 ${
                          state.is_displayed
                            ? "bg-gold/20 text-gold hover:bg-gold/30"
                            : "bg-surface-2 text-text-1 hover:bg-border"
                        }`}
                        disabled={isBusy || !ut}
                        onClick={() => toggleDisplay(entry)}
                      >
                        {state.is_displayed ? t("identity.displayed") : t("identity.notDisplayed")}
                      </button>
                    </div>
                  </div>
                );
              } else {
                // Locked entry: progress bar + locked badge, no equip/display controls
                const hasThreshold =
                  entry.progress_threshold > 0;
                const clampedCur = hasThreshold
                  ? Math.min(entry.progress_current, entry.progress_threshold)
                  : 0;
                const pct = hasThreshold
                  ? Math.round((clampedCur / entry.progress_threshold) * 100)
                  : 0;
                return (
                  <div
                    key={entry.title.id}
                    className="rounded-md border border-border p-3 space-y-2 opacity-70"
                  >
                    <div className="flex items-center justify-between">
                      <TitleBadge title={entry.title} />
                      <span className="inline-flex items-center gap-1 text-[10px] text-text-2 bg-surface-2 border border-border rounded px-1.5 py-0.5">
                        <Lock className="h-3 w-3" />
                        {t("identity.locked")}
                      </span>
                    </div>
                    {hasThreshold ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-text-2">
                          <span>
                            {t("identity.progress", {
                              cur: clampedCur,
                              max: entry.progress_threshold,
                            })}
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent/50 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-text-2">???</p>
                    )}
                    <p className="text-[10px] text-text-2 italic">
                      {t("identity.lockedHint")}
                    </p>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>

      {/* Penalty / Defense Recovery Section */}
      <div className="card border-danger/30 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-danger">
          <Shield className="h-4 w-4" />
          {t("identity.recoverSection")}
        </h2>

        <div className="rounded bg-surface-2 border border-border px-3 py-2 space-y-1">
          <p className="text-sm font-medium text-text-1">
            {t("identity.recoverNormal")}
          </p>
          <p className="text-xs text-text-2">{t("identity.recoverNormalDesc")}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleUseDefense}
            disabled={defenseLoading || defenseTickets <= 0}
            className="btn-primary bg-danger hover:bg-danger/80 disabled:opacity-50 text-sm flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            {defenseTickets > 0
              ? t("identity.useDefense", { n: defenseTickets })
              : t("identity.useDefenseNone")}
          </button>
          {defenseLoading && <Spinner size={16} />}
        </div>
      </div>
    </div>
  );
}
