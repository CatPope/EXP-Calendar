"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { TOAST_DURATION_MS } from "@/lib/ui-constants";
import RewardToast from "../RewardToast";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useT } from "@/lib/i18n";

type ToastKind = "info" | "success" | "error";

interface ToastItemProps {
  id: string;
  kind: ToastKind;
  message: string;
  onClose: (id: string) => void;
}

function ToastItem({ id, kind, message, onClose }: ToastItemProps) {
  const t = useT();
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const Icon = kind === "error" ? AlertCircle : kind === "success" ? CheckCircle2 : Info;
  const color =
    kind === "error"
      ? "border-danger/50 text-danger"
      : kind === "success"
      ? "border-success/50 text-success"
      : "border-accent/50 text-accent";

  return (
    <div
      className={`card !p-3 flex items-start gap-2 text-sm animate-toast-in min-w-[240px] ${color}`}
      role="alert"
    >
      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 text-text-1">{message}</div>
      <button onClick={() => onClose(id)} aria-label={t("common.close")} className="text-text-2 hover:text-text-1">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ToastHost() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);
  const reward = useAppStore((s) => s.reward);
  const clearReward = useAppStore((s) => s.clearReward);

  return (
    <>
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        <div className="space-y-2 pointer-events-auto">
          {toasts.map((t) => (
            <ToastItem key={t.id} {...t} onClose={removeToast} />
          ))}
        </div>
      </div>
      <RewardToast reward={reward} onClose={clearReward} />
    </>
  );
}
