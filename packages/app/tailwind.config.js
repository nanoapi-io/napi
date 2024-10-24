/** @type {import('tailwindcss').Config} */
export default {
  important: true,
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Add your JSX/TSX files here
  ],
  theme: {
    extend: {
      colors: {
        background: {
          dark: "#0B0A32",
          light: "#0B0A32",
        },
        secondaryBackground: {
          dark: "#15143D",
          light: "#15143D",
        },
        surface: {
          dark: "#3A397C",
          light: "#3A397C",
        },
        border: {
          dark: "#3A397C",
          light: "#3A397C",
        },
        text: {
          dark: "#FFFFFF",
          light: "#FFFFFF",
        },
        gray: {
          dark: "#B4B4C9",
          light: "#B4B4C9",
        },
        primary: {
          dark: "#5848E8",
          light: "#5848E8",
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
