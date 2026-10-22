import { delay, http, HttpResponse } from "msw";
import { beforeEach, describe, expect, vi } from "vitest";
import { webSearchArgsSchema } from "#/features/chat/chat.schemas";
import { webSearch, type SearxngResponse } from "#/features/chat/server/web-search.server";
import { it, network } from "#/test/network.server";

const SEARXNG_URL = "http://searxng:8080";

/** Answers each SearXNG search with the next body in turn, and returns the URLs searched. */
function searxng(...bodies: Array<SearxngResponse | Response>): URL[] {
	const searched: URL[] = [];
	network.use(
		http.get(`${SEARXNG_URL}/search`, ({ request }) => {
			searched.push(new URL(request.url));
			const body = bodies[searched.length - 1];
			if (!body) throw new Error(`SearXNG was searched ${searched.length} times`);
			return body instanceof Response ? body : HttpResponse.json(body);
		}),
	);
	return searched;
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
		expect(webSearchArgsSchema.safeParse({ query: " ".repeat(3) }).success).toBe(false);
	});
});

describe("webSearch", () => {
	beforeEach(() => {
		vi.stubEnv("SEARXNG_URL", SEARXNG_URL);
	});

	it("returns guidance when SEARXNG_URL is not configured", async () => {
		vi.stubEnv("SEARXNG_URL", undefined);

		const result = await webSearch({ query: "anything" });

		expect(result).toContain("not configured");
		expect(result).toContain("SEARXNG_URL");
	});

	it("returns exact answers and limited results without a fallback note", async () => {
		const searched = searxng({
			results: [
				{ title: "Result 1", url: "https://example.com/one", content: "First" },
				{ title: "Result 2", url: "https://example.com/two", content: "Second" },
			],
			answers: ["First answer.", { answer: "Second answer." }],
		});

		const result = await webSearch({ query: "test query", limit: 1 });

		expect(searched).toHaveLength(1);
		expect(searched[0]?.searchParams.get("q")).toBe("test query");
		expect(searched[0]?.searchParams.get("categories")).toBe("general");
		expect(searched[0]?.searchParams.has("time_range")).toBe(false);
		expect(result).toContain("Answer: First answer. Second answer.");
		expect(result).toContain("Result 1");
		expect(result).not.toContain("Result 2");
		expect(result).not.toContain("Search note:");
	});

	it("retries an empty ranged search once without the time filter", async () => {
		const searched = searxng(
			{ results: [] },
			{
				results: [
					{
						title: "Broader result",
						url: "https://example.com/broader",
						content: "Found without a time filter.",
					},
				],
			},
		);

		const result = await webSearch({ query: "recent comparison", timeRange: "year" });

		expect(searched.map((url) => url.searchParams.get("time_range"))).toEqual(["year", null]);
		expect(result).toContain('No results matched time range "year"');
		expect(result).toContain("Showing results without a time limit");
		expect(result).toContain("Broader result");
	});

	it("returns actionable guidance when both ranged attempts are empty", async () => {
		const searched = searxng({ results: [] }, { results: [] });

		const result = await webSearch({ query: "nothing", timeRange: "month" });

		expect(searched).toHaveLength(2);
		expect(result).toContain('retrying without the "month" time filter');
		expect(result).toContain("Try a shorter or differently worded query");
	});

	it("does not retry an empty search without a time filter", async () => {
		const searched = searxng({ results: [] });

		const result = await webSearch({ query: "xyzzy1234nonexistent" });

		expect(searched).toHaveLength(1);
		expect(result).toBe("No results found. Try a shorter or differently worded query.");
	});

	it.each([
		["invalid envelope", { results: "not-an-array" }],
		["invalid result", { results: [{ title: "Missing URL" }] }],
	])("rejects an %s without retrying", async (_name, payload) => {
		const searched = searxng(HttpResponse.json(payload));

		await expect(webSearch({ query: "test", timeRange: "year" })).rejects.toThrow(
			"Invalid SearXNG response",
		);
		expect(searched).toHaveLength(1);
	});

	it("rejects HTTP failures without retrying", async () => {
		const searched = searxng(new HttpResponse(null, { status: 503 }));

		await expect(webSearch({ query: "test", timeRange: "year" })).rejects.toThrow(
			"SearXNG HTTP 503",
		);
		expect(searched).toHaveLength(1);
	});

	it("rejects invalid JSON without retrying", async () => {
		const searched = searxng(HttpResponse.text("<html>not json</html>"));

		await expect(webSearch({ query: "test", timeRange: "year" })).rejects.toThrow(SyntaxError);
		expect(searched).toHaveLength(1);
	});

	it("rejects network failures without retrying", async () => {
		const searched = searxng(HttpResponse.error());

		await expect(webSearch({ query: "test", timeRange: "year" })).rejects.toThrow(TypeError);
		expect(searched).toHaveLength(1);
	});

	it("forwards cancellation", async () => {
		network.use(http.get(`${SEARXNG_URL}/search`, () => delay("infinite")));
		const controller = new AbortController();

		const search = webSearch({ query: "test", timeRange: "year", signal: controller.signal });
		controller.abort(new Error("cancelled"));

		await expect(search).rejects.toThrow("cancelled");
	});

	it("gives up after 15 seconds across both attempts", async () => {
		// `AbortSignal.timeout` runs on its own clock, so the test fires the timeout itself.
		const timeout = new AbortController();
		const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
		const searched: URL[] = [];
		network.use(
			http.get(`${SEARXNG_URL}/search`, ({ request }) => {
				searched.push(new URL(request.url));
				return searched.length === 1 ? HttpResponse.json({ results: [] }) : delay("infinite");
			}),
		);

		const search = webSearch({ query: "test", timeRange: "year" });
		await vi.waitFor(() => {
			expect(searched).toHaveLength(2);
		});
		timeout.abort(new DOMException("Search timed out", "TimeoutError"));

		await expect(search).rejects.toMatchObject({ name: "TimeoutError" });
		expect(timeoutSpy).toHaveBeenCalledExactlyOnceWith(15_000);
	});
});
