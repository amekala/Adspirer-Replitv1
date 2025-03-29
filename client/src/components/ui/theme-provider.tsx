import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

// Function to detect system color scheme preference
const getSystemTheme = (): Theme => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark'; // Default fallback
};

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "adspirer-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => {
      // Try to get from localStorage first
      const storedTheme = localStorage.getItem(storageKey) as Theme;
      if (storedTheme) return storedTheme;
      
      // If not in localStorage, use system preference or default
      return getSystemTheme() || defaultTheme;
    }
  );

  useEffect(() => {
    const root = window.document.documentElement;

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
    } else {
      root.style.setProperty("--gradient-primary", "linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%)");
      root.style.setProperty("--gradient-secondary", "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)");
      root.style.setProperty("--gradient-accent", "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)");
      root.style.setProperty("--bg-primary", "#ffffff");
      root.style.setProperty("--bg-secondary", "#f8fafc");
      root.style.setProperty("--text-primary", "#0f172a");
      root.style.setProperty("--text-secondary", "#334155");
      root.style.setProperty("--accent-color", "#6366f1");
      root.style.setProperty("--accent-color-hover", "#4f46e5");
      root.style.setProperty("--border-color", "rgba(148, 163, 184, 0.2)");
    }
    
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      // Only update if user hasn't explicitly chosen a theme
      const storedTheme = localStorage.getItem(storageKey);
      if (!storedTheme) {
        setTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [storageKey]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      setTheme(theme);
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