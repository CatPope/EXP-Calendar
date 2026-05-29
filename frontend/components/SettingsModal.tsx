"use client";

import Modal from "@/components/common/Modal";
import { useAppStore } from "@/lib/store";
import type { FontSize, Theme } from "@/lib/settings";

interface Props {
  open: boolean;
  onClose: () => void;
}

const THEMES: { value: Theme; label: string }[] = [
  { value: "dark", label: "다크" },
  { value: "light", label: "라이트" },
];

const FONTS: { value: FontSize; label: string }[] = [
  { value: "sm", label: "작게" },
  { value: "md", label: "보통" },
  { value: "lg", label: "크게" },
];

export default function SettingsModal({ open, onClose }: Props) {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);

  return (
    <Modal open={open} onClose={onClose} title="설정" maxWidth="max-w-sm">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-text-1">테마</div>
          <div className="flex gap-2">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setSettings({ theme: t.value })}
                className={`flex-1 rounded-md py-2 text-sm transition-colors ${
                  settings.theme === t.value
                    ? "bg-accent text-white"
                    : "bg-surface-2 text-text-1 hover:bg-border"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-text-1">글자 크기</div>
          <div className="flex gap-2">
            {FONTS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setSettings({ fontSize: f.value })}
                className={`flex-1 rounded-md py-2 text-sm transition-colors ${
                  settings.fontSize === f.value
                    ? "bg-accent text-white"
                    : "bg-surface-2 text-text-1 hover:bg-border"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
