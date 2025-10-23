import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["test/**/*.test.ts"],
		setupFiles: ["test/setup.ts"],
		coverage: {
			enabled: true,
			provider: "v8",
			reporter: ["text", "json", "html"],
			thresholds: {
				statements: 80,
				branches: 80,
				functions: 80,
				lines: 80,
			},
		},
		minWorkers: 1,
		maxWorkers: 2,
		hookTimeout: 60000,
	},
});

