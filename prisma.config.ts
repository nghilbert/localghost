import { config } from "@dotenvx/dotenvx";
import pgvector from "@prisma/orm-extension-pgvector/control";
import { defineConfig as ormConfig, prisma7Schema } from "@prisma/orm-postgres/config";
import { definePrismaConfig } from "prisma/config";

config({ ignore: ["MISSING_ENV_FILE"], quiet: true });

// Prisma 7 (`prisma7.config.ts`) owns migrations; Prisma 8 reads the same schema and signs the database.
export default definePrismaConfig({
	orm: ormConfig({
		contract: prisma7Schema("prisma/schema"),
		output: "src/generated/prisma8",
		db: { connection: process.env.DATABASE_URL },
		extensions: [pgvector],
	}),
	skills: { agents: ["claude", "agents"] },
});
