/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Atkinson Hyperlegible Next"', "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
      },
      // Readers may be older or on small phones: nothing under 13px. Big figures track tight, like the hero.
      fontSize: {
        xs: ["0.8125rem", { lineHeight: "1.125rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.02em" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em" }],
        "6xl": ["3.75rem", { lineHeight: "1", letterSpacing: "-0.02em" }],
      },
      colors: {
        signal: {
          DEFAULT: "hsl(var(--signal))",
          foreground: "hsl(var(--signal-foreground))",
        },
        go: {
          DEFAULT: "hsl(var(--go))",
          soft: "hsl(var(--go-soft))",
        },
        warn: {
          DEFAULT: "hsl(var(--warn))",
          soft: "hsl(var(--warn-soft))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
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
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        rise: {
          from: { opacity: 0, transform: "translateY(6px)" },
          to: { opacity: 1, transform: "none" },
        },
        pop: {
          "0%": { transform: "scale(0.55)" },
          "60%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)" },
        },
        halo: {
          from: { boxShadow: "0 0 0 0 hsl(var(--go) / 0.45)" },
          to: { boxShadow: "0 0 0 14px hsl(var(--go) / 0)" },
        },
        "grow-x": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        stamp: {
          from: { opacity: 0, transform: "scale(1.06)" },
          to: { opacity: 1, transform: "none" },
        },
        typing: {
          "0%, 60%, 100%": { opacity: 0.3, transform: "none" },
          "30%": { opacity: 1, transform: "translateY(-3px)" },
        },
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        rise: "rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
        pop: "pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) both, halo 1.4s ease-out 0.15s 2",
        "grow-x": "grow-x 0.9s cubic-bezier(0.16, 1, 0.3, 1) both",
        stamp: "stamp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        typing: "typing 1.2s ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
