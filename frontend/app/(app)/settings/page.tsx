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
import type { Settings } from "@/lib/types";

const TIMEZONES = ["Asia/Seoul", "UTC", "America/New_York", "Asia/Tokyo"];
const SCALE_OPTIONS: { value: number; label: string }[] = [
  { value: 0.8, label: "작게" },
  { value: 1.0, label: "기본" },
  { value: 1.3, label: "크게" },
];
const REMINDER_OPTIONS = [5, 10, 15, 30, 60];
const NOTIFICATION_KEYS: { key: string; label: string }[] = [
  { key: "push", label: "푸시 알림" },
  { key: "schedule_reminder", label: "일정 리마인더" },
  { key: "dormancy_warning", label: "휴면 경고" },
  { key: "title_change", label: "칭호 획득/강등" },
  { key: "daily_quest_reset", label: "일일 퀘스트 리셋" },
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
  const router = useRouter();
  const pushToast = useAppStore((s) => s.pushToast);
  const setUser = useAppStore((s) => s.setUser);

  const { data, loading, error, dismissError } = useAsyncData<Settings>(
    () => Api.getSettings(),
    []
  );

  const [local, setLocal] = useState<Settings | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (data) setLocal(data);
  }, [data]);

  async function update(patch: Partial<Settings>) {
    setLocal((cur) => (cur ? { ...cur, ...patch } : cur));
    try {
      await Api.patchSettings(patch);
    } catch (e) {
      pushToast("error", humanizeError(e));
    }
  }

  function selectLanguage(lang: string) {
    if (lang === "ko") {
      update({ language: "ko" });
    } else {
      // en/ja는 V2 예정 — 서버 반영 없이 무시(언어는 ko 유지).
      setLocal((cur) => (cur ? { ...cur, language: "ko" } : cur));
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
      pushToast("success", "내보내기 완료");
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
      pushToast("success", "초기화되었습니다");
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
        <h1 className="text-lg font-semibold">설정</h1>
      </div>

      {error && <ErrorBanner message={error} onDismiss={dismissError} />}

      {loading || !local ? (
        <Spinner block label="설정 불러오는 중..." />
      ) : (
        <>
          {/* 1) 일반 */}
          <section className="card space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-accent" />
              <h2 className="font-semibold">일반</h2>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-text-1">시간대</label>
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
              <label className="text-sm text-text-1">주 시작 요일</label>
              <div className="flex gap-1.5">
                <SegButton
                  active={local.week_start === "SUN"}
                  onClick={() => update({ week_start: "SUN" })}
                >
                  일
                </SegButton>
                <SegButton
                  active={local.week_start === "MON"}
                  onClick={() => update({ week_start: "MON" })}
                >
                  월
                </SegButton>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-text-1">시간 표기</label>
              <div className="flex gap-1.5">
                <SegButton
                  active={local.time_format === "H12"}
                  onClick={() => update({ time_format: "H12" })}
                >
                  12시간
                </SegButton>
                <SegButton
                  active={local.time_format === "H24"}
                  onClick={() => update({ time_format: "H24" })}
                >
                  24시간
                </SegButton>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-text-1">캐릭터 크기</label>
              <div className="flex gap-1.5">
                {SCALE_OPTIONS.map((opt) => (
                  <SegButton
                    key={opt.value}
                    active={local.character_scale === opt.value}
                    onClick={() => update({ character_scale: opt.value })}
                  >
                    {opt.label}
                  </SegButton>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <label className="text-sm text-text-1">언어</label>
                {local.language !== "ko" && (
                  <span className="text-[10px] text-gold">예정(V2)</span>
                )}
              </div>
              <select
                value={local.language}
                onChange={(e) => selectLanguage(e.target.value)}
                className="text-xs rounded-md bg-surface-2 border border-border px-2 py-1.5 text-text-1"
              >
                <option value="ko">한국어</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </div>
          </section>

          {/* 2) 연동 · 계정 */}
          <section className="card space-y-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-accent" />
              <h2 className="font-semibold">연동 · 계정</h2>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <label className="text-sm text-text-1">Google Calendar 연동</label>
                <span className="text-[10px] text-text-2">
                  양방향 동기화는 예정(V2)
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
              <label className="text-sm text-text-1">데이터 내보내기 (JSON)</label>
              <button
                type="button"
                onClick={doExport}
                className="text-xs rounded-md px-3 py-1.5 bg-surface-2 border border-border text-text-1 hover:bg-border inline-flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" /> 내보내기
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <label className="text-sm text-text-1">로그아웃</label>
              <button
                type="button"
                onClick={doLogout}
                className="text-xs rounded-md px-3 py-1.5 bg-surface-2 border border-border text-text-1 hover:bg-border inline-flex items-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" /> 로그아웃
              </button>
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <label className="text-sm text-danger">
                    계정/데이터 초기화
                  </label>
                  <span className="text-[10px] text-text-2">복구 불가</span>
                </div>
                {!confirmReset && (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="text-xs rounded-md px-3 py-1.5 bg-surface-2 border border-danger text-danger hover:bg-danger/10 inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> 초기화
                  </button>
                )}
              </div>
              {confirmReset && (
                <div className="flex flex-col gap-2 rounded-md border border-danger bg-danger/10 p-3">
                  <p className="text-xs text-danger">
                    정말 초기화하시겠습니까? 되돌릴 수 없습니다
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={doReset}
                      className="text-xs rounded-md px-3 py-1.5 bg-danger text-white hover:opacity-90"
                    >
                      확인
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="text-xs rounded-md px-3 py-1.5 bg-surface-2 border border-border text-text-1 hover:bg-border"
                    >
                      취소
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
              <h2 className="font-semibold">알림</h2>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-text-1">리마인더 시점</label>
              <select
                value={local.reminder_minutes}
                onChange={(e) =>
                  update({ reminder_minutes: Number(e.target.value) })
                }
                className="text-xs rounded-md bg-surface-2 border border-border px-2 py-1.5 text-text-1"
              >
                {REMINDER_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}분 전
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-3">
              {NOTIFICATION_KEYS.map(({ key, label }) => {
                const val = !!local.notification_prefs[key];
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3"
                  >
                    <label className="text-sm text-text-1">{label}</label>
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
              <h2 className="font-semibold">테마</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => update({ theme: "cosmic_purple" })}
                aria-pressed={local.theme === "cosmic_purple"}
                className={`flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors ${
                  local.theme === "cosmic_purple"
                    ? "border-accent bg-accent/15"
                    : "border-border bg-surface-2 hover:border-accent/50"
                }`}
              >
                <span className="text-xs font-medium text-text-1">
                  코스믹 퍼플
                </span>
                <span className="text-[10px] text-text-2">기본</span>
              </button>

              {[
                { id: "game_boy", label: "게임보이" },
                { id: "synthwave", label: "신스웨이브" },
                { id: "amber_crt", label: "앰버 CRT" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled
                  className="flex flex-col items-start gap-1 rounded-md border border-border bg-surface-2 p-3 text-left opacity-50 cursor-not-allowed"
                >
                  <span className="text-xs font-medium text-text-1">
                    {t.label}
                  </span>
                  <span className="text-[10px] text-gold">예정(V2)</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
