"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon, Bell, Gem, Download } from "lucide-react";

import Toggle from "@/components/settings/Toggle";
import Segmented from "@/components/settings/Segmented";
import SettingRow from "@/components/settings/SettingRow";
import ColorThemeCard from "@/components/settings/ColorThemeCard";
import {
  loadPrefs,
  savePrefs,
  clearPrefs,
  DEFAULT_PREFS,
  type Prefs,
  type ColorPreset,
} from "@/components/settings/prefs";

import Spinner from "@/components/common/Spinner";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { clearTokens } from "@/lib/auth";
import type { FontSize } from "@/lib/settings";

// 캐릭터 크기 chip(0.8/1/1.3) ↔ store.fontSize(sm/md/lg) 매핑 (기능적 백킹).
const SCALE_TO_FONT: Record<Prefs["characterScale"], FontSize> = {
  "0.8": "sm",
  "1": "md",
  "1.3": "lg",
};

// 컬러 프리셋 ↔ store.theme 매핑. cosmic/그 외 프리셋 = dark, daylight = light.
function presetToTheme(preset: ColorPreset): "dark" | "light" {
  return preset === "daylight" ? "light" : "dark";
}

export default function SettingsPage() {
  const router = useRouter();

  const user = useAppStore((s) => s.user);
  const pushToast = useAppStore((s) => s.pushToast);
  // 테마/폰트는 실제 store(localStorage "exp-calendar.settings")로 백킹된다.
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);

  // 그 외 UI 환경설정은 자체 키("exp-calendar.prefs")로만 영구화.
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    setReady(true);
  }, []);

  function patchPrefs(patch: Partial<Prefs>) {
    setPrefs((cur) => {
      const next = { ...cur, ...patch };
      savePrefs(next);
      return next;
    });
  }

  function onSelectColor(preset: ColorPreset) {
    patchPrefs({ colorPreset: preset });
    // cosmic/daylight 는 실제 다크/라이트 테마를 토글(기능적).
    // gameboy/synthwave/amber 는 globals.css 변형 부재로 선택만 영구화되며,
    // 다크 베이스를 유지한다(시각적 프리셋, 추후 globals.css 변형 시 실제 적용).
    setSettings({ theme: presetToTheme(preset) });
  }

  function onSelectScale(scale: Prefs["characterScale"]) {
    patchPrefs({ characterScale: scale });
    // 캐릭터 크기 chip → 실제 폰트 스케일(기능적).
    setSettings({ fontSize: SCALE_TO_FONT[scale] });
  }

  function onExport() {
    try {
      const blob = new Blob(
        [
          JSON.stringify(
            {
              exported_at: new Date().toISOString(),
              user: user
                ? { email: user.email, display_name: user.display_name, level: user.level }
                : null,
              settings,
              prefs,
            },
            null,
            2
          ),
        ],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `exp-calendar-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      pushToast("success", "백업 JSON을 내보냈습니다.");
    } catch (e) {
      pushToast("error", humanizeError(e));
    }
  }

  async function onLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await Api.logout();
    } catch {
      /* non-fatal — 토큰은 어차피 정리한다 */
    } finally {
      clearTokens();
      router.replace("/login");
    }
  }

  function onResetData() {
    // 실제 진행도 삭제 엔드포인트는 범위 밖(DC-07: 시스템 임의 초기화 금지).
    // 여기서는 로컬 환경설정만 초기화하고 안내한다.
    const ok = window.confirm(
      "로컬 환경설정을 초기화합니다. 서버의 진행도(레벨·EXP·포인트)는 이 동작으로 삭제되지 않습니다. 계속할까요?"
    );
    if (!ok) return;
    clearPrefs();
    setPrefs(DEFAULT_PREFS);
    pushToast(
      "info",
      "로컬 환경설정을 초기화했습니다. (서버 진행도 초기화는 현재 지원되지 않습니다)"
    );
  }

  if (!ready) {
    return <Spinner block label="설정 불러오는 중..." />;
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <header>
        <h1 className="text-xl font-semibold text-text-1">설정</h1>
        <p className="text-xs text-text-2">일반 · 알림 · 테마 환경설정</p>
      </header>

      {/* ======================= ⚙ 일반 ======================= */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <SettingsIcon className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-text-1">일반</h2>
          <span className="text-xs text-text-2">언어 · 지역 · 계정</span>
        </div>

        {/* 언어·지역 */}
        <div className="card">
          <h3 className="mb-1 text-sm font-semibold text-text-1">언어 · 지역</h3>
          <SettingRow
            title="언어 (Language)"
            subtitle="앱 표시 언어"
            control={
              <Segmented
                ariaLabel="언어"
                value={prefs.language}
                onChange={(v) => patchPrefs({ language: v })}
                options={[
                  { value: "ko", label: "한국어" },
                  { value: "en", label: "English" },
                  { value: "ja", label: "日本語" },
                ]}
              />
            }
          />
          <SettingRow
            title="시간대"
            subtitle="일정·알림 기준 시간대"
            control={
              <Segmented
                ariaLabel="시간대"
                value={prefs.timezone}
                onChange={(v) => patchPrefs({ timezone: v })}
                options={[
                  { value: "GMT+9", label: "GMT+9" },
                  { value: "GMT+0", label: "GMT+0" },
                  { value: "GMT-8", label: "GMT-8" },
                ]}
              />
            }
          />
          <SettingRow
            title="주 시작 요일"
            subtitle="캘린더 첫 열"
            control={
              <Segmented
                ariaLabel="주 시작 요일"
                value={prefs.weekStart}
                onChange={(v) => patchPrefs({ weekStart: v })}
                options={[
                  { value: "sun", label: "일요일" },
                  { value: "mon", label: "월요일" },
                ]}
              />
            }
          />
          <SettingRow
            title="시간 표기"
            subtitle="12 / 24시간제"
            last
            control={
              <Segmented
                ariaLabel="시간 표기"
                value={prefs.timeFormat}
                onChange={(v) => patchPrefs({ timeFormat: v })}
                options={[
                  { value: "24h", label: "24시간" },
                  { value: "12h", label: "12시간" },
                ]}
              />
            }
          />
        </div>

        {/* 연동·계정 */}
        <div className="card">
          <h3 className="mb-1 text-sm font-semibold text-text-1">연동 · 계정</h3>
          <SettingRow
            title="Google Calendar 연동"
            subtitle={`${user?.email ?? "계정 미연결"} · 양방향 동기화`}
            control={
              <Toggle
                label="Google Calendar 연동"
                checked={prefs.googleSync}
                onChange={(v) => patchPrefs({ googleSync: v })}
              />
            }
          />
          <SettingRow
            title="데이터 내보내기"
            subtitle="일정·기록 JSON 백업"
            control={
              <button type="button" className="btn-ghost inline-flex items-center gap-1.5" onClick={onExport}>
                <Download className="h-4 w-4" /> 내보내기
              </button>
            }
          />
          <SettingRow
            title="계정 / 데이터 초기화"
            subtitle="로그아웃 · 진행도 삭제 (복구 불가)"
            danger
            last
            control={
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-danger"
                  onClick={onLogout}
                  disabled={loggingOut}
                >
                  {loggingOut ? "로그아웃 중..." : "로그아웃"}
                </button>
                <button type="button" className="btn-danger" onClick={onResetData}>
                  초기화
                </button>
              </div>
            }
          />
        </div>
      </section>

      {/* ======================= ◔ 알림 ======================= */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Bell className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-text-1">알림</h2>
          <span className="text-xs text-text-2">Push · 리마인더</span>
        </div>

        {/* 알림 채널 */}
        <div className="card">
          <h3 className="mb-1 text-sm font-semibold text-text-1">알림 채널</h3>
          <SettingRow
            title="Push 알림 받기"
            subtitle="브라우저 / PWA Web Push (FCM)"
            control={
              <Toggle
                label="Push 알림 받기"
                checked={prefs.pushEnabled}
                onChange={(v) => patchPrefs({ pushEnabled: v })}
              />
            }
          />
          <SettingRow
            title="일정 시작 전 리마인더"
            subtitle="기본 15분 전"
            control={
              <Toggle
                label="일정 시작 전 리마인더"
                checked={prefs.reminderEnabled}
                onChange={(v) => patchPrefs({ reminderEnabled: v })}
              />
            }
          />
          <SettingRow
            title="휴면 경고 (13일차)"
            subtitle="접속 유도 알림"
            control={
              <Toggle
                label="휴면 경고"
                checked={prefs.dormantWarning}
                onChange={(v) => patchPrefs({ dormantWarning: v })}
              />
            }
          />
          <SettingRow
            title="칭호 획득 / 강등 알림"
            subtitle="보상·페널티 발생 시"
            control={
              <Toggle
                label="칭호 획득 / 강등 알림"
                checked={prefs.titleAlerts}
                onChange={(v) => patchPrefs({ titleAlerts: v })}
              />
            }
          />
          <SettingRow
            title="일일 퀘스트 리셋 알림"
            subtitle="매일 자정"
            last
            control={
              <Toggle
                label="일일 퀘스트 리셋 알림"
                checked={prefs.dailyResetAlerts}
                onChange={(v) => patchPrefs({ dailyResetAlerts: v })}
              />
            }
          />
        </div>

        {/* 리마인더 시점 */}
        <div className="card">
          <h3 className="text-sm font-semibold text-text-1">리마인더 시점</h3>
          <p className="mb-3 text-xs text-text-2">일정 시작 몇 분 전에 알릴까요?</p>
          <Segmented
            ariaLabel="리마인더 시점"
            value={String(prefs.reminderMinutes)}
            onChange={(v) =>
              patchPrefs({ reminderMinutes: Number(v) as Prefs["reminderMinutes"] })
            }
            options={[
              { value: "5", label: "5분 전" },
              { value: "10", label: "10분 전" },
              { value: "15", label: "15분 전" },
              { value: "30", label: "30분 전" },
              { value: "60", label: "60분 전" },
            ]}
          />
        </div>
      </section>

      {/* ======================= ◈ 테마 ======================= */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Gem className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-text-1">테마</h2>
          <span className="text-xs text-text-2">컬러 · 캐릭터 표시</span>
        </div>

        {/* 컬러 테마 (4종 + 라이트) */}
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-text-1">컬러 테마 (4종)</h3>
          <ColorThemeCard value={prefs.colorPreset} onSelect={onSelectColor} />
          <p className="mt-2 text-[11px] text-text-2">
            Cosmic Purple = 다크 테마, Daylight = 라이트 테마(실제 적용). 그 외 프리셋은
            선택만 저장됩니다.
          </p>
        </div>

        {/* 캐릭터 표시 */}
        <div className="card">
          <h3 className="mb-1 text-sm font-semibold text-text-1">캐릭터 표시</h3>
          <SettingRow
            title="캐릭터 크기"
            subtitle="다마고치 펫 HUD 크기"
            last
            control={
              <Segmented
                ariaLabel="캐릭터 크기"
                value={prefs.characterScale}
                onChange={onSelectScale}
                options={[
                  { value: "0.8", label: "0.8×" },
                  { value: "1", label: "1×" },
                  { value: "1.3", label: "1.3×" },
                ]}
              />
            }
          />
        </div>
      </section>
    </div>
  );
}
