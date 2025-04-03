import React, { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ThemeToggleProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

// Function to determine system theme preference
const getSystemTheme = (): "light" | "dark" => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark'; // Default fallback
};

export function ThemeToggle({ variant = "outline", size = "icon" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(getSystemTheme());
  const [isUsingSystem, setIsUsingSystem] = useState<boolean>(false);
  
  // Check if current theme matches system preference
  useEffect(() => {
    const storedTheme = localStorage.getItem("adspirer-ui-theme");
    setIsUsingSystem(!storedTheme); // If no stored theme, assuming system preference
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
      // If using system theme, update active theme
      if (isUsingSystem) {
        setTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [setTheme, isUsingSystem]);

  // Function to use system preference
  const useSystemTheme = () => {
    setIsUsingSystem(true);
    localStorage.removeItem("adspirer-ui-theme"); // Remove stored preference
    setTheme(systemTheme); // Apply current system preference
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="focus-visible:ring-0">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => { setTheme("light"); setIsUsingSystem(false); }}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
          {theme === 'light' && !isUsingSystem && <span className="ml-2">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setTheme("dark"); setIsUsingSystem(false); }}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
          {theme === 'dark' && !isUsingSystem && <span className="ml-2">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={useSystemTheme}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
          {isUsingSystem && <span className="ml-2">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 