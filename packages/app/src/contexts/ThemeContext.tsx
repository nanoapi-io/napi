import { createContext, type ReactNode, useState } from "react";

export const lightTheme = "light";
export const darkTheme = "dark";
export type Theme = typeof lightTheme | typeof darkTheme;

export const ThemeContext = createContext<{
  theme: Theme;
  changeTheme: (newTheme: Theme) => void;
}>({
  theme: lightTheme,
  changeTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  function getModeFromLocalStorage() {
    if (
      localStorage.theme === darkTheme ||
      (!("theme" in localStorage) &&
        globalThis.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      localStorage.theme = darkTheme;
      document.documentElement.classList.add(darkTheme);
      return darkTheme;
    }
    return lightTheme;
  }

  const [theme, setTheme] = useState<Theme>(getModeFromLocalStorage());

  function changeTheme(newTheme: Theme) {
    localStorage.theme = newTheme;
    setTheme(newTheme);
    if (newTheme === lightTheme) {
      document.documentElement.classList.remove(darkTheme);
    } else {
      document.documentElement.classList.add(darkTheme);
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
