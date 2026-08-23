import { describe, expect, it } from "vitest";
import { queuedMessageText } from "#/routes/_authenticated/_chat/-components/ChatThread/QueuedMessageItem";

describe("queuedMessageText", () => {
	it("returns a plain string as-is", () => {
		expect(queuedMessageText("hello")).toBe("hello");
	});

	it("joins the text parts of multimodal content", () => {
		expect(
			queuedMessageText({
				content: [
					{ type: "image", source: { type: "url", value: "https://example.com/a.png" } },
					{ type: "text", content: "check this out" },
				],
			}),
		).toBe("check this out");
	});

	it("returns an empty string for attachment-only content", () => {
		expect(
			queuedMessageText({
				content: [{ type: "image", source: { type: "url", value: "https://example.com/a.png" } }],
			}),
		).toBe("");
	});
});
