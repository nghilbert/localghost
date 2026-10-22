import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import { msw } from "msw/vite";
import { defineConfig } from "vitest/config";

const BETTER_AUTH_SECRET = "test-secret-012345678901234567890123";

export default defineConfig({
	test: {
		globals: true,
		unstubEnvs: true,
		unstubGlobals: true,
		restoreMocks: true,
		coverage: {
			include: ["src/**/*.{ts,tsx}"],
			exclude: ["src/generated/**", "src/routeTree.gen.ts", "src/test/**"],
			reportsDirectory: ".vitest/coverage",
		},
		projects: [
			{
				test: {
					name: "unit",
					environment: "node",
					include: ["src/**/*.test.ts"],
					exclude: ["src/**/*.db.test.ts"],
					setupFiles: ["./src/test/faker-seed.ts"],
					env: {
						BETTER_AUTH_SECRET,
						// Unresolvable, so a database test outside the `db` project fails instead of reaching the dev database.
						DATABASE_URL: "postgresql://unset.invalid/unit",
					},
				},
			},
			{
				plugins: [tailwindcss(), msw({ mode: "worker-only" })],
				optimizeDeps: { exclude: ["@tanstack/react-start", "@tanstack/react-start/server"] },
				test: {
					name: "browser",
					include: ["src/**/*.test.tsx"],
					setupFiles: ["./src/test/faker-seed.ts", "./src/test/browser-styles.ts"],
					browser: {
						enabled: true,
						headless: true,
						// Reduced motion zeroes transitions, so Base UI closes popups without waiting on them.
						provider: playwright({ contextOptions: { reducedMotion: "reduce" } }),
						instances: [{ browser: "chromium" }],
					},
				},
			},
			{
				test: {
					name: "db",
					environment: "node",
					include: ["src/**/*.db.test.ts"],
					testTimeout: 30_000,
					env: { BETTER_AUTH_SECRET },
					globalSetup: ["./src/test/db-setup.ts"],
					setupFiles: ["./src/test/faker-seed.ts", "./src/test/db-worker.ts"],
				},
			},
		],
	},
	resolve: { alias: { "#": path.resolve(import.meta.dirname, "./src") } },
});
