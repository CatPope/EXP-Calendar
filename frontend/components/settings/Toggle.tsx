"use client";

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
}

/** 토큰 기반 on/off 스위치. */
export default function Toggle({ checked, onChange, label, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 ${
        checked ? "border-accent bg-accent" : "border-border bg-surface-2"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-base transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
