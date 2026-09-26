import { type StreamChunk, toServerSentEventsResponse } from "@tanstack/ai";
import { EventType } from "@tanstack/ai/client";
import type { UIMessage } from "@tanstack/ai-client";
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { worker } from "#/test/msw";
import { renderHook } from "#/test/utils";

/** The response the stream route sends, framed by the same helper the server uses. */
function sseResponse(events: StreamChunk[]): Response {
	return toServerSentEventsResponse(
		(async function* () {
			yield* events;
		})(),
	);
}

function stubStream(events: StreamChunk[]) {
	worker.use(http.post("/api/chat/stream", () => sseResponse(events)));
}

const RUN_STARTED: StreamChunk = { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" };
const RUN_FINISHED: StreamChunk = { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" };

function textRun(messageId: string, deltas: string[]): StreamChunk[] {
	return [
		RUN_STARTED,
		{ type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" },
		...deltas.map(
			(delta): StreamChunk => ({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta }),
		),
		{ type: EventType.TEXT_MESSAGE_END, messageId },
		RUN_FINISHED,
	];
}

function mountChat() {
	return renderHook(() =>
		useChat({
			connection: fetchServerSentEvents("/api/chat/stream"),
			persistence: true,
			threadId: "c1",
			forwardedProps: { enabledTools: [], timeZone: "UTC" },
		}),
	);
}

function assistantText(messages: UIMessage[]) {
	return messages
		.filter((message) => message.role === "assistant")
		.flatMap((message) => message.parts ?? [])
		.flatMap((part) => (part.type === "text" ? [part.content] : []))
		.join("");
}

beforeEach(() => {
	worker.use(
		http.get("/api/chat/stream", () =>
			HttpResponse.json({ messages: [], activeRun: null, interrupts: null }),
		),
	);
});

describe("chat streaming over /api/chat/stream", () => {
	it("assembles streamed deltas into one assistant message", async () => {
		stubStream(textRun("a1", ["Otters ", "are ", "mustelids."]));
		const { result } = await mountChat();

		await result.current.sendMessage({ content: "tell me about otters" });

		await expect.poll(() => assistantText(result.current.messages)).toBe("Otters are mustelids.");
		expect(result.current.messages.filter((m) => m.role === "user")).toHaveLength(1);
	});

	it("posts the conversation's forwardedProps alongside the transcript", async () => {
		let body: { forwardedProps?: Record<string, unknown> } | undefined;
		worker.use(
			http.post<never, { forwardedProps?: Record<string, unknown> }>(
				"/api/chat/stream",
				async ({ request }) => {
					body = await request.json();
					return sseResponse(textRun("a1", ["ok"]));
				},
			),
		);
		const { result } = await mountChat();

		await result.current.sendMessage({ content: "hi" });

		await expect.poll(() => body?.forwardedProps).toEqual({ enabledTools: [], timeZone: "UTC" });
	});

	it("surfaces a terminal RUN_ERROR instead of hanging on a half-finished run", async () => {
		stubStream([
			RUN_STARTED,
			{ type: EventType.TEXT_MESSAGE_START, messageId: "a1", role: "assistant" },
			{ type: EventType.TEXT_MESSAGE_CONTENT, messageId: "a1", delta: "partial" },
			{ type: EventType.RUN_ERROR, message: "provider exploded" },
		]);
		const { result } = await mountChat();

		await result.current.sendMessage({ content: "hi" });

		await expect.poll(() => result.current.error).toBeTruthy();
		await expect.poll(() => result.current.isLoading).toBe(false);
	});

	it("keeps a tool call and its result on the assistant message", async () => {
		stubStream([
			RUN_STARTED,
			{
				type: EventType.TOOL_CALL_START,
				toolCallId: "tc1",
				toolCallName: "web_search",
				parentMessageId: "a1",
			},
			{ type: EventType.TOOL_CALL_ARGS, toolCallId: "tc1", delta: '{"query":"otters"}' },
			{ type: EventType.TOOL_CALL_END, toolCallId: "tc1" },
			{
				type: EventType.TOOL_CALL_RESULT,
				toolCallId: "tc1",
				messageId: "a1",
				content: "otters: found",
			},
			{ type: EventType.TEXT_MESSAGE_START, messageId: "a2", role: "assistant" },
			{ type: EventType.TEXT_MESSAGE_CONTENT, messageId: "a2", delta: "They swim." },
			{ type: EventType.TEXT_MESSAGE_END, messageId: "a2" },
			RUN_FINISHED,
		]);
		const { result } = await mountChat();

		await result.current.sendMessage({ content: "search otters" });

		await expect.poll(() => assistantText(result.current.messages)).toBe("They swim.");
		const parts = result.current.messages.flatMap((message) => message.parts ?? []);
		expect(parts.some((part) => part.type === "tool-call")).toBe(true);
	});
});
