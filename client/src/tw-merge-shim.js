/**
 * Simple direct shim for tailwind-merge
 * This avoids TypeScript and provides direct access to the core functions
 */

// Basic implementation of twMerge
export function twMerge(...inputs) {
  return inputs
    .filter(Boolean)
    .join(' ')
    .trim();
}

// Implementation of extend that's compatible with tailwind-merge
export function extend(config) {
  return function(...inputs) {
    return inputs
      .filter(Boolean)
      .join(' ')
      .trim();
  };
}

// Default export
export default {
  twMerge,
  extend
}; 