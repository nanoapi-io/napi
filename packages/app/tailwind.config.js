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
        current: "currentColor",
        transparent: "transparent",
        white: "#FFFFFF",
        dark: {
          DEFAULT: "#030014",
          2: "#495270",
          3: "#918EA0",
          4: "#8D93A5",
          5: "#BBBEC9",
          6: "#191625",
          7: "#0F0C1F",
          8: "#100D20",
        },
        purple: {
          DEFAULT: "#8646F4",
          dark: "#6D28D9",
          "dark-2": "#5B21B6",
          light: "#A78BFA",
          "light-2": "#C4B5FD",
          "light-3": "#DDD6FE",
          "light-4": "#EDE9FE",
          "light-5": "#F5F3FF",
        },
        pink: {
          DEFAULT: "#D345F8",
          dark: "#C814F6",
          light: "#DF76FA",
          "light-2": "#EAA7FC",
          "light-3": "#F6D8FE",
          "light-4": "#FCF1FE",
        },
      },
    },
  },
  plugins: [],
};
