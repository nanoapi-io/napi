// /** @type {import('tailwindcss').Config} */

const config = {
  darkMode: "selector",
  important: true,
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Add your JSX/TSX files here
  ],
  theme: {
    extend: {
      fontFamily: {
        jakarta: ['"Plus Jakarta Sans"', "sans-serif"],
      },
      colors: {
        background: {
          dark: "#0B0A32",
          light: "#F9FAFB",
        },
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
        border: {
          dark: "#3A397C",
          light: "#BDBDBD",
        },
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
        },
        secondary: {
          dark: "#E43F8C",
          light: "#F1729E",
        },
        focus: {
          dark: "#695AF0",
          light: "#7B74FF",
        },
        highlight: {
          dark: "#FFB800",
          light: "#FFB800",
        },
      },
    },
  },
  plugins: [],
};

export default config;
