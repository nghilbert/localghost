import { runPersistenceConformance } from "@tanstack/ai-persistence/testkit";
import { beforeAll } from "vitest";
import { chatPersistence } from "#/shared/domain/chat/persistence.server";
import { prisma } from "#/shared/lib/db.server";

/**
 * The package's own compatibility gate for our `MessageStore`/`RunStore`/
 * `InterruptStore` implementations, run against a live dev Postgres (needs
 * `docker compose up db -d` + a migrated schema). `metadata`/`generationRuns`/
 * `artifacts`/`blobs` aren't implemented — this app has no use for them yet.
 *
 * The suite writes fixed ids (`run-1`, `thread-i`, ...); clear the tables
 * first so a rerun against the same dev database doesn't collide with rows
 * a previous run left behind.
 */
beforeAll(async () => {
	await prisma.chatInterrupt.deleteMany();
	await prisma.chatRun.deleteMany();
	await prisma.chatThread.deleteMany();
});

runPersistenceConformance("chatPersistence", () => chatPersistence, {
	skip: ["metadata", "generationRuns", "artifacts", "blobs"],
});
