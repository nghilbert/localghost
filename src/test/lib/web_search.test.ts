import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { webSearch } from "#/shared/lib/tools/web_search";

describe("webSearch", () => {
	beforeEach(() => {
		delete process.env.SEARXNG_URL;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns guidance when SEARXNG_URL is not configured", async () => {
		const result = await webSearch("anything", 5);
		expect(result).toContain("not configured");
		expect(result).toContain("SEARXNG_URL");
	});

	it("parses SearXNG results when SEARXNG_URL is set", async () => {
		process.env.SEARXNG_URL = "http://searxng:8080";
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				results: [{ title: "Result 1", url: "https://example.com", content: "Some snippet" }],
			}),
		});
		vi.stubGlobal("fetch", mockFetch);

		const result = await webSearch("test query", 5);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining("searxng:8080"),
			expect.any(Object),
		);
		expect(result).toContain("Result 1");
		expect(result).toContain("example.com");
	});

	it("returns 'No results found.' when SearXNG has no results", async () => {
		process.env.SEARXNG_URL = "http://searxng:8080";
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) }),
		);
		const result = await webSearch("xyzzy1234nonexistent", 5);
		expect(result).toBe("No results found.");
	});

	it("returns error message when fetch throws", async () => {
		process.env.SEARXNG_URL = "http://searxng:8080";
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
		const result = await webSearch("test", 5);
		expect(result).toContain("Search failed");
		expect(result).toContain("Network error");
	});
});
