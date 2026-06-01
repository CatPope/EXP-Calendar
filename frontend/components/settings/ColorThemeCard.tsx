"use client";

import { Check } from "lucide-react";
import type { ColorPreset } from "./prefs";

interface PresetMeta {
  value: ColorPreset;
  name: string;
  /** 미리보기 스와치 2색 — 팔레트 프리뷰이므로 리터럴 hex 허용(요구사항 명시 예외). */
  swatch: [string, string];
}

// 4종 + 라이트. cosmic/daylight 만 실제 store 테마(dark/light)와 매핑된다.
// gameboy/synthwave/amber 는 globals.css 변형이 범위 밖이라 선택만 영구화되는
// 시각적 프리셋(실제 팔레트 적용은 추후 globals.css 변형 추가 시).
const PRESETS: PresetMeta[] = [
  { value: "cosmic", name: "Cosmic Purple", swatch: ["#8B5CF6", "#06D6A0"] },
  { value: "gameboy", name: "Game Boy", swatch: ["#9BBC0F", "#306230"] },
  { value: "synthwave", name: "Synthwave", swatch: ["#FF2E97", "#00E5FF"] },
  { value: "amber", name: "Amber CRT", swatch: ["#FFB000", "#FF7A00"] },
  { value: "daylight", name: "Daylight (라이트)", swatch: ["#F6F8FA", "#8B5CF6"] },
];

interface Props {
  value: ColorPreset;
  onSelect: (preset: ColorPreset) => void;
}

export default function ColorThemeCard({ value, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {PRESETS.map((p) => {
        const active = p.value === value;
        return (
          <button
            key={p.value}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(p.value)}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
              active
                ? "border-accent bg-accent/10"
                : "border-border bg-surface-2 hover:bg-border"
            }`}
          >
            <span className="flex shrink-0 gap-1">
              <span
                className="h-4 w-4 rounded-sm"
                style={{ backgroundColor: p.swatch[0] }}
              />
              <span
                className="h-4 w-4 rounded-sm"
                style={{ backgroundColor: p.swatch[1] }}
              />
            </span>
            <span className="flex-1 text-sm text-text-1">{p.name}</span>
            {active ? <Check className="h-4 w-4 text-accent" /> : null}
          </button>
        );
      })}
    </div>
  );
}
