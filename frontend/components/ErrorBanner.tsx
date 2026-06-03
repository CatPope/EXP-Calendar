"use client";

import { AlertTriangle, X } from "lucide-react";
import { useT } from "@/lib/i18n";

interface Props {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorBanner({ message, onDismiss }: Props) {
  const t = useT();
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 bg-danger/10 border border-danger/40 text-danger rounded-md p-3 text-sm">
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1">{message}</div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-danger/80 hover:text-danger" aria-label={t("common.close")}>
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
