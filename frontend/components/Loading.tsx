"use client";

import { Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function Loading({ label }: { label?: string }) {
  const t = useT();
  return (
    <div className="flex items-center gap-2 text-text-2 text-sm" role="status" aria-live="polite">
      <Loader2 className="h-4 w-4 animate-spin text-accent" />
      <span>{label ?? t("common.loading")}</span>
    </div>
  );
}
