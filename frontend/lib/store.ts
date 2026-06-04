"use client";

import { create } from "zustand";
import type { RewardResult, User } from "./types";
import {
  DEFAULT_SETTINGS,
  applySettings,
  saveSettings,
  type Settings,
} from "./settings";
import { DEFAULT_LOCALE, applyLocale, type Locale } from "./i18n/locale";

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

  // user settings (theme + font size), localStorage-backed
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;

  // UI language (ko/en/ja), localStorage-backed + server-synced
  locale: Locale;
  setLocale: (locale: Locale) => void;

  // UI chrome: sidebar drawer + settings modal
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
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
  clearReward: () => set({ reward: null }),

  settings: DEFAULT_SETTINGS,
  setSettings: (patch) =>
    set((s) => {
      const next = { ...s.settings, ...patch };
      saveSettings(next);
      applySettings(next);
      return { settings: next };
    }),

  locale: DEFAULT_LOCALE,
  setLocale: (locale) => {
    applyLocale(locale);
    set({ locale });
  },

  sidebarOpen: true,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  settingsOpen: false,
  setSettingsOpen: (v) => set({ settingsOpen: v })
}));
