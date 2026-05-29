"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/common/Modal";
import { useAppStore } from "@/lib/store";
import { Api, humanizeError } from "@/lib/api";
import { ACCENTS, type Accent, type FontSize, type Theme } from "@/lib/settings";

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

const TENDENCIES: { value: string; label: string }[] = [
  { value: "EASY", label: "쉬움" },
  { value: "NORMAL", label: "보통" },
  { value: "HARD", label: "어려움" },
];

export default function SettingsModal({ open, onClose }: Props) {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const user = useAppStore((s) => s.user);
  const patchUser = useAppStore((s) => s.patchUser);
  const pushToast = useAppStore((s) => s.pushToast);

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingTendency, setSavingTendency] = useState(false);

  useEffect(() => {
    if (open) setName(user?.display_name ?? "");
  }, [open, user?.display_name]);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === user?.display_name) return;
    setSavingName(true);
    try {
      await Api.updateProfile(trimmed);
      patchUser({ display_name: trimmed });
      pushToast("success", "표시 이름을 변경했습니다.");
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setSavingName(false);
    }
  }

  async function selectTendency(value: string) {
    if (value === user?.tendency) return;
    setSavingTendency(true);
    try {
      await Api.onboarding(value as "EASY" | "NORMAL" | "HARD");
      patchUser({ tendency: value });
      pushToast("success", "난이도 성향을 변경했습니다.");
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setSavingTendency(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="설정" maxWidth="max-w-sm">
      <div className="space-y-5">
        {/* 테마 */}
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

        {/* 강조색 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-text-1">강조색</div>
          <div className="flex gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                type="button"
                aria-label={a.label}
                onClick={() => setSettings({ accent: a.value as Accent })}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${
                  settings.accent === a.value ? "scale-110 border-text-1" : "border-transparent"
                }`}
                style={{ backgroundColor: a.hex }}
              />
            ))}
          </div>
        </div>

        {/* 글자 크기 */}
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

        {/* 계정: 표시 이름 */}
        <div className="space-y-2 border-t border-border pt-4">
          <div className="text-sm font-semibold text-text-1">표시 이름</div>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              placeholder="표시 이름"
            />
            <button
              type="button"
              onClick={saveName}
              disabled={savingName || !name.trim() || name.trim() === user?.display_name}
              className="rounded-md px-3 py-2 text-sm bg-accent text-white disabled:opacity-50"
            >
              저장
            </button>
          </div>
        </div>

        {/* 계정: 난이도 성향 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-text-1">난이도 성향</div>
          <div className="flex gap-2">
            {TENDENCIES.map((t) => (
              <button
                key={t.value}
                type="button"
                disabled={savingTendency}
                onClick={() => selectTendency(t.value)}
                className={`flex-1 rounded-md py-2 text-sm transition-colors disabled:opacity-50 ${
                  (user?.tendency ?? "NORMAL") === t.value
                    ? "bg-accent text-white"
                    : "bg-surface-2 text-text-1 hover:bg-border"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-text-2">성향에 따라 EXP/포인트 가중치가 달라집니다.</p>
        </div>
      </div>
    </Modal>
  );
}
