"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger" | "success" | "gold";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

const VARIANT_CLS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent/80 disabled:bg-accent/30",
  ghost: "bg-surface-2 text-text-1 hover:bg-border disabled:opacity-50",
  danger: "bg-danger text-white hover:bg-danger/80 disabled:opacity-50",
  success: "bg-success text-base hover:bg-success/80 disabled:opacity-50",
  gold: "bg-gold text-base hover:bg-gold/80 disabled:opacity-50"
};

const SIZE_CLS: Record<Size, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-2.5 text-base"
};

export default function Button({
  variant = "primary",
  size = "md",
  loading,
  leading,
  trailing,
  className = "",
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors ${VARIANT_CLS[variant]} ${SIZE_CLS[size]} ${className}`}
    >
      {leading}
      {loading ? <span className="animate-pulse">…</span> : children}
      {trailing}
    </button>
  );
}
