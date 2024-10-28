/** @type {import('tailwindcss').Config} */
export default {
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
          dark: "#5848E8",
          light: "#4F46E5",
        },
        secondary: {
          dark: "#D62B80",
          light: "#D62B80",
        },
      },
    },
  },
  plugins: [],
};
