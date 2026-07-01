import type { UIMessage } from "@tanstack/ai-client";
import { describe, expect, it } from "vitest";
import {
	awaitingAssistantResponse,
	buildFirstUserMessage,
	deriveConversationTitle,
	partsText,
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
