import type { UIMessage } from "@tanstack/ai-client";
import { describe, expect, it } from "vitest";
import {
	awaitingAssistantResponse,
	buildFirstUserMessage,
	cumulativeTokenTotals,
	deriveConversationTitle,
	documentMessageParts,
	editUserMessage,
	estimateMessageTokens,
	historyBudgetTokens,
	historyStartIndex,
	isInterrupted,
	type MessageUsage,
	markInterrupted,
	messageDocumentSources,
	messageUsage,
	partsText,
	strandedToolCall,
	trimHistory,
	withUsage,
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

describe("markInterrupted", () => {
	it("flags a trailing assistant message and isInterrupted reads it back", () => {
		const marked = markInterrupted([userMessage("hi"), assistantMessage("partial")]);
		expect(marked.map(isInterrupted)).toEqual([false, true]);
	});

	it("survives the JSON round-trip the persisted blob goes through", () => {
		const marked = markInterrupted([assistantMessage("partial")]);
		const revived: UIMessage[] = JSON.parse(JSON.stringify(marked));
		expect(revived.map(isInterrupted)).toEqual([true]);
	});

	it("leaves a transcript ending on a user turn unchanged", () => {
		const messages = [userMessage("hi")];
		expect(markInterrupted(messages)).toBe(messages);
	});

	it("leaves an empty transcript unchanged", () => {
		expect(markInterrupted([])).toEqual([]);
	});

	it("does not mutate the input messages", () => {
		const message = assistantMessage("partial");
		markInterrupted([message]);
		expect(isInterrupted(message)).toBe(false);
	});
});

const usage: MessageUsage = { promptTokens: 100, completionTokens: 20, totalTokens: 120 };

describe("withUsage / messageUsage", () => {
	it("stamps usage onto a message and reads it back", () => {
		const stamped = withUsage(assistantMessage("hi"), usage);
		expect(messageUsage(stamped)).toEqual(usage);
	});

	it("reports null for a message with no usage stamped", () => {
		expect(messageUsage(assistantMessage("hi"))).toBeNull();
	});

	it("survives the JSON round-trip the persisted blob goes through", () => {
		const stamped = withUsage(assistantMessage("hi"), usage);
		const revived: UIMessage = JSON.parse(JSON.stringify(stamped));
		expect(messageUsage(revived)).toEqual(usage);
	});
});

describe("cumulativeTokenTotals", () => {
	it("runs a total across messages, treating unstamped messages as zero", () => {
		const totals = cumulativeTokenTotals([
			userMessage("hi"),
			withUsage(assistantMessage("a1"), { promptTokens: 10, completionTokens: 5, totalTokens: 15 }),
			userMessage("more"),
			withUsage(assistantMessage("a2"), {
				promptTokens: 30,
				completionTokens: 10,
				totalTokens: 40,
			}),
		]);
		expect(totals).toEqual([0, 15, 15, 55]);
	});

	it("returns an empty array for an empty transcript", () => {
		expect(cumulativeTokenTotals([])).toEqual([]);
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

	it("advances the cut to a user message instead of starting mid-turn", () => {
		// 43 user/assistant pairs plus a trailing user message (87 total): a plain
		// slice(-40) would start on the assistant at index 47, mid-turn.
		const messages = [
			...Array.from({ length: 43 }, (_, i) => [
				userMessage(`q${i}`),
				assistantMessage(`a${i}`),
			]).flat(),
			userMessage("latest"),
		];
		const trimmed = trimHistory(messages);
		expect(trimmed[0]?.role).toBe("user");
		expect(trimmed[0]).toBe(messages[48]);
		expect(trimmed).toHaveLength(39);
	});

	it("keeps the whole last user turn when the cap window has no user message", () => {
		const messages = [
			...Array.from({ length: 5 }, (_, i) => userMessage(`q${i}`)),
			...Array.from({ length: 45 }, (_, i) => assistantMessage(`tool-loop-${i}`)),
		];
		const trimmed = trimHistory(messages);
		expect(trimmed[0]).toBe(messages[4]);
		expect(trimmed).toHaveLength(46);
	});
});

describe("estimateMessageTokens", () => {
	it("estimates an unstamped message from its text length (chars/4)", () => {
		expect(estimateMessageTokens(userMessage("a".repeat(40)))).toBe(10);
	});

	it("uses an assistant reply's own completionTokens when stamped", () => {
		const stamped = withUsage(assistantMessage("hi"), {
			promptTokens: 5000,
			completionTokens: 120,
			totalTokens: 5120,
		});
		// Not the 5120 total (which double-counts the prior prompt), just its 120.
		expect(estimateMessageTokens(stamped)).toBe(120);
	});

	it("adds a flat cost per image part", () => {
		const message: UIMessage = {
			id: "u1",
			role: "user",
			parts: [{ type: "image", source: { type: "url", value: "data:image/png;base64,AA" } }],
		};
		expect(estimateMessageTokens(message)).toBeGreaterThanOrEqual(1000);
	});
});

describe("historyStartIndex with a token budget", () => {
	// Each message here is ~25 chars -> ~7 estimated tokens.
	const turn = (i: number) => [
		userMessage(`question number ${i}!`),
		assistantMessage(`answer ${i}`),
	];

	it("cuts on a user turn once the accumulated estimate exceeds the budget", () => {
		const messages = Array.from({ length: 10 }, (_, i) => turn(i)).flat();
		const start = historyStartIndex(messages, { historyBudgetTokens: 30 });
		expect(messages[start]?.role).toBe("user");
		expect(start).toBeGreaterThan(0);
	});

	it("keeps everything when the whole transcript fits the budget", () => {
		const messages = turn(0);
		expect(historyStartIndex(messages, { historyBudgetTokens: 10_000 })).toBe(0);
	});

	it("keeps the last user turn whole even when it alone overflows the budget", () => {
		const messages = [userMessage("q0"), assistantMessage("a0"), userMessage("q1")];
		// A tiny budget can't fit even the newest turn; the cut still lands on the last user message.
		const start = historyStartIndex(messages, { historyBudgetTokens: 1 });
		expect(start).toBe(2);
	});
});

describe("historyBudgetTokens", () => {
	it("returns undefined when no context window is known (cloud providers)", () => {
		expect(historyBudgetTokens({ nCtx: undefined, options: {} })).toBeUndefined();
	});

	it("uses the default max_tokens reservation when options don't override it", () => {
		// 8192 nCtx - 4096 max_tokens default - 1500 system reserve.
		expect(historyBudgetTokens({ nCtx: 8192, options: {} })).toBe(8192 - 4096 - 1500);
	});

	it("honors a per-model max_tokens override against the live nCtx", () => {
		expect(historyBudgetTokens({ nCtx: 32_000, options: { max_tokens: 1000 } })).toBe(
			32_000 - 1000 - 1500,
		);
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
