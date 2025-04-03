import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "..", "shared"),
      // Alias tailwind-merge to our custom implementation
      "tailwind-merge": path.resolve(__dirname, "src/tw-merge-shim.js"),
      // Don't try to bundle these dependencies
      "zod": path.resolve(__dirname, "node_modules/zod"),
      "clsx": path.resolve(__dirname, "node_modules/clsx")
    }
  },
  optimizeDeps: {
    include: ['zod', 'clsx'],
    exclude: ['tailwind-merge']
  },
  build: {
    outDir: "dist",
    target: 'es2020',
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      output: {
        // Ensure our tw-merge-shim gets included in the bundle
        inlineDynamicImports: true,
        // Break dependencies into separate chunks to avoid conflicts
        manualChunks: (id) => {
          if (id.includes('tw-merge-shim')) {
            return 'utils';
          }
          if (id.includes('node_modules/clsx')) {
            return 'clsx-vendor';
          }
          if (id.includes('node_modules/react')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/react-dom')) {
            return 'react-dom-vendor';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'framer-motion-vendor';
          }
          if (id.includes('node_modules/react-hook-form')) {
            return 'react-hook-form-vendor';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
}); 