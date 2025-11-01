import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: "jsdom",
		include: ["test/**/*.test.{ts,tsx}"],
		exclude: ["e2e/**", "node_modules/**"],
		setupFiles: ["test/setup.tsx"],
		coverage: {
			enabled: true,
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/**",
				"test/**",
				"e2e/**",
				"dist/**",
				".next/**",
				"**/*.config.{js,ts}",
				"**/*.d.ts",
			],
			thresholds: {
				statements: 15,
				branches: 15,
				functions: 10,
				lines: 15,
			},
		},
		css: true,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@/components": path.resolve(__dirname, "./src/components"),
			"@/lib": path.resolve(__dirname, "./src/lib"),
			"@/pages": path.resolve(__dirname, "./src/pages"),
			"@/layouts": path.resolve(__dirname, "./src/layouts"),
		},
	},
});

