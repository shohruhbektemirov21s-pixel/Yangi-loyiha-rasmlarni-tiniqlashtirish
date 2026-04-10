import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f5f7f4",
        ink: "#0f1a24",
        brand: {
          50: "#ecfbf6",
          100: "#cff6e8",
          200: "#9eeccf",
          300: "#68dfb3",
          400: "#3bcf9a",
          500: "#20b885",
          600: "#149066",
          700: "#0f6f50"
        },
        accent: {
          100: "#fff4d7",
          200: "#ffe6a7",
          300: "#ffd277"
        }
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "Segoe UI", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"]
      },
      boxShadow: {
        soft: "0 8px 30px rgba(18, 30, 45, 0.08)",
        card: "0 10px 24px rgba(13, 24, 37, 0.08)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.6)"
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at 1px 1px, rgba(15,26,36,0.06) 1px, transparent 0)"
      }
    }
  },
  plugins: []
};

export default config;
