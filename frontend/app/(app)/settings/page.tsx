"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon,
  Bell,
  Link2,
  Globe,
  Trash2,
  Download,
  LogOut,
  Palette,
} from "lucide-react";
import Spinner from "@/components/common/Spinner";
import ErrorBanner from "@/components/ErrorBanner";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { clearTokens } from "@/lib/auth";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { PALETTES, applyPalette, isPalette, type Palette as PaletteId } from "@/lib/palette";
import { enablePush, type PushResult } from "@/lib/push";
import { useT } from "@/lib/i18n";
import { LOCALES, isLocale } from "@/lib/i18n/locale";
import type { Settings } from "@/lib/types";

const TIMEZONES = ["Asia/Seoul", "UTC", "America/New_York", "Asia/Tokyo"];
const SCALE_OPTIONS: { value: number; labelKey: string }[] = [
  { value: 0.8, labelKey: "scaleSmall" },
  { value: 1.0, labelKey: "scaleDefault" },
  { value: 1.3, labelKey: "scaleLarge" },
];
const REMINDER_OPTIONS = [5, 10, 15, 30, 60];
const NOTIFICATION_KEYS: { key: string; labelKey: string }[] = [
  { key: "push", labelKey: "notifPush" },
  { key: "schedule_reminder", labelKey: "notifScheduleReminder" },
  { key: "dormancy_warning", labelKey: "notifDormancy" },
  { key: "title_change", labelKey: "notifTitleChange" },
  { key: "daily_quest_reset", labelKey: "notifDailyReset" },
];

