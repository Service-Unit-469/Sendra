import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "/subscription",
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: () => {
          return `assets/[name]-[hash].js`;
        },
      },
    },
    
    // Optimize for production
    minify: "esbuild",
    sourcemap: true,
  },
  server: {
    port: 3001,
    open: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "swr",
      "jotai",
    ],
  },
});

