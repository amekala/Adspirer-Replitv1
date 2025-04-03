import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "adspirer-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove both classes and add the current theme
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    
    // Custom CSS variables for vibrant startup look
    if (theme === "dark") {
      root.style.setProperty("--gradient-primary", "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)");
      root.style.setProperty("--gradient-secondary", "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)");
      root.style.setProperty("--gradient-accent", "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)");
      root.style.setProperty("--bg-primary", "#0f172a");
      root.style.setProperty("--bg-secondary", "#1e293b");
      root.style.setProperty("--text-primary", "#f8fafc");
      root.style.setProperty("--text-secondary", "#cbd5e1");
      root.style.setProperty("--accent-color", "#8b5cf6");
      root.style.setProperty("--accent-color-hover", "#a78bfa");
      root.style.setProperty("--border-color", "rgba(148, 163, 184, 0.2)");
    }
    
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  const value = {
    theme,
    setTheme: (t: Theme) => {
      setTheme(t);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
}; 