function Toggle({
  on,
  onClick,
  disabled,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        on ? "bg-accent" : "bg-surface-2 border border-border"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SegButton({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`text-xs rounded-md px-3 py-1.5 border transition-colors disabled:opacity-50 ${
        active
          ? "bg-accent text-white border-accent"
          : "bg-surface-2 text-text-1 border-border hover:border-accent/50"
      }`}
    >
      {children}
    </button>
  );
}

export default function SettingsPage() {
  const t = useT();
  const router = useRouter();
  const pushToast = useAppStore((s) => s.pushToast);
  const setUser = useAppStore((s) => s.setUser);
  const setLocale = useAppStore((s) => s.setLocale);

  const { data, loading, error, dismissError } = useAsyncData<Settings>(
    () => Api.getSettings(),
    []
  );

  const [local, setLocal] = useState<Settings | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (data) {
      setLocal(data);
      if (isPalette(data.theme)) applyPalette(data.theme);
      if (isLocale(data.language)) setLocale(data.language); // 서버 언어 ↔ UI 동기화
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function selectTheme(theme: PaletteId) {
    applyPalette(theme); // 즉시 화면 반영 + localStorage 캐시
    update({ theme });
  }

  async function update(patch: Partial<Settings>) {
    setLocal((cur) => (cur ? { ...cur, ...patch } : cur));
    try {
      await Api.patchSettings(patch);
    } catch (e) {
      pushToast("error", humanizeError(e));
    }
  }

  function selectLanguage(lang: string) {
    if (!isLocale(lang)) return;
    setLocale(lang); // 즉시 화면 반영 + localStorage 캐시
    update({ language: lang }); // 서버 영구화
  }

  const [pushBusy, setPushBusy] = useState(false);
  async function doEnablePush() {
    setPushBusy(true);
    try {
      const r: PushResult = await enablePush();
      const msgKey: Record<PushResult, string> = {
        granted: "core.pushGranted",
        denied: "core.pushDenied",
        unsupported: "core.pushUnsupported",
        "no-sw": "core.pushNoSw",
        error: "core.pushError"
      };
      pushToast(r === "granted" ? "success" : "error", t(msgKey[r]));
    } finally {
      setPushBusy(false);
    }
  }

  async function doExport() {
    try {
      const snapshot = await Api.exportData();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "exp-calendar-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      pushToast("success", t("core.exportDone"));
    } catch (e) {
      pushToast("error", humanizeError(e));
    }
  }

  async function doLogout() {
    try {
      await Api.logout();
    } catch {
      /* 로그아웃 실패는 무시하고 로컬 토큰 정리 */
    }
    clearTokens();
    router.replace("/login");
  }

  async function doReset() {
    try {
      await Api.resetAccount();
      try {
        const me = await Api.me();
        setUser(me);
      } catch {
        /* non-fatal */
      }
      pushToast("success", t("core.resetDone"));
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setConfirmReset(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-accent" />
        <h1 className="text-lg font-semibold">{t("core.settings")}</h1>
      </div>

      {error && <ErrorBanner message={error} onDismiss={dismissError} />}

      {loading || !local ? (
        <Spinner block label={t("core.loadingSettings")} />
      ) : (
        <>
          {/* 1) 일반 */}
          <section className="card space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-accent" />
              <h2 className="font-semibold">{t("core.sectionGeneral")}</h2>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-text-1">{t("core.timezone")}</label>
              <select
                value={local.timezone}
                onChange={(e) => update({ timezone: e.target.value })}
                className="text-xs rounded-md bg-surface-2 border border-border px-2 py-1.5 text-text-1"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-text-1">{t("core.weekStart")}</label>
              <div className="flex gap-1.5">
                <SegButton
                  active={local.week_start === "SUN"}
                  onClick={() => update({ week_start: "SUN" })}
                >
                  {t("core.weekStartSun")}
                </SegButton>
                <SegButton
                  active={local.week_start === "MON"}
                  onClick={() => update({ week_start: "MON" })}
                >
                  {t("core.weekStartMon")}
                </SegButton>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-text-1">{t("core.timeFormat")}</label>
              <div className="flex gap-1.5">
                <SegButton
                  active={local.time_format === "H12"}
                  onClick={() => update({ time_format: "H12" })}
                >
                  {t("core.h12")}
                </SegButton>
                <SegButton
                  active={local.time_format === "H24"}
                  onClick={() => update({ time_format: "H24" })}
                >
                  {t("core.h24")}
                </SegButton>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-text-1">{t("core.characterScale")}</label>
              <div className="flex gap-1.5">
                {SCALE_OPTIONS.map((opt) => (
                  <SegButton
                    key={opt.value}
                    active={local.character_scale === opt.value}
                    onClick={() => update({ character_scale: opt.value })}
                  >
                    {t(`core.${opt.labelKey}`)}
                  </SegButton>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-text-1">{t("core.language")}</label>
              <select
                value={local.language}
                onChange={(e) => selectLanguage(e.target.value)}
                className="text-xs rounded-md bg-surface-2 border border-border px-2 py-1.5 text-text-1"
              >
                {LOCALES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* 2) 연동 · 계정 */}
          <section className="card space-y-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-accent" />
              <h2 className="font-semibold">{t("core.sectionAccount")}</h2>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <label className="text-sm text-text-1">{t("core.gcalSync")}</label>
                <span className="text-[10px] text-text-2">
                  {t("core.gcalSyncHint")}
                </span>
              </div>
              <Toggle
                on={local.gcal_sync_enabled}
                onClick={() =>
                  update({ gcal_sync_enabled: !local.gcal_sync_enabled })
                }
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <label className="text-sm text-text-1">{t("core.exportData")}</label>
              <button
                type="button"
                onClick={doExport}
                className="text-xs rounded-md px-3 py-1.5 bg-surface-2 border border-border text-text-1 hover:bg-border inline-flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" /> {t("core.exportBtn")}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <label className="text-sm text-text-1">{t("core.logout")}</label>
              <button
                type="button"
                onClick={doLogout}
                className="text-xs rounded-md px-3 py-1.5 bg-surface-2 border border-border text-text-1 hover:bg-border inline-flex items-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" /> {t("core.logout")}
              </button>
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <label className="text-sm text-danger">
                    {t("core.resetAccount")}
                  </label>
                  <span className="text-[10px] text-text-2">
                    {t("core.resetIrreversible")}
                  </span>
                </div>
                {!confirmReset && (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="text-xs rounded-md px-3 py-1.5 bg-surface-2 border border-danger text-danger hover:bg-danger/10 inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t("core.resetBtn")}
                  </button>
                )}
              </div>
              {confirmReset && (
                <div className="flex flex-col gap-2 rounded-md border border-danger bg-danger/10 p-3">
                  <p className="text-xs text-danger">{t("core.resetConfirmQ")}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={doReset}
                      className="text-xs rounded-md px-3 py-1.5 bg-danger text-white hover:opacity-90"
                    >
                      {t("core.confirm")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="text-xs rounded-md px-3 py-1.5 bg-surface-2 border border-border text-text-1 hover:bg-border"
                    >
                      {t("core.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 3) 알림 */}
          <section className="card space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-accent" />
              <h2 className="font-semibold">{t("core.sectionNotif")}</h2>
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <label className="text-sm text-text-1">{t("core.pushBrowser")}</label>
              <button
                type="button"
                onClick={doEnablePush}
                disabled={pushBusy}
                className="text-xs rounded-md px-3 py-1.5 bg-accent text-white hover:bg-accent/80 disabled:opacity-50"
              >
                {t("core.pushEnable")}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-text-1">{t("core.reminderTime")}</label>
              <select
                value={local.reminder_minutes}
                onChange={(e) =>
                  update({ reminder_minutes: Number(e.target.value) })
                }
                className="text-xs rounded-md bg-surface-2 border border-border px-2 py-1.5 text-text-1"
              >
                {REMINDER_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {t("core.minBefore", { n })}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-3">
              {NOTIFICATION_KEYS.map(({ key, labelKey }) => {
                const val = !!local.notification_prefs[key];
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3"
                  >
                    <label className="text-sm text-text-1">
                      {t(`core.${labelKey}`)}
                    </label>
                    <Toggle
                      on={val}
                      onClick={() =>
                        update({
                          notification_prefs: {
                            ...local.notification_prefs,
                            [key]: !val,
                          },
                        })
                      }
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4) 테마 */}
          <section className="card space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-accent" />
              <h2 className="font-semibold">{t("core.sectionTheme")}</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PALETTES.map((p) => {
                const active = local.theme === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => selectTheme(p.value)}
                    aria-pressed={active}
                    className={`flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors ${
                      active
                        ? "border-accent bg-accent/15"
                        : "border-border bg-surface-2 hover:border-accent/50"
                    }`}
                  >
                    <span className="text-xs font-medium text-text-1">
                      {t(`core.pal_${p.value}`)}
                    </span>
                    <span className="text-[10px] text-text-2">
                      {t(`core.pal_${p.value}_hint`)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-text-2">{t("core.themeApplyNote")}</p>
          </section>
        </>
      )}
    </div>
  );
}
