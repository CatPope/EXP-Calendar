import type { Title } from "@/lib/types";
import { Crown } from "lucide-react";

const GRADE_BG: Record<string, string> = {
  COMMON: "bg-success/20 border-success/40",
  RARE: "bg-accent/20 border-accent/40",
  EPIC: "bg-gold/20 border-gold/40",
  LEGENDARY: "bg-danger/20 border-danger/40"
};

export default function TitleBadge({ title, modifier }: { title: Title | null; modifier?: string | null }) {
  if (!title) {
    return <span className="text-text-2 text-xs">칭호 없음</span>;
  }
  const cls = GRADE_BG[title.grade] || GRADE_BG.COMMON;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${cls}`}
      style={{ color: title.color_hex }}
    >
      <Crown className="h-3 w-3" />
      {modifier ? <span className="text-danger">[{modifier}]</span> : null}
      <span>{title.name}</span>
    </span>
  );
}
