import type { Difficulty } from "@/lib/types";

const STYLE: Record<Difficulty, { label: string; cls: string }> = {
  LOW: { label: "쉬움", cls: "bg-success/20 text-success border-success/40" },
  MEDIUM: { label: "보통", cls: "bg-accent/20 text-accent border-accent/40" },
  HIGH: { label: "어려움", cls: "bg-danger/20 text-danger border-danger/40" }
};

export default function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const s = STYLE[difficulty];
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${s.cls}`}>
      {s.label}
    </span>
  );
}
