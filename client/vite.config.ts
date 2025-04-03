import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "..", "shared"),
      // Don't try to bundle these dependencies
      "zod": path.resolve(__dirname, "node_modules/zod"),
      "clsx": path.resolve(__dirname, "node_modules/clsx"),
      "tailwind-merge": path.resolve(__dirname, "node_modules/tailwind-merge")
    }
  },
  optimizeDeps: {
    include: ['zod', 'clsx', 'tailwind-merge'],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  build: {
    outDir: "dist",
    target: 'es2020',
    rollupOptions: {
      external: ['zod'],
      output: {
        globals: {
          zod: 'zod'
        },
        // Break dependencies into separate chunks to avoid conflicts
        manualChunks: (id) => {
          if (id.includes('node_modules/clsx')) {
            return 'clsx-vendor';
          }
          if (id.includes('node_modules/tailwind-merge')) {
            return 'tw-merge-vendor';
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