import { z } from "zod/v4";

const SEARCH_TIMEOUT_MS = 15_000;

const timeRangeSchema = z.enum(["day", "month", "year"]);

export const webSearchArgsSchema = z.object({
	query: z
		.string()
		.trim()
		.min(1)
		.describe("Short, plain search terms. Supports operators such as site:example.com."),
	time_range: timeRangeSchema
		.optional()
		.catch(undefined)
		.describe("Use only when the user explicitly needs results from the last day, month, or year."),
});

const searxResultSchema = z.object({
	title: z
		.string()
		.nullish()
		.transform((title) => title ?? ""),
	url: z.string().min(1),
	content: z
		.string()
		.nullish()
		.transform((content) => content ?? ""),
});

/** SearXNG returns `answers` either as plain strings or `{ answer }` objects. */
const searxAnswerSchema = z.union([
	z.string(),
	z.object({ answer: z.string() }).transform(({ answer }) => answer),
]);

const searxResponseSchema = z.object({
	results: z.array(searxResultSchema),
	answers: z.array(searxAnswerSchema).optional().default([]),
});

type SearchTimeRange = z.infer<typeof timeRangeSchema>;
type SearXNGSearchResponse = z.infer<typeof searxResponseSchema>;

type WebSearchParams = {
	query: string;
	limit?: number;
	timeRange?: SearchTimeRange;
	signal?: AbortSignal;
};

/**
 * Searches the configured SearXNG instance, retrying a valid empty ranged
 * search once without the time filter.
 */
export async function webSearch({
	query,
	limit = 5,
	timeRange,
	signal,
}: WebSearchParams): Promise<string> {
	const searxUrl = process.env.SEARXNG_URL;
	if (!searxUrl) {
		return "Web search is not configured. Set SEARXNG_URL to a running SearXNG instance to enable it.";
	}

	const timeoutSignal = AbortSignal.timeout(SEARCH_TIMEOUT_MS);
	const searchSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
	const response = await searchSearXNG({
		query,
		limit,
		baseUrl: searxUrl,
		timeRange,
		signal: searchSignal,
	});
	if (response.results.length > 0 || response.answers.length > 0) {
		return formatSearchResponse(response);
	}
	if (!timeRange) return "No results found. Try a shorter or differently worded query.";

	const fallbackResponse = await searchSearXNG({
		query,
		limit,
		baseUrl: searxUrl,
		signal: searchSignal,
	});
	if (fallbackResponse.results.length > 0 || fallbackResponse.answers.length > 0) {
		return `Search note: No results matched time range "${timeRange}". Showing results without a time limit.\n\n${formatSearchResponse(fallbackResponse)}`;
	}

	return `No results found after retrying without the "${timeRange}" time filter. Try a shorter or differently worded query.`;
}

function formatSearchResponse(response: SearXNGSearchResponse): string {
	const blocks = response.results.map(
		(result, index) => `[${index + 1}] ${result.title}\n${result.url}\n${result.content}`,
	);
	if (response.answers.length > 0) blocks.unshift(`Answer: ${response.answers.join(" ")}`);
	return blocks.join("\n\n");
}

async function searchSearXNG({
	query,
	limit,
	baseUrl,
	timeRange,
	signal,
}: {
	query: string;
	limit: number;
	baseUrl: string;
	timeRange?: SearchTimeRange;
	signal: AbortSignal;
}): Promise<SearXNGSearchResponse> {
	const url = new URL("/search", baseUrl);
	url.searchParams.set("q", query);
	url.searchParams.set("format", "json");
	url.searchParams.set("categories", "general");
	if (timeRange) url.searchParams.set("time_range", timeRange);

	const response = await fetch(url.toString(), {
		headers: {
			Accept: "application/json",
			"User-Agent": "Mozilla/5.0 (compatible; localghost/1.0)",
		},
		signal,
	});

	if (!response.ok) throw new Error(`SearXNG HTTP ${response.status}`);

	const parsed = searxResponseSchema.safeParse(await response.json());
	if (!parsed.success) throw new Error("Invalid SearXNG response");

	return {
		...parsed.data,
		results: parsed.data.results.slice(0, limit),
	};
}
