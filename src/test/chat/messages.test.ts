import type { UIMessage } from "@tanstack/ai-client";
import { describe, expect, it } from "vitest";
import {
	awaitingAssistantResponse,
	buildFirstUserMessage,
	deriveConversationTitle,
	partsText,
	strandedToolCall,
	trimHistory,
} from "#/features/chat/lib/messages";

function userMessage(content: string): UIMessage {
	return { id: "u1", role: "user", parts: [{ type: "text", content }] };
}

function assistantMessage(content: string): UIMessage {
	return { id: "a1", role: "assistant", parts: [{ type: "text", content }] };
}

describe("buildFirstUserMessage", () => {
	it("creates a user message with a single text part", () => {
		const message = buildFirstUserMessage("hello there");
		expect(message.role).toBe("user");
		expect(message.parts).toEqual([{ type: "text", content: "hello there" }]);
		expect(message.id).toBeTruthy();
		expect(message.createdAt).toBeInstanceOf(Date);
	});

	it("gives each message a unique id", () => {
		expect(buildFirstUserMessage("a").id).not.toBe(buildFirstUserMessage("a").id);
	});
});

describe("awaitingAssistantResponse", () => {
	it("is true when the transcript ends on a user message", () => {
		expect(awaitingAssistantResponse([userMessage("hi")])).toBe(true);
	});

	it("is false once the assistant replied", () => {
		expect(awaitingAssistantResponse([userMessage("hi"), assistantMessage("hello")])).toBe(false);
	});

	it("is false for an empty transcript", () => {
		expect(awaitingAssistantResponse([])).toBe(false);
	});
});

describe("deriveConversationTitle", () => {
	it("takes the first six words", () => {
		expect(deriveConversationTitle("one two three four five six seven eight")).toBe(
			"one two three four five six",
		);
	});

	it("collapses whitespace between words", () => {
		expect(deriveConversationTitle("  hello \n world  ")).toBe("hello world");
	});

	it("caps the title at 80 characters", () => {
		const long = "x".repeat(200);
		expect(deriveConversationTitle(long)).toHaveLength(80);
	});

	it("returns null for blank text", () => {
		expect(deriveConversationTitle("   ")).toBeNull();
	});
});

describe("partsText", () => {
	it("joins text parts and skips thinking and tool calls", () => {
		const parts: UIMessage["parts"] = [
			{ type: "thinking", content: "pondering" },
			{ type: "text", content: "Hello" },
			{ type: "text", content: " world" },
		];
		expect(partsText(parts)).toBe("Hello world");
	});
});

describe("trimHistory", () => {
	it("returns short histories untouched", () => {
		const messages = [userMessage("hi")];
		expect(trimHistory(messages)).toBe(messages);
	});

	it("keeps the most recent 40 whole messages", () => {
		const messages = Array.from({ length: 45 }, (_, i) => userMessage(`m${i}`));
		const trimmed = trimHistory(messages);
		expect(trimmed).toHaveLength(40);
		expect(trimmed[0]).toBe(messages[5]);
		expect(trimmed[39]).toBe(messages[44]);
	});
});

describe("strandedToolCall", () => {
	it("returns the tool name for a bare tool-call blob", () => {
		expect(strandedToolCall('{"name": "read_url", "parameters": {"url": "https://x.com"}}')).toBe(
			"read_url",
		);
		expect(strandedToolCall('  {"name": "currentDateTimeLine", "parameters": {}} ')).toBe(
			"currentDateTimeLine",
		);
	});

	it("accepts the arguments key as well as parameters", () => {
		expect(strandedToolCall('{"name": "web_search", "arguments": {"query": "x"}}')).toBe(
			"web_search",
		);
	});

	it("returns null for prose, prose around a blob, and fenced JSON", () => {
		expect(strandedToolCall("The current time is 5pm.")).toBeNull();
		expect(strandedToolCall('I will call {"name": "web_search", "parameters": {}} now')).toBeNull();
		expect(strandedToolCall('```json\n{"name": "x", "parameters": {}}\n```')).toBeNull();
	});

	it("returns null for JSON that is not a tool call", () => {
		expect(strandedToolCall('{"name": "x"}')).toBeNull();
		expect(strandedToolCall('{"query": "weather"}')).toBeNull();
		expect(strandedToolCall('{"name": 3, "parameters": {}}')).toBeNull();
		expect(strandedToolCall('{"name": "x", "parameters": "y"}')).toBeNull();
		expect(strandedToolCall("{not json}")).toBeNull();
	});
});
