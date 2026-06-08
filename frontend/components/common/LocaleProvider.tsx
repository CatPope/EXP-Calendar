"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { getStoredLocale } from "@/lib/i18n/locale";

/**
 * 마운트 시 localStorage 에 캐시된 로케일을 스토어에 반영한다.
 * 루트 레이아웃에 두어 로그인/온보딩 등 (app) 그룹 밖 화면까지 커버한다.
 * 서버 설정(user_settings.language)과의 동기화는 설정 페이지/세션 부팅에서 수행.
 */
export default function LocaleProvider() {
  const setLocale = useAppStore((s) => s.setLocale);
  useEffect(() => {
    setLocale(getStoredLocale());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
