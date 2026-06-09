import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui"]
      },
      colors: {
        brand: {
          50: "#f7f8f3",
          100: "#ecefdf",
          200: "#d9dfc0",
          300: "#bdc791",
          400: "#9ea95f",
          500: "#7f8a44",
          600: "#6a7338",
          700: "#535a2f",
          800: "#444b2a",
          900: "#3a4027"
        },
        terra: {
          50: "#fdf4f0",
          100: "#fbe5dc",
          200: "#f5c9b6",
          300: "#eda588",
          400: "#e07c57",
          500: "#c85a30",
          600: "#b44f2b",
          700: "#943f22"
        }
      },
      boxShadow: {
        premium: "0 20px 40px -25px rgba(0,0,0,0.35)"
      },
      backgroundImage: {
        dashboard:
          "radial-gradient(circle at 10% 20%, rgba(127,138,68,0.22), transparent 35%), radial-gradient(circle at 95% 10%, rgba(200,90,48,0.2), transparent 30%), linear-gradient(145deg, #fdfcf8 0%, #f8f4eb 100%)"
      }
    }
  },
  plugins: []
} satisfies Config;
