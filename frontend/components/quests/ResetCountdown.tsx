"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

/** ms until the next KST (Asia/Seoul, UTC+9) midnight from `now`. */
function msUntilKstMidnight(now: number): number {
  // KST = UTC+9, no DST. Shift the wall clock into KST, find next KST midnight.
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const kstNow = now + KST_OFFSET;
  const dayLen = 24 * 60 * 60 * 1000;
  const sinceMidnight = ((kstNow % dayLen) + dayLen) % dayLen;
  return dayLen - sinceMidnight;
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Live "리셋까지 HH:MM:SS" pill counting down to next KST midnight. */
export default function ResetCountdown() {
  const [remaining, setRemaining] = useState(() => msUntilKstMidnight(Date.now()));

  useEffect(() => {
    const tick = () => setRemaining(msUntilKstMidnight(Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent tabular-nums"
      role="timer"
      aria-live="off"
    >
      <Timer className="h-3.5 w-3.5" />
      리셋까지 {fmt(remaining)}
    </span>
  );
}
