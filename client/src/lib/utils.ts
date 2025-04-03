import { clsx, type ClassValue } from "clsx"
import { twMerge } from "./tailwind-shim"

// More resilient implementation with error handling
export function cn(...inputs: ClassValue[]) {
  try {
    // First try the standard approach
    return twMerge(clsx(inputs))
  } catch (e) {
    console.warn('Error in cn utility function:', e)
    // Fallback implementation if twMerge or clsx fails
    return inputs
      .filter(Boolean)
      .join(' ')
      .trim()
  }
}
