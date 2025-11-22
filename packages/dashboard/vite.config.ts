import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": [
            "@tiptap/react",
            "@tiptap/starter-kit",
            "framer-motion",
            "lucide-react",
          ],
          "form-vendor": [
            "react-hook-form",
            "@hookform/resolvers",
            "zod",
          ],
          "data-vendor": ["swr"],
          "editor-vendor": [
            "@measured/puck"
          ],
        },
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
    port: 3000,
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

