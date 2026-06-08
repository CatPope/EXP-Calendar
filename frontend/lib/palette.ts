// 컬러 테마(palette) 적용·영구화. 백엔드 user_settings.theme 와 동기화되며,
// 새로고침 시 플래시 없이 즉시 적용되도록 localStorage 에도 캐시한다.
// globals.css 의 :root[data-palette="..."] 변수 셋을 스왑한다.

export type Palette = "cosmic_purple" | "game_boy" | "synthwave" | "amber_crt";

export const PALETTES: { value: Palette; label: string; hint: string }[] = [
  { value: "cosmic_purple", label: "코스믹 퍼플", hint: "기본" },
  { value: "game_boy", label: "게임보이", hint: "레트로 그린" },
  { value: "synthwave", label: "신스웨이브", hint: "네온 퍼플" },
  { value: "amber_crt", label: "앰버 CRT", hint: "호박색 터미널" }
];

const STORAGE_KEY = "exp-calendar.palette";

export function isPalette(v: unknown): v is Palette {
  return (
    v === "cosmic_purple" || v === "game_boy" || v === "synthwave" || v === "amber_crt"
  );
}

export function getStoredPalette(): Palette {
  if (typeof window === "undefined") return "cosmic_purple";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return isPalette(v) ? v : "cosmic_purple";
}

/** <html data-palette> 적용 + localStorage 캐시. cosmic_purple 은 속성 제거(기본). */
export function applyPalette(p: Palette): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (p === "cosmic_purple") {
    root.removeAttribute("data-palette");
  } else {
    root.setAttribute("data-palette", p);
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, p);
  }
}
