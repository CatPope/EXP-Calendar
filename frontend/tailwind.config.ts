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
        base: "#0D1117",
        surface: "#161B22",
        "surface-2": "#21262D",
        border: "#30363D",
        "text-1": "#E6EDF3",
        "text-2": "#8B949E",
        accent: "#8B5CF6",
        success: "#06D6A0",
        gold: "#FFD700",
        danger: "#FF6B6B"
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
