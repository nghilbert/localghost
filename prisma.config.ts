import { config } from "@dotenvx/dotenvx";
import { defineConfig } from "prisma/config";

config({ ignore: ["MISSING_ENV_FILE"], quiet: true });

export default defineConfig({
	schema: "prisma/schema",
	migrations: { path: "prisma/migrations" },
	datasource: {
		url: process.env.DATABASE_URL,
		shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
	},
});
