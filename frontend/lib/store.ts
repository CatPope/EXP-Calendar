"use client";

import { create } from "zustand";
import type { RewardResult, User } from "./types";

export type ToastKind = "info" | "success" | "error";

export interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}

interface AppState {
  user: User | null;
  setUser: (u: User | null) => void;
  patchUser: (patch: Partial<User>) => void;

  // generic toasts (UI-07)
  toasts: ToastItem[];
  pushToast: (kind: ToastKind, message: string) => void;
  removeToast: (id: string) => void;

  // reward toast (UI-01, gameplay feedback)
  reward: RewardResult | null;
  showReward: (r: RewardResult) => void;
  clearReward: () => void;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
  patchUser: (patch) =>
    set((s) => (s.user ? { user: { ...s.user, ...patch } } : { user: s.user })),

  toasts: [],
  pushToast: (kind, message) =>
    set((s) => ({ toasts: [...s.toasts, { id: uid(), kind, message }] })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  reward: null,
  showReward: (r) => set({ reward: r }),
  clearReward: () => set({ reward: null })
}));
