/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#F6F2EE",
        surface: "#EFE8E1",
        ink: {
          DEFAULT: "#0B0B0C",
          light: "#1A1A1D"
        },
        muted: "#6B6660",
        line: "rgba(11, 11, 12, 0.08)",
        accent: {
          DEFAULT: "#8E5D34",
          soft: "#D9B79A",
          glow: "rgba(176, 122, 74, 0.22)"
        },
        glass: {
          DEFAULT: "rgba(255, 255, 255, 0.42)",
          2: "rgba(255, 255, 255, 0.62)",
          edge: "rgba(255, 255, 255, 0.70)"
        }
      },
      fontFamily: {
        display: ["Raleway", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        italic: ["PlayfairDisplay", "serif"],
      },
      boxShadow: {
        "glass": "0 30px 60px -30px rgba(11,11,12,.25), inset 0 2px 0 rgba(255,255,255,.6)"
      }
    },
  },
  plugins: [],
}
