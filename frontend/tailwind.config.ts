import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: "rgb(var(--bg-base) / <alpha-value>)",
        surface: "rgb(var(--bg-surface) / <alpha-value>)",
        "surface-2": "rgb(var(--bg-surface-2) / <alpha-value>)",
        border: "rgb(var(--border-default) / <alpha-value>)",
        "text-1": "rgb(var(--text-1) / <alpha-value>)",
        "text-2": "rgb(var(--text-2) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        gold: "rgb(var(--gold) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans KR", "system-ui", "sans-serif"]
      },
      animation: {
        "pulse-fast": "pulse 0.6s cubic-bezier(0.4, 0, 0.6, 1) 2",
        "level-up": "levelUp 0.8s ease-out",
        "toast-in": "toastIn 0.3s ease-out"
      },
      keyframes: {
        levelUp: {
          "0%": { transform: "scale(1)", filter: "brightness(1)" },
          "50%": { transform: "scale(1.15)", filter: "brightness(1.5)" },
          "100%": { transform: "scale(1)", filter: "brightness(1)" }
        },
        toastIn: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        }
      }
    }
  },
  plugins: []
};

export default config;
