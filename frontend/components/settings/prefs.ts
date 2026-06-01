"use client";

// 설정 페이지 전용 사용자 환경설정(UI preferences).
// lib/settings.ts(테마/폰트 — 실제 store 백킹)와는 별개로,
// 언어·시간대·알림 등 "아직 백엔드 엔드포인트가 없는" 항목을 단일 JSON blob으로
// 자체 localStorage 키에 영구화한다. lib/settings.ts 는 절대 건드리지 않는다.

export type Language = "ko" | "en" | "ja";
export type Timezone = "GMT+9" | "GMT+0" | "GMT-8";
export type WeekStart = "sun" | "mon";
export type TimeFormat = "24h" | "12h";
export type ReminderMinutes = 5 | 10 | 15 | 30 | 60;
export type CharacterScale = "0.8" | "1" | "1.3";
// 컬러 테마 프리셋: cosmic = 다크, daylight = 라이트(실제 store 테마와 매핑).
// gameboy/synthwave/amber 는 globals.css 변형이 범위 밖이라 "선택만 영구화"되는
// 시각적 프리셋이다(실제 팔레트 적용은 추후 globals.css 변형 추가 시).
export type ColorPreset = "cosmic" | "gameboy" | "synthwave" | "amber" | "daylight";

export interface Prefs {
  language: Language;
  timezone: Timezone;
  weekStart: WeekStart;
  timeFormat: TimeFormat;

  googleSync: boolean;

  pushEnabled: boolean;
  reminderEnabled: boolean;
  dormantWarning: boolean;
  titleAlerts: boolean;
  dailyResetAlerts: boolean;
  reminderMinutes: ReminderMinutes;

  colorPreset: ColorPreset;
  characterScale: CharacterScale;
}

export const DEFAULT_PREFS: Prefs = {
  language: "ko",
  timezone: "GMT+9",
  weekStart: "sun",
  timeFormat: "24h",

  googleSync: true,

  pushEnabled: true,
  reminderEnabled: true,
  dormantWarning: false,
  titleAlerts: true,
  dailyResetAlerts: true,
  reminderMinutes: 15,

  colorPreset: "cosmic",
  characterScale: "1",
};

const STORAGE_KEY = "exp-calendar.prefs";

export function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: Prefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function clearPrefs(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
