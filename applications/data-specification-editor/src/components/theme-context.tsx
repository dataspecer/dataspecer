import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const readTheme = (): Theme => {
  try {
    const theme = localStorage.getItem("theme");
    return theme === "light" || theme === "dark" || theme === "system" ? theme : "system";
  } catch {
    return "system";
  }
};

const resolveTheme = (theme: Theme, systemIsDark: boolean): "light" | "dark" =>
  theme === "system" ? (systemIsDark ? "dark" : "light") : theme;

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() =>
    resolveTheme(theme, window.matchMedia("(prefers-color-scheme: dark)").matches),
  );

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    try {
      localStorage.setItem("theme", nextTheme);
    } catch {
      // The selected theme still applies when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key !== "theme") return;
      const storedTheme = event.newValue;
      setThemeState(storedTheme === "light" || storedTheme === "dark" || storedTheme === "system" ? storedTheme : "system");
    };

    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  useEffect(() => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const resolved = resolveTheme(theme, systemTheme.matches);
      setResolvedTheme(resolved);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(resolved);
      document.documentElement.style.colorScheme = resolved;
    };

    applyTheme();
    if (theme === "system") {
      systemTheme.addEventListener("change", applyTheme);
      return () => systemTheme.removeEventListener("change", applyTheme);
    }
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return context;
};
