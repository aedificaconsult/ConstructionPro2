/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
      },
      colors: {
        gold: {
          DEFAULT: "#C8A96E",
          light: "#E8C98E",
          dark: "#A8893E",
        },
        navy: {
          DEFAULT: "#1A1F2E",
          dark: "#111520",
          surface: "#232838",
          "surface-light": "#2D3447",
          border: "#3A4255",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease forwards",
        "scale-in": "scaleIn 0.25s ease forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
