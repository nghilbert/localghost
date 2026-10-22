import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { connect } from "node:net";
import { availableParallelism } from "node:os";
import { PrismaPg } from "@prisma/adapter-pg";
import type { TestProject } from "vitest/node";
import { PrismaClient } from "#/generated/prisma/client";

/** Whether anything accepts TCP connections at the URL's host and port. */
function isReachable(url: URL): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = connect({ host: url.hostname, port: Number(url.port || 5432) });
		socket.once("connect", () => {
			socket.end();
			resolve(true);
		});
		socket.once("error", () => {
			resolve(false);
		});
	});
}

/**
 * Vitest global setup for the `db` project: starts Postgres if needed, migrates a database
 * named for this run, then copies it once per worker so test files can run in parallel. The
 * run id keeps overlapping runs apart, and the returned teardown drops the run's databases.
 */
export default async function setup(project: TestProject) {
	const testUrl = process.env.TEST_DATABASE_URL;
	if (!testUrl) throw new Error("TEST_DATABASE_URL must be set for database tests");

	// Skipped when Postgres is already up, including inside the web-dev container, which has no Docker CLI.
	if (!(await isReachable(new URL(testUrl)))) {
		execFileSync("docker", ["compose", "up", "db", "--detach", "--wait"], { stdio: "inherit" });
	}

	const runUrl = new URL(testUrl);
	runUrl.pathname = `${runUrl.pathname}_${randomBytes(4).toString("hex")}`;
	const template = databaseName(runUrl.href);
	// `maxWorkers` is unset unless configured, and Vitest then picks at most one worker per CPU.
	const workers =
		project.config.maxWorkers || project.globalConfig.maxWorkers || availableParallelism();
	const workerUrls = Array.from({ length: workers }, (_, i) => {
		const url = new URL(runUrl);
		url.pathname = `${runUrl.pathname}_${i + 1}`;
		return url.href;
	});
	const copies = workerUrls.map(databaseName);

	// A template database cannot have open connections, so the copies are made from `postgres`.
	const adminUrl = new URL(testUrl);
	adminUrl.pathname = "/postgres";
	const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: adminUrl.href }) });
	const dropAll = async () => {
		for (const name of [...copies, template]) {
			await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
		}
		await admin.$disconnect();
	};

	try {
		await admin.$executeRawUnsafe(`CREATE DATABASE "${template}"`);
		execFileSync("npx", ["prisma", "migrate", "deploy"], {
			env: { ...process.env, DATABASE_URL: runUrl.href },
			stdio: "inherit",
		});
		for (const copy of copies) {
			await admin.$executeRawUnsafe(`CREATE DATABASE "${copy}" TEMPLATE "${template}"`);
		}
	} catch (error) {
		await dropAll();
		throw error;
	}

	project.provide("workerDatabaseUrls", workerUrls);
	return dropAll;
}

/** The database name in a Postgres URL. */
function databaseName(url: string): string {
	return decodeURIComponent(new URL(url).pathname.slice(1));
}

declare module "vitest" {
	export interface ProvidedContext {
		/** Each worker's copy of this run's database, indexed by `VITEST_POOL_ID - 1`. */
		workerDatabaseUrls: string[];
	}
}
