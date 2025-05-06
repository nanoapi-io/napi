import animate from "tailwindcss-animate";

const config = {
  darkMode: ["selector", "class"],
  important: true,
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        jakarta: ['"Plus Jakarta Sans"', "sans-serif"],
      },
      colors: {
        background: "#ffffff",
        secondaryBackground: {
          dark: "#15143D",
          light: "#E5E7EB",
        },
        surface: {
          dark: "#3A397C",
          light: "#FFFFFF",
        },
        secondarySurface: {
          dark: "#25235C",
          light: "#F0F1F3",
        },
        border: "#e2e8f0",
        text: {
          dark: "#FFFFFF",
          light: "#333333",
        },
        gray: {
          dark: "#B4B4C9",
          light: "#6B7280",
        },
        primary: {
          dark: "#695AF0",
          light: "#9F99FF",
          DEFAULT: "#7B74FF",
          foreground: "#ffffff",
        },
        secondary: {
          dark: "#E43F8C",
          light: "#F1729E",
          DEFAULT: "#F1729E",
          foreground: "#ffffff",
        },
        focus: {
          dark: "#695AF0",
          light: "#7B74FF",
        },
        highlight: {
          dark: "#FFB800",
          light: "#FFB800",
        },
        foreground: "#020817",
        card: {
          DEFAULT: "#ffffff",
          foreground: "#020817",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#020817",
        },
        muted: {
          DEFAULT: "#f1f5f9",
          foreground: "#64748b",
        },
        accent: {
          DEFAULT: "#f1f5f9",
          foreground: "#020817",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        input: "#ffffff",
        ring: "#7B74FF",
        chart: {
          "1": "#7B74FF",
          "2": "#F1729E",
          "3": "#FFB800",
          "4": "#695AF0",
          "5": "#E43F8C",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [animate],
};

export default config;
