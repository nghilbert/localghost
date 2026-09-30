import { execFileSync } from "node:child_process";
import { connect } from "node:net";
import { availableParallelism } from "node:os";
import { PrismaPg } from "@prisma/adapter-pg";
import type { TestProject } from "vitest/node";
import { PrismaClient } from "#/generated/prisma/client";
import { workerDatabaseUrl } from "./db-worker-url";

/** Whether anything accepts TCP connections at the URL's host and port. */
function isReachable(url: URL): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = connect({ host: url.hostname, port: Number(url.port || 5432) });
		socket.once("connect", () => {
			socket.end();
			resolve(true);
		});
		socket.once("error", () => resolve(false));
	});
}

/**
 * Vitest global setup for the server project: starts Postgres if needed, resets the test
 * database, then copies it once per worker so test files can run in parallel.
 */
export default async function setup(project: TestProject) {
	const testUrl = process.env.TEST_DATABASE_URL;
	if (!testUrl) throw new Error("TEST_DATABASE_URL must be set for server tests");
	if (testUrl === process.env.DATABASE_URL) {
		throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL because setup resets it");
	}

	// Skipped when Postgres is already up, including inside the web-dev container, which has no Docker CLI.
	if (!(await isReachable(new URL(testUrl)))) {
		execFileSync("docker", ["compose", "up", "db", "--detach", "--wait"], { stdio: "inherit" });
	}

	execFileSync("npx", ["prisma", "migrate", "reset", "--force"], {
		env: { ...process.env, DATABASE_URL: testUrl },
		stdio: "inherit",
	});

	// A template database cannot have open connections, so the copies are made from `postgres`.
	const adminUrl = new URL(testUrl);
	adminUrl.pathname = "/postgres";
	const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: adminUrl.href }) });
	const template = databaseName(testUrl);
	// `maxWorkers` is unset unless configured, and Vitest then picks at most one worker per CPU.
	const workers =
		project.config.maxWorkers || project.globalConfig.maxWorkers || availableParallelism();
	try {
		for (let poolId = 1; poolId <= workers; poolId++) {
			const copy = databaseName(workerDatabaseUrl({ testUrl, poolId }));
			await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${copy}" WITH (FORCE)`);
			await admin.$executeRawUnsafe(`CREATE DATABASE "${copy}" TEMPLATE "${template}"`);
		}
	} finally {
		await admin.$disconnect();
	}
}

/** The database name in a Postgres URL. */
function databaseName(url: string): string {
	return decodeURIComponent(new URL(url).pathname.slice(1));
}
