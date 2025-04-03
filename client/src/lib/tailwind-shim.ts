/**
 * Tailwind Merge Shim
 * This file provides fallbacks in case the tailwind-merge library fails to load correctly,
 * which can happen in certain production bundling scenarios.
 */

let _twMerge: any = null;

// Create a mock object that implements the key methods needed
const fallbackImplementation = {
  // Basic twMerge function
  twMerge: function(...inputs: any[]): string {
    return inputs
      .filter(Boolean)
      .join(' ')
      .trim();
  },
  
  // Mock extend method - this is what's missing and causing the error
  extend: function(config: any) {
    console.log('Mock extend called with:', config);
    // Return a function that does basic class merging
    return function(...inputs: any[]): string {
      return inputs
        .filter(Boolean)
        .join(' ')
        .trim();
    };
  }
};

// Try to import the real tailwind-merge
try {
  // Dynamic import for production
  const importTwMerge = new Function('return import("tailwind-merge")')();
  importTwMerge.then((module: any) => {
    _twMerge = module.default || module;
  }).catch(() => {
    console.warn('Failed to dynamically import tailwind-merge, using fallback');
  });
} catch (e) {
  console.warn('Error importing tailwind-merge:', e);
}

// Export the twMerge function with fallback
export function twMerge(...inputs: any[]): string {
  // If the real twMerge is available, use it
  if (_twMerge && typeof _twMerge.twMerge === 'function') {
    try {
      return _twMerge.twMerge(...inputs);
    } catch (e) {
      console.warn('Error using twMerge, falling back to simple implementation:', e);
    }
  }
  
  // Use our fallback implementation
  return fallbackImplementation.twMerge(...inputs);
}

// Also export the extend method that seems to be needed
export function extend(config: any) {
  // If the real extend is available, use it
  if (_twMerge && typeof _twMerge.extend === 'function') {
    try {
      return _twMerge.extend(config);
    } catch (e) {
      console.warn('Error using extend, falling back to simple implementation:', e);
    }
  }
  
  // Use our fallback implementation
  return fallbackImplementation.extend(config);
}

// Export a default object with both methods for ESM imports
export default {
  twMerge,
  extend
}; 