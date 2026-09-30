import { workerDatabaseUrl } from "./db-worker-url";

/**
 * Server setup file: points this worker's Prisma client at its own copy of the test
 * database, made by `db-setup.ts`. Runs before test files import `db.server.ts`.
 */
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error("TEST_DATABASE_URL must be set for server tests");
process.env.DATABASE_URL = workerDatabaseUrl({
	testUrl,
	poolId: Number(process.env.VITEST_POOL_ID),
});
