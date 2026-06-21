import { describe, expect, it } from "vitest";
import { sanitizeTitle } from "#/features/chat/lib/conversation.functions";

describe("sanitizeTitle", () => {
	it("keeps a clean short title, stripping quotes and trailing punctuation", () => {
		expect(sanitizeTitle('"Weekend hiking plans."')).toBe("Weekend hiking plans");
	});

	it("uses only the first line of multi-line output", () => {
		expect(sanitizeTitle("Trip to Japan\nLet me know if you need more")).toBe("Trip to Japan");
	});

	it("rejects refusal / meta output a weak model emits as a title", () => {
		expect(sanitizeTitle("No conversation to summarize yet")).toBeNull();
		expect(sanitizeTitle("Sure! Here is a title for your chat")).toBeNull();
		expect(sanitizeTitle("I can't help with that")).toBeNull();
	});

	it("rejects empty output and overly long sentences", () => {
		expect(sanitizeTitle("   ")).toBeNull();
		expect(
			sanitizeTitle("this is a very long sentence that is clearly not a title at all"),
		).toBeNull();
	});
});
