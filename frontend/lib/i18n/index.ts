"use client";

import { useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { messages } from "./messages";
import { DEFAULT_LOCALE, type Locale } from "./locale";

export { LOCALES, DEFAULT_LOCALE, isLocale, getStoredLocale, applyLocale } from "./locale";
export type { Locale } from "./locale";

export type TParams = Record<string, string | number>;

/** `{name}` 형태의 플레이스홀더를 params 로 치환한다. */
function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in params ? String(params[k]) : `{${k}}`
  );
}

/** 로케일을 직접 받아 번역하는 순수 함수 (React 밖에서도 사용 가능). */
export function translate(locale: Locale, key: string, params?: TParams): string {
  const table = messages[locale] ?? messages[DEFAULT_LOCALE];
  const raw = table[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
  return interpolate(raw, params);
}

export type TFunction = (key: string, params?: TParams) => string;

/**
 * 현재 로케일에 묶인 번역 함수를 반환하는 훅.
 * 스토어의 locale 을 구독하므로 언어 변경 시 자동 리렌더된다.
 *   const t = useT();
 *   t("core.save");                // "저장"
 *   t("calendar.minBefore", { n }) // "{n}분 전"
 */
export function useT(): TFunction {
  const locale = useAppStore((s) => s.locale);
  return useCallback(
    (key: string, params?: TParams) => translate(locale, key, params),
    [locale]
  );
}
