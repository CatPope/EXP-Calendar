"use client";

import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, Trophy } from "lucide-react";
import type { RewardResult } from "@/lib/types";
import TitleBadge from "./TitleBadge";

interface Props {
  reward: RewardResult | null;
  onClose: () => void;
}

export default function RewardToast({ reward, onClose }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (reward) {
      setOpen(true);
      const t = setTimeout(() => {
        setOpen(false);
        setTimeout(onClose, 200);
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [reward, onClose]);

  if (!reward || !open) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-toast-in">
      <div className="card border-accent/50 shadow-xl shadow-accent/20 min-w-[260px] space-y-2">
        <div className="flex items-center gap-2 text-success font-semibold">
          <Sparkles className="h-5 w-5" />
          일정 완료!
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-accent font-mono">+{reward.exp_gained} EXP</span>
          <span className="text-gold font-mono">+{reward.points_gained} P</span>
        </div>
        {reward.level_up && (
          <div className="flex items-center gap-2 text-gold font-bold animate-level-up">
            <TrendingUp className="h-5 w-5" />
            레벨 업! → Lv. {reward.new_level}
          </div>
        )}
        {reward.new_titles?.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-text-2 flex items-center gap-1">
              <Trophy className="h-3 w-3" /> 신규 칭호
            </div>
            <div className="flex flex-wrap gap-1">
              {reward.new_titles.map((t) => (
                <TitleBadge key={t.id} title={t} />
              ))}
            </div>
          </div>
        )}
        {reward.daily_cap_reached && (
          <div className="text-xs text-danger">일일 포인트 한도에 도달했습니다.</div>
        )}
      </div>
    </div>
  );
}
