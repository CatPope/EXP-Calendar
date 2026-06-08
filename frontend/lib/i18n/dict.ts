import type { Locale } from "./locale";

/**
 * 한 네임스페이스의 번역 사전. 키는 로컬(짧은) 이름이며,
 * messages.ts 가 "<namespace>." 접두사를 붙여 전역 키로 합친다.
 * 3개 로케일(ko/en/ja) 모두 동일한 키 집합을 가져야 한다.
 */
export type NamespaceDict = Record<Locale, Record<string, string>>;
