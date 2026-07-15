import type { UIMessage } from "@tanstack/ai-client";
import { describe, expect, it } from "vitest";
import {
	conversationExportFilename,
	conversationToJson,
	conversationToMarkdown,
} from "#/shared/domain/conversation/export";

function userMessage(content: string, id = "u1"): UIMessage {
	return { id, role: "user", parts: [{ type: "text", content }] };
}

function assistantMessage(content: string, id = "a1"): UIMessage {
	return { id, role: "assistant", parts: [{ type: "text", content }] };
}

describe("conversationToMarkdown", () => {
	it("renders a title heading and one section per message", () => {
		const md = conversationToMarkdown({
			title: "My chat",
			messages: [userMessage("hello"), assistantMessage("hi there")],
		});
		expect(md).toBe("# My chat\n\n## User\n\nhello\n\n## Assistant\n\nhi there");
	});

	it("falls back to a generic heading when the title is null", () => {
		const md = conversationToMarkdown({ title: null, messages: [userMessage("hey")] });
		expect(md.startsWith("# Conversation\n\n")).toBe(true);
	});

	it("skips non-text parts and notes image attachments", () => {
		const message: UIMessage = {
			id: "u1",
			role: "user",
			parts: [
				{ type: "image", source: { type: "url", value: "data:image/png;base64,AAAA" } },
				{ type: "text", content: "look at this" },
			],
		};
		const md = conversationToMarkdown({ title: "t", messages: [message] });
		expect(md).toContain("_1 image attachment_");
		expect(md).toContain("look at this");
		expect(md).not.toContain("data:image");
	});

	it("marks an interrupted assistant reply", () => {
		const interrupted: UIMessage & { interrupted: boolean } = {
			id: "a1",
			role: "assistant",
			parts: [{ type: "text", content: "partial" }],
			interrupted: true,
		};
		const md = conversationToMarkdown({ title: "t", messages: [interrupted] });
		expect(md).toContain("_(response interrupted)_");
	});
});

describe("conversationToJson", () => {
	it("pretty-prints the raw message array", () => {
		const messages = [userMessage("hi")];
		expect(conversationToJson({ title: "t", messages })).toBe(JSON.stringify(messages, null, 2));
	});
});

describe("conversationExportFilename", () => {
	it("slugifies the title with the given extension", () => {
		expect(conversationExportFilename({ title: "Hello, World!", extension: "md" })).toBe(
			"hello-world.md",
		);
	});

	it("falls back to a default stem for an empty or symbol-only title", () => {
		expect(conversationExportFilename({ title: null, extension: "json" })).toBe(
			"conversation.json",
		);
		expect(conversationExportFilename({ title: "!!!", extension: "md" })).toBe("conversation.md");
	});

	it("caps the slug length", () => {
		const name = conversationExportFilename({ title: "a".repeat(200), extension: "md" });
		expect(name).toBe(`${"a".repeat(60)}.md`);
	});
});
