"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredAccessToken } from "@/lib/auth";
import { useT } from "@/lib/i18n";

export default function HomePage() {
  const router = useRouter();
  const t = useT();
  useEffect(() => {
    const token = getStoredAccessToken();
    if (token) router.replace("/calendar");
    else router.replace("/login");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-screen text-text-2">
      <div className="animate-pulse">{t("common.brandLoading")}</div>
    </div>
  );
}
