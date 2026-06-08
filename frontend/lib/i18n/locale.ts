// 언어(locale) 적용·영구화. 백엔드 user_settings.language 와 동기화되며,
// 새로고침 시 플래시 없이 즉시 적용되도록 localStorage 에도 캐시한다.
// palette.ts 와 동일한 패턴: <html lang="..."> 속성을 스왑한다.

export type Locale = "ko" | "en" | "ja";

export const LOCALES: { value: Locale; label: string }[] = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" }
];

export const DEFAULT_LOCALE: Locale = "ko";

const STORAGE_KEY = "exp-calendar.locale";

export function isLocale(v: unknown): v is Locale {
  return v === "ko" || v === "en" || v === "ja";
}

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** <html lang> 적용 + localStorage 캐시. */
export function applyLocale(locale: Locale): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, locale);
  }
}
