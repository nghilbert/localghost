import type { UIMessage } from "@tanstack/ai-client";
import { useChat } from "@tanstack/ai-react";
import { QueryClient } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { worker } from "#/test/msw";
import { renderHook } from "#/test/utils";

const { saveConversationMessages } = vi.hoisted(() => ({
	saveConversationMessages: vi.fn(),
}));

vi.mock("#/shared/domain/conversation/conversation.functions", () => ({
	saveConversationMessages,
	deleteConversation: vi.fn(),
	conversationQueryOptions: (id: string) => ({ queryKey: ["conversation", id] }),
	conversationsQueryOptions: () => ({ queryKey: ["conversations"] }),
}));

const { createChatOptions } = await import("#/routes/_authenticated/-lib/chat-client");

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

function stubStream(events: StreamEvent[]) {
	worker.use(http.post("/api/chat/stream", () => sseResponse(events)));
}

function textRun(messageId: string, deltas: string[]): StreamEvent[] {
	return [
		{ type: "RUN_STARTED", threadId: "t1", runId: "r1" },
		{ type: "TEXT_MESSAGE_START", messageId, role: "assistant" },
		...deltas.map((delta) => ({ type: "TEXT_MESSAGE_CONTENT", messageId, delta })),
		{ type: "TEXT_MESSAGE_END", messageId },
		{ type: "RUN_FINISHED", threadId: "t1", runId: "r1" },
	];
}

function mountChat() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return renderHook(() =>
		useChat({
			...createChatOptions(queryClient),
			id: "c1",
			forwardedProps: { conversationId: "c1", enabledTools: [], timeZone: "UTC" },
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
	vi.clearAllMocks();
	saveConversationMessages.mockResolvedValue(undefined);
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

		await expect
			.poll(() => body?.forwardedProps)
			.toEqual({
				conversationId: "c1",
				enabledTools: [],
				timeZone: "UTC",
			});
	});

	it("surfaces a terminal RUN_ERROR instead of hanging on a half-finished run", async () => {
		stubStream([
			{ type: "RUN_STARTED", threadId: "t1", runId: "r1" },
			{ type: "TEXT_MESSAGE_START", messageId: "a1", role: "assistant" },
			{ type: "TEXT_MESSAGE_CONTENT", messageId: "a1", delta: "partial" },
			{ type: "RUN_ERROR", message: "provider exploded" },
		]);
		const { result } = await mountChat();

		await result.current.sendMessage({ content: "hi" });

		await expect.poll(() => result.current.error).toBeTruthy();
		await expect.poll(() => result.current.isLoading).toBe(false);
	});

	it("keeps a tool call and its result on the assistant message", async () => {
		stubStream([
			{ type: "RUN_STARTED", threadId: "t1", runId: "r1" },
			{ type: "TOOL_CALL_START", toolCallId: "tc1", toolCallName: "web_search", messageId: "a1" },
			{ type: "TOOL_CALL_ARGS", toolCallId: "tc1", delta: '{"query":"otters"}' },
			{ type: "TOOL_CALL_END", toolCallId: "tc1" },
			{ type: "TOOL_CALL_RESULT", toolCallId: "tc1", messageId: "a1", content: "otters: found" },
			{ type: "TEXT_MESSAGE_START", messageId: "a2", role: "assistant" },
			{ type: "TEXT_MESSAGE_CONTENT", messageId: "a2", delta: "They swim." },
			{ type: "TEXT_MESSAGE_END", messageId: "a2" },
			{ type: "RUN_FINISHED", threadId: "t1", runId: "r1" },
		]);
		const { result } = await mountChat();

		await result.current.sendMessage({ content: "search otters" });

		await expect.poll(() => assistantText(result.current.messages)).toBe("They swim.");
		const parts = result.current.messages.flatMap((message) => message.parts ?? []);
		expect(parts.some((part) => part.type === "tool-call")).toBe(true);
	});
});
