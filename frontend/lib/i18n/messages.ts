import type { Locale } from "./locale";
import type { NamespaceDict } from "./dict";
import { common } from "./locales/common";
import { calendar } from "./locales/calendar";
import { play } from "./locales/play";
import { character } from "./locales/character";
import { insights } from "./locales/insights";
import { core } from "./locales/core";
import { identity } from "./locales/identity";

// 네임스페이스 등록. 키는 "<namespace>.<localKey>" 형태로 전역화된다.
const NAMESPACES: Record<string, NamespaceDict> = {
  common,
  calendar,
  play,
  character,
  insights,
  core,
  identity
};

type Messages = Record<Locale, Record<string, string>>;

function build(): Messages {
  const out: Messages = { ko: {}, en: {}, ja: {} };
  for (const [ns, dict] of Object.entries(NAMESPACES)) {
    (Object.keys(out) as Locale[]).forEach((loc) => {
      const table = dict[loc] ?? {};
      for (const [key, val] of Object.entries(table)) {
        out[loc][`${ns}.${key}`] = val;
      }
    });
  }
  return out;
}

export const messages: Messages = build();
