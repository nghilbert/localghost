import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					environment: "node",
					include: ["src/**/*.test.ts"],
					exclude: ["src/**/*.server.test.ts"],
				},
			},
			{
				extends: true,
				plugins: [tailwindcss()],
				optimizeDeps: { exclude: ["@tanstack/react-start", "@tanstack/react-start/server"] },
				test: {
					name: "browser",
					include: ["src/**/*.test.tsx"],
					setupFiles: ["./src/test/base-ui.ts", "./src/test/browser-styles.ts"],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: "chromium" }],
					},
				},
			},
			{
				extends: true,
				test: {
					name: "server",
					environment: "node",
					include: ["src/**/*.server.test.ts"],
					testTimeout: 30_000,
					env: { BETTER_AUTH_SECRET: "test-secret-012345678901234567890123" },
					globalSetup: ["./src/test/db-setup.ts"],
					setupFiles: ["./src/test/db-worker.ts"],
				},
			},
		],
	},
	resolve: { alias: { "#": resolve(import.meta.dirname, "./src") } },
});
