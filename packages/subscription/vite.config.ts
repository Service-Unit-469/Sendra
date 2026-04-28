import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "/subscription",
  build: {
    // Optimize for production
    minify: "oxc",
    sourcemap: true,
  },
  server: {
    port: 3001,
    open: true,
  },
});
