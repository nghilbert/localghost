import { z } from "zod/v4";

export const webSearchArgsSchema = z.object({
	query: z.string().optional(),
	time_range: z.enum(["day", "month", "year"]).optional(),
	categories: z.string().optional(),
});

/** SearXNG returns `answers` either as plain strings or `{ answer }` objects. */
const searxAnswerSchema = z.union([
	z.string(),
	z.object({ answer: z.string() }).transform((a) => a.answer),
]);

const searxResponseSchema = z.object({
	results: z
		.array(
			z.object({
				title: z.string().optional(),
				url: z.string().optional(),
				content: z.string().optional(),
			}),
		)
		.optional(),
	answers: z.array(searxAnswerSchema).optional(),
});

export type SearchResult = {
	title: string;
	url: string;
	snippet: string;
};

export type WebSearchOptions = {
	/** Restrict results to the last `day`, `month`, or `year`. */
	timeRange?: "day" | "month" | "year";
	/** Comma-separated SearXNG categories (e.g. `news`, `science`). */
	categories?: string;
};

/**
 * Search the web via a SearXNG instance (SEARXNG_URL env). Returns any direct
 * answer plus up to `limit` results as plain text the agent can reason over, or
 * a guidance string when no instance is configured.
 */
export async function webSearch(
	query: string,
	limit = 5,
	options: WebSearchOptions = {},
): Promise<string> {
	const searxUrl = process.env.SEARXNG_URL;
	if (!searxUrl) {
		return "Web search is not configured. Set SEARXNG_URL to a running SearXNG instance to enable it.";
	}

	try {
		const { results, answers } = await searchSearXNG(query, limit, searxUrl, options);
		if (results.length === 0 && answers.length === 0) return "No results found.";

		const blocks = results.map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`);
		if (answers.length > 0) blocks.unshift(`Answer: ${answers.join(" ")}`);
		return blocks.join("\n\n");
	} catch (err) {
		return `Search failed: ${err instanceof Error ? err.message : "Unknown error"}`;
	}
}

async function searchSearXNG(
	query: string,
	limit: number,
	baseUrl: string,
	options: WebSearchOptions,
): Promise<{ results: SearchResult[]; answers: string[] }> {
	const url = new URL("/search", baseUrl);
	url.searchParams.set("q", query);
	url.searchParams.set("format", "json");
	url.searchParams.set("categories", options.categories ?? "general");
	if (options.timeRange) url.searchParams.set("time_range", options.timeRange);

	const res = await fetch(url.toString(), {
		headers: {
			Accept: "application/json",
			"User-Agent": "Mozilla/5.0 (compatible; localghost/1.0)",
		},
		signal: AbortSignal.timeout(15_000),
	});

	if (!res.ok) throw new Error(`SearXNG HTTP ${res.status}`);

	const data = searxResponseSchema.parse(await res.json());

	return {
		results: (data.results ?? []).slice(0, limit).map((r) => ({
			title: r.title ?? "",
			url: r.url ?? "",
			snippet: r.content ?? "",
		})),
		answers: data.answers ?? [],
	};
}
