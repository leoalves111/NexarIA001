import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "rgb(67 56 202)",
          50: "rgb(238 242 255)",
          100: "rgb(224 231 255)",
          200: "rgb(199 210 254)",
          300: "rgb(165 180 252)",
          400: "rgb(129 140 248)",
          500: "rgb(99 102 241)",
          600: "rgb(79 70 229)",
          700: "rgb(67 56 202)",
          800: "rgb(55 48 163)",
          900: "rgb(49 46 129)",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "rgb(34 197 94)",
          50: "rgb(240 253 244)",
          100: "rgb(220 252 231)",
          200: "rgb(187 247 208)",
          300: "rgb(134 239 172)",
          400: "rgb(74 222 128)",
          500: "rgb(34 197 94)",
          600: "rgb(22 163 74)",
          700: "rgb(21 128 61)",
          800: "rgb(22 101 52)",
          900: "rgb(20 83 45)",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
