/**
 * Tailwind Merge Shim
 * This file provides fallbacks in case the tailwind-merge library fails to load correctly,
 * which can happen in certain production bundling scenarios.
 */

let _twMerge: any = null;

// Try to import the real tailwind-merge
try {
  // Dynamic import for production
  const importTwMerge = new Function('return import("tailwind-merge")')();
  importTwMerge.then((module: any) => {
    _twMerge = module.twMerge;
  }).catch(() => {
    console.warn('Failed to dynamically import tailwind-merge, using fallback');
  });
} catch (e) {
  console.warn('Error importing tailwind-merge:', e);
}

// Fallback implementation if the real one fails to load
export function twMerge(...inputs: any[]): string {
  // If the real twMerge is available, use it
  if (_twMerge) {
    try {
      return _twMerge(...inputs);
    } catch (e) {
      console.warn('Error using twMerge, falling back to simple implementation:', e);
    }
  }
  
  // Fallback implementation: just join all inputs with a space
  return inputs
    .filter(Boolean)
    .join(' ')
    .trim();
} 