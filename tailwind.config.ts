import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#05080C",
        panel: "#0B1017",
        "panel-raised": "#111822",
        hairline: "rgba(255,255,255,0.08)",
        text: {
          1: "#EDF2F5",
          2: "#8FA1B0",
          3: "#566574",
        },
        teal: "#2FE0CB",
        blue: "#2E7CF6",
        positive: "#35D0A6",
        negative: "#E2685A",
        warning: "#E0A93C",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      backgroundImage: {
        "tide-gradient": "linear-gradient(135deg, #2FE0CB 0%, #2E7CF6 100%)",
        "tide-radial": "radial-gradient(circle at top, rgba(47,224,203,0.10), transparent 60%)",
      },
      boxShadow: {
        instrument: "0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px -20px rgba(0,0,0,0.6)",
        glow: "0 0 40px rgba(47,224,203,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
