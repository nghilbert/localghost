import type { UIMessage } from "@tanstack/ai-client";
import { describe, expect, it } from "vitest";
import {
	awaitingAssistantResponse,
	buildFirstUserMessage,
	deriveConversationTitle,
	documentMessageParts,
	editUserMessage,
	messageDocumentSources,
	partsText,
	storedMessages,
	strandedToolCall,
} from "#/shared/domain/conversation/messages";

function userMessage(content: string): UIMessage {
	return { id: "u1", role: "user", parts: [{ type: "text", content }] };
}

function assistantMessage(content: string): UIMessage {
	return { id: "a1", role: "assistant", parts: [{ type: "text", content }] };
}

describe("buildFirstUserMessage", () => {
	it("creates a user message with a single text part", () => {
		const message = buildFirstUserMessage({ content: "hello there" });
		expect(message.role).toBe("user");
		expect(message.parts).toEqual([{ type: "text", content: "hello there" }]);
		expect(message.id).toBeTruthy();
		expect(message.createdAt).toBeInstanceOf(Date);
	});

	it("gives each message a unique id", () => {
		expect(buildFirstUserMessage({ content: "a" }).id).not.toBe(
			buildFirstUserMessage({ content: "a" }).id,
		);
	});

	it("puts image parts ahead of the text part", () => {
		const message = buildFirstUserMessage({
			content: "what is this?",
			images: [{ dataUrl: "data:image/png;base64,AAAA" }],
		});
		expect(message.parts).toEqual([
			{ type: "image", source: { type: "url", value: "data:image/png;base64,AAAA" } },
			{ type: "text", content: "what is this?" },
		]);
	});

	it("omits the text part when the message is image-only", () => {
		const message = buildFirstUserMessage({
			content: "",
			images: [{ dataUrl: "data:image/png;base64,AAAA" }],
		});
		expect(message.parts).toEqual([
			{ type: "image", source: { type: "url", value: "data:image/png;base64,AAAA" } },
		]);
	});

	it("puts images, then documents, then text", () => {
		const message = buildFirstUserMessage({
			content: "read these",
			images: [{ dataUrl: "data:image/png;base64,AAAA" }],
			documents: [
				{
					dataUrl: "data:application/pdf;base64,JVBER",
					mimeType: "application/pdf",
					name: "spec.pdf",
				},
			],
		});
		expect(message.parts).toEqual([
			{ type: "image", source: { type: "url", value: "data:image/png;base64,AAAA" } },
			{
				type: "document",
				source: { type: "data", value: "JVBER", mimeType: "application/pdf" },
				metadata: { filename: "spec.pdf" },
			},
			{ type: "text", content: "read these" },
		]);
	});
});

describe("documentMessageParts / messageDocumentSources", () => {
	it("builds an inline base64 data source and reads the filename back", () => {
		const parts = documentMessageParts([
			{ dataUrl: "data:text/markdown;base64,SGk=", mimeType: "text/markdown", name: "notes.md" },
		]);
		expect(parts).toEqual([
			{
				type: "document",
				source: { type: "data", value: "SGk=", mimeType: "text/markdown" },
				metadata: { filename: "notes.md" },
			},
		]);
		expect(messageDocumentSources(parts)).toEqual([
			{ name: "notes.md", mimeType: "text/markdown" },
		]);
	});

	it("falls back to a generic name when a document part carries no filename metadata", () => {
		expect(
			messageDocumentSources([
				{ type: "document", source: { type: "data", value: "AA", mimeType: "application/pdf" } },
			]),
		).toEqual([{ name: "Document", mimeType: "application/pdf" }]);
	});

	it("ignores non-document parts", () => {
		expect(
			messageDocumentSources([
				{ type: "text", content: "hi" },
				{ type: "image", source: { type: "url", value: "data:image/png;base64,AA" } },
			]),
		).toEqual([]);
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

describe("editUserMessage", () => {
	it("rewrites the message's text and drops every later turn", () => {
		const messages: UIMessage[] = [
			{ id: "u1", role: "user", parts: [{ type: "text", content: "original" }] },
			{ id: "a1", role: "assistant", parts: [{ type: "text", content: "reply" }] },
			{ id: "u2", role: "user", parts: [{ type: "text", content: "follow-up" }] },
		];
		const edited = editUserMessage({ messages, id: "u1", content: "edited" });
		expect(edited).toHaveLength(1);
		expect(edited[0]?.id).toBe("u1");
		expect(partsText(edited[0]?.parts ?? [])).toBe("edited");
	});

	it("returns the input unchanged when the id isn't found", () => {
		const messages = [userMessage("hi")];
		expect(editUserMessage({ messages, id: "missing", content: "x" })).toBe(messages);
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

describe("storedMessages", () => {
	it("round-trips a ModelMessage[] blob through JSON", () => {
		const messages = [{ role: "user", content: "hi" }];
		expect(storedMessages(messages)).toEqual(messages);
	});

	it("treats a missing value as an empty transcript", () => {
		expect(storedMessages(undefined)).toEqual([]);
		expect(storedMessages(null)).toEqual([]);
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
