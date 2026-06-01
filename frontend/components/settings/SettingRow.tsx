"use client";

import type { ReactNode } from "react";

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  control?: ReactNode;
  danger?: boolean;
  /** 마지막 행에서 하단 구분선을 숨김. */
  last?: boolean;
}

/** "제목 + 보조설명 ........ 컨트롤" 한 줄. 카드 내부에서 반복 사용. */
export default function SettingRow({
  title,
  subtitle,
  control,
  danger,
  last,
}: Props) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3 ${
        last ? "" : "border-b border-border"
      }`}
    >
      <div className="min-w-0">
        <div
          className={`text-sm font-medium ${
            danger ? "text-danger" : "text-text-1"
          }`}
        >
          {title}
        </div>
        {subtitle ? (
          <div className="mt-0.5 text-xs text-text-2">{subtitle}</div>
        ) : null}
      </div>
      {control ? <div className="shrink-0">{control}</div> : null}
    </div>
  );
}
