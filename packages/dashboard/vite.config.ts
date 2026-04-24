import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "/dashboard",
  build: {
    rollupOptions: {
      output: {
      },
    },

    // Optimize for production
    minify: "oxc",
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});
