/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#08090d",
          900: "#0d0e14",
          800: "#13141d",
          700: "#1a1c27",
          600: "#252836",
          500: "#3a3e50",
          400: "#5a5f76",
          300: "#8a90a8",
          200: "#b9bdcd",
          100: "#e2e4ed",
          50:  "#f4f5f9",
        },
        accent: {
          DEFAULT: "#7c5cff",
          soft:    "#a892ff",
          glow:    "#7c5cff66",
        },
        sepia: {
          bg:       "#f5e9d3",
          surface:  "#ecdcc0",
          border:   "#d6c39e",
          text:     "#3a3128",
          textSoft: "#6b5a48",
          accent:   "#a0521a",
        },
        paper: {
          bg:       "#f8f7f4",
          surface:  "#ffffff",
          border:   "#e7e4dd",
          text:     "#1a1a1a",
          textSoft: "#4a4a4a",
          accent:   "#5a3df0",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "sans-serif"],
        serif: ["\"Source Serif Pro\"", "\"Source Serif 4\"", "\"Lora\"", "Georgia", "serif"],
      },
      boxShadow: {
        glow: "0 0 24px 4px rgba(124,92,255,0.30)",
      },
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};
