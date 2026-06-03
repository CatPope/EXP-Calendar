// 클라이언트 전용 사용자 설정 (테마 + 폰트 크기 + 강조색). localStorage 영구화.

export type Theme = "dark" | "light";
export type FontSize = "sm" | "md" | "lg";
export type Accent = "purple" | "cyan" | "gold" | "pink" | "blue";

export interface Settings {
  theme: Theme;
  fontSize: FontSize;
  accent: Accent;
}

export const DEFAULT_SETTINGS: Settings = { theme: "dark", fontSize: "md", accent: "purple" };

export const ACCENTS: { value: Accent; label: string; hex: string }[] = [
  { value: "purple", label: "퍼플", hex: "#8B5CF6" },
  { value: "cyan", label: "시안", hex: "#06D6A0" },
  { value: "gold", label: "골드", hex: "#FFD700" },
  { value: "pink", label: "핑크", hex: "#FF6B9D" },
  { value: "blue", label: "블루", hex: "#3B82F6" },
];

const STORAGE_KEY = "exp-calendar.settings";

function isAccent(v: unknown): v is Accent {
  return v === "purple" || v === "cyan" || v === "gold" || v === "pink" || v === "blue";
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      theme: parsed.theme === "light" ? "light" : "dark",
      fontSize: parsed.fontSize === "sm" || parsed.fontSize === "lg" ? parsed.fontSize : "md",
      accent: isAccent(parsed.accent) ? parsed.accent : "purple",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/** <html>에 data-theme / data-font / data-accent 속성을 적용 → globals.css 변수가 스왑됨. */
export function applySettings(s: Settings): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", s.theme);
  root.setAttribute("data-font", s.fontSize);
  root.setAttribute("data-accent", s.accent);
}
