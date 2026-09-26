import { memoryStream, type RunStore, type StreamChunk } from "@tanstack/ai";
import { EventType } from "@tanstack/ai/client";
import { describe, expect, it, vi } from "vitest";

/** Writes a finished run's log, as a completed stream leaves it for a reconnect. */
async function finishedLog({ runId, chunks }: { runId: string; chunks: StreamChunk[] }) {
	const log = memoryStream({ runId });
	await log.append(chunks);
	await log.close();
}

import { readRunParams, resumeRunResponse, streamRunResponse } from "#/lib/llm-stream.server";

function postJson(body: string) {
	return new Request("http://localhost/api/chat/stream", { method: "POST", body });
}

const runBody = {
	threadId: "thread-1",
	runId: "run-1",
	messages: [],
	tools: [],
	context: [],
};

describe("readRunParams", () => {
	it("reads a well-formed AG-UI run", async () => {
		const read = await readRunParams({
			request: postJson(JSON.stringify(runBody)),
			maxBytes: 1024,
		});

		if (!read.ok) throw new Error("expected the run to parse");
		expect(read.params.threadId).toBe("thread-1");
		expect(read.params.runId).toBe("run-1");
	});

	it("answers unparseable JSON with 400", async () => {
		const read = await readRunParams({ request: postJson("{nope"), maxBytes: 1024 });

		if (read.ok) throw new Error("expected a rejection");
		expect(read.response.status).toBe(400);
	});

	it("answers valid JSON that is not an AG-UI run with 400 instead of throwing", async () => {
		const read = await readRunParams({
			request: postJson(JSON.stringify({ threadId: "thread-1" })),
			maxBytes: 1024,
		});

		if (read.ok) throw new Error("expected a rejection");
		expect(read.response.status).toBe(400);
	});

	it("answers an oversized body with 413", async () => {
		const read = await readRunParams({
			request: postJson(JSON.stringify({ ...runBody, padding: "x".repeat(2048) })),
			maxBytes: 1024,
		});

		if (read.ok) throw new Error("expected a rejection");
		expect(read.response.status).toBe(413);
	});
});

describe("streamRunResponse", () => {
	it("turns a thrown run into a terminal RUN_ERROR event", async () => {
		const runs: RunStore = {
			createOrResume: vi.fn(),
			update: vi.fn(),
			get: vi.fn(async () => null),
			findActiveRun: vi.fn(async () => null),
		};
		async function* failing(): AsyncGenerator<StreamChunk> {
			yield* [];
			throw new Error("provider exploded");
		}

		const response = streamRunResponse({
			request: new Request("http://localhost/api/chat/stream", { method: "POST" }),
			runId: "run-error-test",
			runs,
			run: failing,
		});

		const body = await response.text();
		expect(body).toContain('"type":"RUN_ERROR"');
		expect(body).toContain("provider exploded");
	});
});

describe("resumeRunResponse", () => {
	const owned = async (threadId: string) => threadId === "own-thread";
	const threadOf = async ({ runId }: { runId: string }) =>
		({ "own-run": "own-thread", "their-run": "their-thread" })[runId] ?? null;

	it("refuses a reconnect that names no run", async () => {
		const response = await resumeRunResponse({
			request: new Request("http://localhost/api/chat/stream?offset=-1"),
			findThreadId: threadOf,
			authorize: owned,
		});

		expect(response.status).toBe(400);
	});

	it("refuses to replay another user's run", async () => {
		const response = await resumeRunResponse({
			request: new Request("http://localhost/api/chat/stream?offset=-1&runId=their-run"),
			findThreadId: threadOf,
			authorize: owned,
		});

		expect(response.status).toBe(403);
	});

	it("refuses an unknown run", async () => {
		const response = await resumeRunResponse({
			request: new Request("http://localhost/api/chat/stream?offset=-1&runId=ghost-run"),
			findThreadId: threadOf,
			authorize: owned,
		});

		expect(response.status).toBe(403);
	});

	it("replays the caller's own run", async () => {
		await finishedLog({
			runId: "own-run",
			chunks: [
				{ type: EventType.RUN_STARTED, threadId: "own-thread", runId: "own-run", timestamp: 1 },
				{ type: EventType.RUN_FINISHED, threadId: "own-thread", runId: "own-run", timestamp: 2 },
			],
		});

		const response = await resumeRunResponse({
			request: new Request("http://localhost/api/chat/stream?offset=-1&runId=own-run"),
			findThreadId: threadOf,
			authorize: owned,
		});

		expect(response.status).toBe(200);
		expect(await response.text()).toContain('"type":"RUN_FINISHED"');
	});

	it("never serves another run's log through a Last-Event-ID naming it", async () => {
		await finishedLog({
			runId: "their-run",
			chunks: [
				{ type: EventType.RUN_STARTED, threadId: "their-thread", runId: "their-run", timestamp: 1 },
				{
					type: EventType.TEXT_MESSAGE_CONTENT,
					messageId: "m1",
					delta: "their secret",
					timestamp: 2,
				},
				{
					type: EventType.RUN_FINISHED,
					threadId: "their-thread",
					runId: "their-run",
					timestamp: 3,
				},
			],
		});

		const response = await resumeRunResponse({
			request: new Request("http://localhost/api/chat/stream?runId=own-run", {
				headers: { "Last-Event-ID": "memory:v1:their-run:1" },
			}),
			findThreadId: threadOf,
			authorize: owned,
		});

		expect(await response.text()).not.toContain("their secret");
	});
});
