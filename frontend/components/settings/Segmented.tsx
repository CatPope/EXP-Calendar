"use client";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
}

/** 단일 선택 세그먼트 / chips 컨트롤. 토큰 기반. */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: Props<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap gap-1.5"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
              active
                ? "border-accent bg-accent/20 text-accent"
                : "border-border bg-surface-2 text-text-1 hover:bg-border"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
