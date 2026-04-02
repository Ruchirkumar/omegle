/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#090f1f",
          900: "#0f172d",
          800: "#1b2742"
        },
        aqua: {
          300: "#5ef0d6",
          400: "#30d7be",
          500: "#16b9a2"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(94,240,214,0.2), 0 10px 30px rgba(7,19,35,0.45)"
      },
      animation: {
        pulseSoft: "pulseSoft 2.2s ease-in-out infinite",
        slideUp: "slideUp 0.35s ease-out"
      },
      keyframes: {
        pulseSoft: {
          "0%,100%": { opacity: "0.75" },
          "50%": { opacity: "1" }
        },
        slideUp: {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" }
        }
      }
    }
  },
  plugins: []
};
