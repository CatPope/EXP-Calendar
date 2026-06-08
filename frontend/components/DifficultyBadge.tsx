"use client";

import type { Difficulty } from "@/lib/types";
import { useT } from "@/lib/i18n";

const STYLE: Record<Difficulty, { labelKey: string; cls: string }> = {
  LOW: { labelKey: "calendar.difficultyLow", cls: "bg-success/20 text-success border-success/40" },
  MEDIUM: { labelKey: "calendar.difficultyMedium", cls: "bg-accent/20 text-accent border-accent/40" },
  HIGH: { labelKey: "calendar.difficultyHigh", cls: "bg-danger/20 text-danger border-danger/40" }
};

export default function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const t = useT();
  const s = STYLE[difficulty];
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${s.cls}`}>
      {t(s.labelKey)}
    </span>
  );
}
