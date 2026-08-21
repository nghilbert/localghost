import { useChat } from "@tanstack/ai-react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { createAgentConnection } from "#/routes/_authenticated/_agent/agent/-lib/agent-client";
import { codeAgentThreadIdSchema } from "#/shared/domain/code-agent/schemas";
import { worker } from "#/test/msw";
import { renderHook } from "#/test/utils";

const SESSION_ID = "0198c0de-0000-7000-8000-000000000001";

type StreamEvent = Record<string, unknown> & { type: string };

/** The exact framing `toServerSentEventsResponse` writes on the server. */
function sseResponse(events: StreamEvent[]) {
	const body = events
		.map((event) => `data: ${JSON.stringify({ timestamp: Date.now(), ...event })}\n\n`)
		.join("");
	return new HttpResponse(body, {
		headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
	});
}

function emptyRun(): StreamEvent[] {
	return [
		{ type: "RUN_STARTED", threadId: SESSION_ID, runId: "r1" },
		{ type: "RUN_FINISHED", threadId: SESSION_ID, runId: "r1" },
	];
}

function mountAgent() {
	return renderHook(() =>
		useChat({
			connection: createAgentConnection(),
			persistence: true,
			threadId: SESSION_ID,
		}),
	);
}

beforeEach(() => {
	worker.use(
		http.get("/api/agent/stream", () =>
			HttpResponse.json({ messages: [], activeRun: null, interrupts: null }),
		),
	);
});

describe("the agent surface's run contract", () => {
	it("posts the session id as threadId, with no forwarded props", async () => {
		const body: Record<string, unknown> = {};
		worker.use(
			http.post("/api/agent/stream", async ({ request }) => {
				Object.assign(body, await request.json());
				return sseResponse(emptyRun());
			}),
		);

		const { result } = await mountAgent();
		await result.current.sendMessage("summarize this repo");

		// The route reads `params.threadId` to find the session; sending anything else
		// is a 404, and sending it under `forwardedProps` was a 400.
		await expect.poll(() => body.threadId).toBe(SESSION_ID);
		expect(body.forwardedProps ?? {}).toEqual({});
		// Closes the loop: what the client posts is what the route parses.
		expect(codeAgentThreadIdSchema.safeParse(body.threadId).success).toBe(true);
	});

	it("posts the transcript, which is what carries a follow-up to the harness", async () => {
		const body: Record<string, unknown> = {};
		worker.use(
			http.post("/api/agent/stream", async ({ request }) => {
				Object.assign(body, await request.json());
				return sseResponse(emptyRun());
			}),
		);

		const { result } = await mountAgent();
		await result.current.sendMessage("summarize this repo");

		// `withPersistence` only falls back to the stored thread when `messages` is
		// empty, so an omitted transcript silently drops whatever the user just typed.
		await expect.poll(() => JSON.stringify(body.messages ?? [])).toContain("summarize this repo");
	});
});
