"use client";

import dynamic from "next/dynamic";
import type { SkinId } from "@/lib/character";

interface Props {
  level: number;
  size?: number;
  className?: string;
  withFrame?: boolean;
  skin?: SkinId;
  animated?: boolean;
}

function PlaceholderAvatar({ size = 64, withFrame, className = "" }: Props) {
  const box = (
    <div
      className="rounded-md bg-surface-2 animate-pulse"
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
  if (!withFrame) return <div className={className}>{box}</div>;
  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg bg-surface-2 border border-border p-2 ${className}`}
      style={{ width: size + 16, height: size + 16 }}
    >
      {box}
    </div>
  );
}

const Character3D = dynamic(() => import("./Character3D"), {
  ssr: false,
  loading: () => <PlaceholderAvatar level={0} />,
});

export default function CharacterAvatar(props: Props) {
  return <Character3D {...props} />;
}
