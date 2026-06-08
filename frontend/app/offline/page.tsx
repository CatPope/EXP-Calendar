"use client";

import { useEffect } from "react";
import { useT } from "@/lib/i18n";

export default function OfflinePage() {
  const t = useT();
  useEffect(() => {
    document.title = t("common.offlineMetaTitle");
  }, [t]);
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-md text-center space-y-3">
        <h1 className="text-2xl font-bold text-accent">{t("common.offlineTitle")}</h1>
        <p className="text-text-2 text-sm">
          {t("common.offlineBody")}
        </p>
      </div>
    </main>
  );
}
