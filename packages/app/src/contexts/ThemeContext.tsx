import { createContext, useState } from "react";

export const ThemeContext = createContext<{
  theme: "light" | "dark";
  changeTheme: (newTheme: "light" | "dark") => void;
}>({
  theme: "light",
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  changeTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  function getModeFromLocalStorage() {
    if (
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      localStorage.theme = "dark";
      document.documentElement.classList.add("dark");
      return "dark";
    }
    return "light";
  }

  const [theme, setTheme] = useState<"light" | "dark">(
    getModeFromLocalStorage(),
  );

  function changeTheme(newTheme: "light" | "dark") {
    localStorage.theme = newTheme;
    setTheme(newTheme);
    if (newTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
