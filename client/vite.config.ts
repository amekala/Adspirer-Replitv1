import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "..", "shared"),
      // Don't try to bundle zod, use it as an external dependency
      "zod": path.resolve(__dirname, "node_modules/zod")
    }
  },
  optimizeDeps: {
    include: ['zod']
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      external: ['zod'],
      output: {
        globals: {
          zod: 'zod'
        },
        manualChunks: {
          vendor: [
            'react', 
            'react-dom', 
            'react-hook-form',
            'framer-motion',
            'tailwind-merge',
            'clsx'
          ]
        }
      }
    }
  }
}); 