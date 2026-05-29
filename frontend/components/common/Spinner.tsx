"use client";

import { Loader2 } from "lucide-react";

interface Props {
  size?: number;
  label?: string;
  block?: boolean;
}

export default function Spinner({ size = 16, label, block }: Props) {
  const inner = (
    <span className="inline-flex items-center gap-2 text-text-2" role="status" aria-live="polite">
      <Loader2 className="animate-spin text-accent" style={{ width: size, height: size }} />
      {label ? <span className="text-sm">{label}</span> : null}
    </span>
  );
  if (block) {
    return <div className="flex items-center justify-center py-8">{inner}</div>;
  }
  return inner;
}
