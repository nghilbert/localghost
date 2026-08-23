import { resolve } from "node:path";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		projects: [
			{
				extends: true,
				test: { name: "unit", environment: "node", include: ["src/**/*.test.ts"] },
			},
			{
				extends: true,
				optimizeDeps: { exclude: ["@tanstack/react-start", "@tanstack/react-start/server"] },
				test: {
					name: "browser",
					include: ["src/**/*.test.tsx"],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: "chromium" }],
					},
				},
			},
		],
	},
	resolve: { alias: { "#": resolve(import.meta.dirname, "./src") } },
});
