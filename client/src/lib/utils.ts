import { clsx, type ClassValue } from "clsx"
// Use our simple JS shim for maximum compatibility
// @ts-ignore - Ignoring TS error for the JS shim
import { twMerge } from "../tw-merge-shim.js"

// Simple implementation that doesn't rely on external libraries
export function cn(...inputs: ClassValue[]): string {
  try {
    // Convert inputs to string array first
    const classes: string[] = inputs.map(input => {
      if (typeof input === 'string') return input
      if (!input) return ''
      // Handle arrays recursively
      if (Array.isArray(input)) return cn(...input)
      // Convert objects to class strings
      if (typeof input === 'object') {
        return Object.keys(input)
          .filter(key => Boolean((input as Record<string, boolean>)[key]))
          .join(' ')
      }
      return String(input)
    })
    
    // Use clsx if available, otherwise fallback
    const combined: string = typeof clsx === 'function' 
      ? clsx(inputs)
      : classes.join(' ')
    
    // Use twMerge if available, otherwise use the combined string
    return typeof twMerge === 'function'
      ? twMerge(combined)
      : combined
  } catch (e) {
    console.warn('Error in cn utility function:', e)
    // Ultimate fallback - just join strings
    return inputs
      .filter(Boolean)
      .map(i => String(i))
      .join(' ')
      .trim()
  }
}
