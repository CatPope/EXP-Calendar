"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/common/Modal";
import { useAppStore } from "@/lib/store";
import { Api, humanizeError } from "@/lib/api";
import { ACCENTS, type Accent, type FontSize, type Theme } from "@/lib/settings";
import { useT } from "@/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
}

const THEMES: { value: Theme; labelKey: string }[] = [
  { value: "dark", labelKey: "themeDark" },
  { value: "light", labelKey: "themeLight" },
];

const FONTS: { value: FontSize; labelKey: string }[] = [
  { value: "sm", labelKey: "fontSmall" },
  { value: "md", labelKey: "fontMedium" },
  { value: "lg", labelKey: "fontLarge" },
];

const TENDENCIES: { value: string; labelKey: string }[] = [
  { value: "EASY", labelKey: "tendencyEasy" },
  { value: "NORMAL", labelKey: "tendencyNormal" },
  { value: "HARD", labelKey: "tendencyHard" },
];

const ACCENT_LABEL_KEY: Record<Accent, string> = {
  purple: "accentPurple",
  cyan: "accentCyan",
  gold: "accentGold",
  pink: "accentPink",
  blue: "accentBlue",
};

export default function SettingsModal({ open, onClose }: Props) {
  const t = useT();
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
      pushToast("success", t("core.nameChanged"));
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
      pushToast("success", t("core.tendencyChanged"));
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setSavingTendency(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("core.settings")} maxWidth="max-w-sm">
      <div className="space-y-5">
        {/* 테마 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-text-1">{t("core.sectionTheme")}</div>
          <div className="flex gap-2">
            {THEMES.map((th) => (
              <button
                key={th.value}
                type="button"
                onClick={() => setSettings({ theme: th.value })}
                className={`flex-1 rounded-md py-2 text-sm transition-colors ${
                  settings.theme === th.value
                    ? "bg-accent text-white"
                    : "bg-surface-2 text-text-1 hover:bg-border"
                }`}
              >
                {t(`core.${th.labelKey}`)}
              </button>
            ))}
          </div>
        </div>

        {/* 강조색 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-text-1">{t("core.accentColor")}</div>
          <div className="flex gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                type="button"
                aria-label={t(`core.${ACCENT_LABEL_KEY[a.value]}`)}
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
          <div className="text-sm font-semibold text-text-1">{t("core.fontSize")}</div>
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
                {t(`core.${f.labelKey}`)}
              </button>
            ))}
          </div>
        </div>

        {/* 계정: 표시 이름 */}
        <div className="space-y-2 border-t border-border pt-4">
          <div className="text-sm font-semibold text-text-1">{t("core.displayName")}</div>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              placeholder={t("core.displayName")}
            />
            <button
              type="button"
              onClick={saveName}
              disabled={savingName || !name.trim() || name.trim() === user?.display_name}
              className="rounded-md px-3 py-2 text-sm bg-accent text-white disabled:opacity-50"
            >
              {t("core.save")}
            </button>
          </div>
        </div>

        {/* 계정: 난이도 성향 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-text-1">{t("core.tendency")}</div>
          <div className="flex gap-2">
            {TENDENCIES.map((tn) => (
              <button
                key={tn.value}
                type="button"
                disabled={savingTendency}
                onClick={() => selectTendency(tn.value)}
                className={`flex-1 rounded-md py-2 text-sm transition-colors disabled:opacity-50 ${
                  (user?.tendency ?? "NORMAL") === tn.value
                    ? "bg-accent text-white"
                    : "bg-surface-2 text-text-1 hover:bg-border"
                }`}
              >
                {t(`core.${tn.labelKey}`)}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-text-2">{t("core.tendencyHint")}</p>
        </div>
      </div>
    </Modal>
  );
}
