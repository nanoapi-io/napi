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
        foreground: {
          dark: "#212047",
          light: "#FFFFFF",
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
          darkPurple: "#2B2A51",
          darkGray: "#35345B",
          darkHighlight: "#5848E8",
          lightHighlight: "#4F46E5",
          light: "#BDBDBD",
        },
        card: {
          borderDark: "#35345B",
          borderLight: "#E5E7EB",
        },
        text: {
          dark: "#FFFFFF",
          darkInfo: "#7775AC",
          darkHighlight: "#B428BE",
          light: "#333333",
          lightInfo: "#6B7280",
          lightHighlight: "#B428BE",
          gray: "#838293",
        },
        gray: {
          dark: "#B4B4C9",
          light: "#6B7280",
        },
        primary: {
          dark: "#5848E8",
          hoverDark: "#392ea0",
          light: "#4F46E5",
          hoverLight: "#3c37b0",
        },
        secondary: {
          dark: "#D62B80",
          light: "#D62B80",
        },
        hover: {
          mid: "#0000000D",
          dark: "#00000033",
          light: "#FFFFFF0D",
          translucentLight: "#FFFFFF00",
        },
        search: {
          bgDark: "#2C2C50",
          bgLight: "#F0F1F3",
        },
      },
    },
  },
  plugins: [],
};
