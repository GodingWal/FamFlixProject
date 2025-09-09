import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"], // Enable class-based dark mode
  content: [
    "./client/index.html", 
    "./client/src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  prefix: "",
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
          DEFAULT: "hsl(var(--primary))", // Use CSS variable for consistency
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))", // Use CSS variable for consistency
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
        educational: {
          light: '#F3E8FF', // Soft purple for templates
          dark: '#6D28D9',
        },
        voice: {
          primary: '#4F46E5',
          secondary: '#10B981',
          accent: '#8B5CF6',
          muted: '#F8FAFC',
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
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "wave": {
          "0%": { transform: "scaleY(1)" },
          "50%": { transform: "scaleY(1.5)" },
          "100%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-slow": "pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "wave": "wave 1s ease-in-out infinite",
      },
      typography: (theme: any) => ({
        DEFAULT: {
          css: {
            maxWidth: 'none', // For wide educational content
            color: theme('colors.gray.700'),
            h1: {
              color: theme('colors.gray.900'),
            },
            h2: {
              color: theme('colors.gray.800'),
            },
            h3: {
              color: theme('colors.gray.800'),
            },
            strong: {
              color: theme('colors.gray.900'),
            },
            code: {
              color: theme('colors.pink.600'),
              backgroundColor: theme('colors.gray.100'),
              paddingLeft: theme('spacing.1'),
              paddingRight: theme('spacing.1'),
              borderRadius: theme('borderRadius.sm'),
            },
          },
        },
      }),
    },
  },
  plugins: [
    require("tailwindcss-animate"), 
    require("@tailwindcss/typography")
  ], // Add animations and typography for better UX
};

export default config;