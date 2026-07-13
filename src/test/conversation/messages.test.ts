import type { UIMessage } from "@tanstack/ai-client";
import { describe, expect, it } from "vitest";
import {
	awaitingAssistantResponse,
	buildFirstUserMessage,
	deriveConversationTitle,
	isInterrupted,
	markInterrupted,
	partsText,
	sanitizeGeneratedTitle,
	strandedToolCall,
	trimHistory,
} from "#/entities/conversation/messages";

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

describe("sanitizeGeneratedTitle", () => {
	it("passes a clean title through", () => {
		expect(sanitizeGeneratedTitle("Debugging Prisma migrations")).toBe(
			"Debugging Prisma migrations",
		);
	});

	it("strips wrapping quotes, markdown, and a Title: prefix", () => {
		expect(sanitizeGeneratedTitle('"Weekend Trip Ideas"')).toBe("Weekend Trip Ideas");
		expect(sanitizeGeneratedTitle("**Weekend Trip Ideas**")).toBe("Weekend Trip Ideas");
		expect(sanitizeGeneratedTitle("Title: Weekend Trip Ideas.")).toBe("Weekend Trip Ideas");
	});

	it("drops thinking blocks and takes the first non-empty line", () => {
		expect(
			sanitizeGeneratedTitle("<think>hmm, a title\nabout cats</think>\n\nCat Care Basics"),
		).toBe("Cat Care Basics");
		expect(sanitizeGeneratedTitle("Cat Care Basics\nHere is why I chose it...")).toBe(
			"Cat Care Basics",
		);
	});

	it("collapses inner whitespace and caps at 80 characters", () => {
		expect(sanitizeGeneratedTitle("Cat   Care\tBasics")).toBe("Cat Care Basics");
		expect(sanitizeGeneratedTitle("x".repeat(200))).toHaveLength(80);
	});

	it("returns null when nothing usable remains", () => {
		expect(sanitizeGeneratedTitle("")).toBeNull();
		expect(sanitizeGeneratedTitle("<think>only thinking</think>")).toBeNull();
		expect(sanitizeGeneratedTitle('"..."')).toBeNull();
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
