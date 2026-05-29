// 클라이언트 전용 사용자 설정 (테마 + 폰트 크기). localStorage 영구화.

export type Theme = "dark" | "light";
export type FontSize = "sm" | "md" | "lg";

export interface Settings {
  theme: Theme;
  fontSize: FontSize;
}

export const DEFAULT_SETTINGS: Settings = { theme: "dark", fontSize: "md" };

const STORAGE_KEY = "exp-calendar.settings";

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      theme: parsed.theme === "light" ? "light" : "dark",
      fontSize: parsed.fontSize === "sm" || parsed.fontSize === "lg" ? parsed.fontSize : "md",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/** <html>에 data-theme / data-font 속성을 적용 → globals.css 변수가 스왑됨. */
export function applySettings(s: Settings): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", s.theme);
  root.setAttribute("data-font", s.fontSize);
}
