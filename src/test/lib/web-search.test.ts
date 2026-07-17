import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { webSearch, webSearchArgsSchema } from "#/shared/lib/tools/web-search.server";

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(payload: unknown) {
	return { ok: true, status: 200, json: async () => payload };
}

function calledUrl({ fetchMock, index }: { fetchMock: FetchMock; index: number }): URL {
	const input = fetchMock.mock.calls[index]?.[0];
	if (typeof input !== "string") throw new Error(`Missing fetch call ${index}`);
	return new URL(input);
}

describe("webSearchArgsSchema", () => {
	it("normalizes the query and ignores unsupported arguments", () => {
		expect(
			webSearchArgsSchema.parse({
				query: "  llama 3.1 instruct  ",
				time_range: "week",
				category: "science",
			}),
		).toEqual({ query: "llama 3.1 instruct", time_range: undefined });
		expect(webSearchArgsSchema.safeParse({ query: "   " }).success).toBe(false);
	});
});

describe("webSearch", () => {
	beforeEach(() => {
		process.env.SEARXNG_URL = "http://searxng:8080";
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("returns guidance when SEARXNG_URL is not configured", async () => {
		delete process.env.SEARXNG_URL;

		const result = await webSearch({ query: "anything" });

		expect(result).toContain("not configured");
		expect(result).toContain("SEARXNG_URL");
	});

	it("returns exact answers and limited results without a fallback note", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				results: [
					{ title: "Result 1", url: "https://example.com/one", content: "First" },
					{ title: "Result 2", url: "https://example.com/two", content: "Second" },
				],
				answers: ["First answer.", { answer: "Second answer." }],
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const result = await webSearch({ query: "test query", limit: 1 });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const url = calledUrl({ fetchMock, index: 0 });
		expect(url.searchParams.get("categories")).toBe("general");
		expect(url.searchParams.has("time_range")).toBe(false);
		expect(result).toContain("Answer: First answer. Second answer.");
		expect(result).toContain("Result 1");
		expect(result).not.toContain("Result 2");
		expect(result).not.toContain("Search note:");
	});

	it("retries an empty ranged search once without the time filter", async () => {
		const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse({ results: [] }))
			.mockResolvedValueOnce(
				jsonResponse({
					results: [
						{
							title: "Broader result",
							url: "https://example.com/broader",
							content: "Found without a time filter.",
						},
					],
				}),
			);
		vi.stubGlobal("fetch", fetchMock);

		const result = await webSearch({ query: "recent comparison", timeRange: "year" });

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(timeoutSpy).toHaveBeenCalledOnce();
		expect(timeoutSpy).toHaveBeenCalledWith(15_000);
		const exactUrl = calledUrl({ fetchMock, index: 0 });
		const fallbackUrl = calledUrl({ fetchMock, index: 1 });
		expect(exactUrl.searchParams.get("categories")).toBe("general");
		expect(exactUrl.searchParams.get("time_range")).toBe("year");
		expect(fallbackUrl.searchParams.get("categories")).toBe("general");
		expect(fallbackUrl.searchParams.has("time_range")).toBe(false);
		expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(fetchMock.mock.calls[1]?.[1]?.signal);
		expect(result).toContain('No results matched time range "year"');
		expect(result).toContain("Showing results without a time limit");
		expect(result).toContain("Broader result");
	});

	it("returns actionable guidance when both ranged attempts are empty", async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
		vi.stubGlobal("fetch", fetchMock);

		const result = await webSearch({ query: "nothing", timeRange: "month" });

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(result).toContain('retrying without the "month" time filter');
		expect(result).toContain("Try a shorter or differently worded query");
	});

	it("does not retry an empty search without a time filter", async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
		vi.stubGlobal("fetch", fetchMock);

		const result = await webSearch({ query: "xyzzy1234nonexistent" });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(result).toBe("No results found. Try a shorter or differently worded query.");
	});

	it.each([
		["invalid envelope", { results: "not-an-array" }],
		["invalid result", { results: [{ title: "Missing URL" }] }],
	])("rejects an %s without retrying", async (_name, payload) => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
		vi.stubGlobal("fetch", fetchMock);

		await expect(webSearch({ query: "test", timeRange: "year" })).rejects.toThrow(
			"Invalid SearXNG response",
		);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("rejects HTTP failures without retrying", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
		vi.stubGlobal("fetch", fetchMock);

		await expect(webSearch({ query: "test", timeRange: "year" })).rejects.toThrow(
			"SearXNG HTTP 503",
		);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("rejects invalid JSON without retrying", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => {
				throw new SyntaxError("bad json");
			},
		});
		vi.stubGlobal("fetch", fetchMock);

		await expect(webSearch({ query: "test", timeRange: "year" })).rejects.toThrow("bad json");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("rejects network failures without retrying", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error("Network unavailable"));
		vi.stubGlobal("fetch", fetchMock);

		await expect(webSearch({ query: "test", timeRange: "year" })).rejects.toThrow(
			"Network unavailable",
		);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("forwards cancellation without retrying", async () => {
		const controller = new AbortController();
		controller.abort(new Error("cancelled"));
		const fetchMock = vi.fn().mockImplementation((...args: Parameters<typeof fetch>) => {
			const requestSignal = args[1]?.signal;
			if (!(requestSignal instanceof AbortSignal)) throw new Error("Missing abort signal");
			return Promise.reject(requestSignal.reason);
		});
		vi.stubGlobal("fetch", fetchMock);

		await expect(
			webSearch({ query: "test", timeRange: "year", signal: controller.signal }),
		).rejects.toThrow("cancelled");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("enforces the overall timeout without retrying", async () => {
		const timeoutController = new AbortController();
		timeoutController.abort(new DOMException("Search timed out", "TimeoutError"));
		vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeoutController.signal);
		const fetchMock = vi.fn().mockImplementation((...args: Parameters<typeof fetch>) => {
			const requestSignal = args[1]?.signal;
			if (!(requestSignal instanceof AbortSignal)) throw new Error("Missing abort signal");
			return Promise.reject(requestSignal.reason);
		});
		vi.stubGlobal("fetch", fetchMock);

		await expect(webSearch({ query: "test", timeRange: "year" })).rejects.toMatchObject({
			name: "TimeoutError",
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
