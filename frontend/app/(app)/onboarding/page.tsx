"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Tendency } from "@/lib/types";
import ErrorBanner from "@/components/ErrorBanner";
import { useT } from "@/lib/i18n";

const OPTIONS: { value: Tendency; labelKey: string; descKey: string }[] = [
  { value: "EASY", labelKey: "common.tendencyEasy", descKey: "common.tendencyEasyDesc" },
  { value: "NORMAL", labelKey: "common.tendencyNormal", descKey: "common.tendencyNormalDesc" },
  { value: "HARD", labelKey: "common.tendencyHard", descKey: "common.tendencyHardDesc" }
];

export default function OnboardingPage() {
  const router = useRouter();
  const t = useT();
  const setUser = useAppStore((s) => s.setUser);
  const [pick, setPick] = useState<Tendency>("NORMAL");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      await Api.onboarding(pick);
      const me = await Api.me();
      setUser(me);
      router.replace("/calendar");
    } catch (e) {
      setErr(humanizeError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold">{t("common.onboardingTitle")}</h1>
      <p className="text-text-2 text-sm">{t("common.onboardingSubtitle")}</p>

      {err && <ErrorBanner message={err} onDismiss={() => setErr("")} />}

      <div className="space-y-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setPick(o.value)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              pick === o.value
                ? "border-accent bg-accent/10"
                : "border-border bg-surface-2 hover:bg-surface"
            }`}
          >
            <div className="font-semibold">{t(o.labelKey)}</div>
            <div className="text-xs text-text-2 mt-0.5">{t(o.descKey)}</div>
          </button>
        ))}
      </div>

      <button onClick={submit} disabled={busy} className="btn-primary w-full disabled:opacity-50">
        {busy ? t("common.saving") : t("common.getStarted")}
      </button>
    </div>
  );
}
