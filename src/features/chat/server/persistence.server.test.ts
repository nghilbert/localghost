import { runPersistenceConformance } from "@tanstack/ai-persistence/testkit";
import { beforeAll } from "vitest";
import { resetDb } from "#/test/db.server";
import { chatPersistence } from "./persistence.server";

/**
 * The package's own conformance suite for our stores. The stores this app does not use
 * are skipped. The suite reuses fixed ids, so the database is emptied once first.
 */
beforeAll(resetDb);

runPersistenceConformance("chatPersistence", () => chatPersistence, {
	skip: ["metadata", "generationRuns", "artifacts", "blobs"],
	checks: ["messages.metadata", "runs.listByThread.state"],
});
