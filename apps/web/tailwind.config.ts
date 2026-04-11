import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        surface: "#111111",
        "surface-raised": "#1a1a1a",
        border: "#222222",
        "border-light": "#333333",
        accent: {
          blue: "#3b82f6",
          purple: "#8b5cf6",
        },
        muted: "#888888",
        "muted-foreground": "#a1a1a1",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
