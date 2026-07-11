import { describe, expect, it } from "vitest";
import { display } from "#/features/send-message/components/ChatMessage/ToolCallStep";

describe("display", () => {
	describe("web_search", () => {
		it("names the query in both running and done labels", () => {
			const d = display("web_search");
			expect(d.running({ query: "otter facts" })).toBe('Searching the web for "otter facts"…');
			expect(d.done({ query: "otter facts" })).toBe('Searched the web for "otter facts"');
		});

		it("falls back to a generic label without a query", () => {
			const d = display("web_search");
			expect(d.running({})).toBe("Searching the web…");
			expect(d.done(null)).toBe("Searched the web");
		});
	});

	describe("read_url", () => {
		it("shows the host of a valid url", () => {
			const d = display("read_url");
			expect(d.running({ url: "https://example.com/a/b" })).toBe("Reading example.com…");
			expect(d.done({ url: "https://example.com/a/b" })).toBe("Read example.com");
		});

		it("falls back when the url is missing or malformed", () => {
			const d = display("read_url");
			expect(d.running({ url: "not a url" })).toBe("Reading page…");
			expect(d.done({})).toBe("Read page");
		});
	});

	describe("manage_memory", () => {
		it("labels each action", () => {
			const d = display("manage_memory");
			expect(d.running({ action: "add" })).toBe("Saving a memory…");
			expect(d.done({ action: "add" })).toBe("Saved a memory");
			expect(d.running({ action: "search" })).toBe("Searching memories…");
			expect(d.done({ action: "delete" })).toBe("Deleted a memory");
		});

		it("falls back for an unknown action", () => {
			const d = display("manage_memory");
			expect(d.running({ action: "frobnicate" })).toBe("Updating memory…");
			expect(d.done({})).toBe("Memory");
		});
	});

	describe("unknown tool", () => {
		it("echoes the raw tool name", () => {
			const d = display("do_a_thing");
			expect(d.running({})).toBe("do_a_thing…");
			expect(d.done({})).toBe("do_a_thing");
		});
	});
});
