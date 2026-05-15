// Theme color constants (mirrors CSS variables in globals.css).
// Use these in inline styles where Tailwind classes cannot reach (SVG, dynamic).

export const colors = {
  bgBase: "#0D1117",
  bgSurface: "#161B22",
  bgSurface2: "#21262D",
  border: "#30363D",
  text1: "#E6EDF3",
  text2: "#8B949E",
  accent: "#8B5CF6",
  success: "#06D6A0",
  gold: "#FFD700",
  danger: "#FF6B6B"
} as const;

export type ColorKey = keyof typeof colors;

export const gradeColor: Record<string, string> = {
  COMMON: colors.success,
  RARE: colors.accent,
  EPIC: colors.gold,
  LEGENDARY: colors.danger
};
