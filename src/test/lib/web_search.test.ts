import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { webSearch } from "#/lib/tools/web_search";

describe("webSearch", () => {
	beforeEach(() => {
		delete process.env.SEARXNG_URL;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns DuckDuckGo abstract when available", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					AbstractText: "TypeScript is a typed superset of JavaScript.",
					AbstractURL: "https://www.typescriptlang.org",
					AbstractSource: "TypeScript.org",
					RelatedTopics: [],
				}),
			}),
		);

		const result = await webSearch("TypeScript", 5);
		expect(result).toContain("TypeScript is a typed superset");
		expect(result).toContain("TypeScript.org");
	});

	it("includes related topics when abstract is empty", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					AbstractText: "",
					AbstractURL: "",
					AbstractSource: "",
					RelatedTopics: [
						{ Text: "React - A JS library for building UIs", FirstURL: "https://react.dev" },
					],
				}),
			}),
		);

		const result = await webSearch("React", 5);
		expect(result).toContain("React");
		expect(result).toContain("react.dev");
	});

	it("returns 'No results found.' when DuckDuckGo has no results", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					AbstractText: "",
					AbstractURL: "",
					AbstractSource: "",
					RelatedTopics: [],
				}),
			}),
		);

		const result = await webSearch("xyzzy1234nonexistent", 5);
		expect(result).toBe("No results found.");
	});

	it("returns error message when fetch throws", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
		const result = await webSearch("test", 5);
		expect(result).toContain("Search failed");
		expect(result).toContain("Network error");
	});

	it("uses SearXNG when SEARXNG_URL is set", async () => {
		process.env.SEARXNG_URL = "http://localhost:8080";
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				results: [{ title: "Result 1", url: "https://example.com", content: "Some snippet" }],
			}),
		});
		vi.stubGlobal("fetch", mockFetch);

		const result = await webSearch("test query", 5);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining("localhost:8080"),
			expect.any(Object),
		);
		expect(result).toContain("Result 1");
		expect(result).toContain("example.com");
	});
});
