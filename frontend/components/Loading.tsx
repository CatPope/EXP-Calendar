"use client";

import { Loader2 } from "lucide-react";

export default function Loading({ label = "불러오는 중..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-text-2 text-sm" role="status" aria-live="polite">
      <Loader2 className="h-4 w-4 animate-spin text-accent" />
      <span>{label}</span>
    </div>
  );
}
