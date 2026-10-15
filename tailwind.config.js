/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-ui)"],
      },
      // Every theme is 4 colors: background, foreground, primary, accent.
      // All other UI tokens derive from these (tints and surfaces in
      // index.css, the rest via alpha over foreground).
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "var(--primary-tint)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          light: "var(--accent-tint)",
          // The accent as text: the nearest shade that passes AA (lib/contrast.ts).
          ink: "var(--accent-ink, hsl(var(--accent)))",
        },
        // Derived surfaces
        // Surfaces by elevation (index.css): 1 = docked panels, 2 = cards,
        // 3 = floating (popovers, menus, dialogs). Field = input fill.
        card: {
          DEFAULT: "var(--surface-2)",
          foreground: "hsl(var(--foreground))",
        },
        popover: {
          DEFAULT: "var(--surface-3)",
          foreground: "hsl(var(--foreground))",
        },
        surface: {
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        field: "var(--field)",
        muted: {
          DEFAULT: "hsl(var(--foreground) / 0.05)",
          // 0.6 unless the theme needs more to pass AA (lib/contrast.ts).
          foreground: "hsl(var(--foreground) / var(--muted-alpha, 0.6))",
        },
        // Destructive folds into accent (rose reads as warning).
        destructive: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          ink: "var(--accent-ink, hsl(var(--accent)))",
        },
        // Secondary folds into the primary tint.
        secondary: {
          DEFAULT: "var(--primary-tint)",
          foreground: "hsl(var(--primary))",
        },
        // State colours, see the note beside their definitions in index.css.
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        info: "hsl(var(--info))",
        routine: "hsl(var(--routine))",
        border: "hsl(var(--foreground) / 0.1)",
        input: "hsl(var(--foreground) / 0.15)",
        ring: "hsl(var(--primary))",
      },
      boxShadow: {
        "elev-1": "var(--elev-1)",
        "elev-2": "var(--elev-2)",
        "elev-3": "var(--elev-3)",
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
};
