import { inject } from "vitest";

/**
 * `db` setup file: points this worker's Prisma client at its own copy of the run's
 * database, made by `db-setup.ts`. Runs before test files import `db.server.ts`.
 */
const url = inject("workerDatabaseUrls")[Number(process.env.VITEST_POOL_ID) - 1];
if (!url) throw new Error(`No test database for pool ${process.env.VITEST_POOL_ID ?? "?"}`);
process.env.DATABASE_URL = url;
