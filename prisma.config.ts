import { config } from "@dotenvx/dotenvx";
import { definePrismaConfig } from "@prisma/cli-engine";
import { defineConfig } from "@prisma/orm-postgres/config";

config({ ignore: ["MISSING_ENV_FILE"], quiet: true });

export default definePrismaConfig({
	orm: defineConfig({
		contract: "./src/prisma/contract.ts",
		db: { connection: process.env.DATABASE_URL },
	}),
});
