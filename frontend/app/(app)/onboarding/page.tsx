"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Tendency, User } from "@/lib/types";
import ErrorBanner from "@/components/ErrorBanner";

const OPTIONS: { value: Tendency; label: string; desc: string }[] = [
  { value: "EASY", label: "쉬움 (EASY)", desc: "1.2x 보상 — 부담 없이 시작합니다." },
  { value: "NORMAL", label: "보통 (NORMAL)", desc: "1.0x 보상 — 균형 잡힌 진행." },
  { value: "HARD", label: "어려움 (HARD)", desc: "0.8x 보상 — 도전자에게 추천." }
];

export default function OnboardingPage() {
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);
  const [pick, setPick] = useState<Tendency>("NORMAL");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      await apiFetch("/api/me/onboarding", {
        method: "POST",
        body: JSON.stringify({ tendency: pick })
      });
      const me = await apiFetch<User>("/api/me");
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
      <h1 className="text-xl font-bold">시작하기 전에...</h1>
      <p className="text-text-2 text-sm">난이도 성향을 선택하세요. 언제든 변경할 수 있습니다.</p>

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
            <div className="font-semibold">{o.label}</div>
            <div className="text-xs text-text-2 mt-0.5">{o.desc}</div>
          </button>
        ))}
      </div>

      <button onClick={submit} disabled={busy} className="btn-primary w-full disabled:opacity-50">
        {busy ? "저장 중..." : "시작하기"}
      </button>
    </div>
  );
}
