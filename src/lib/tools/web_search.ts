import { z } from "zod/v4";

export const webSearchArgsSchema = z.object({
	query: z.string().optional(),
});

export type SearchResult = {
	title: string;
	url: string;
	snippet: string;
};

/**
 * Search the web via a SearXNG instance (SEARXNG_URL env). Returns up to `limit`
 * results as plain text the agent can reason over, or a guidance string when no
 * instance is configured.
 */
export async function webSearch(query: string, limit = 5): Promise<string> {
	const searxUrl = process.env.SEARXNG_URL;
	if (!searxUrl) {
		return "Web search is not configured. Set SEARXNG_URL to a running SearXNG instance to enable it.";
	}

	try {
		const results = await searchSearXNG(query, limit, searxUrl);
		if (results.length === 0) return "No results found.";
		return results.map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`).join("\n\n");
	} catch (err) {
		return `Search failed: ${err instanceof Error ? err.message : "Unknown error"}`;
	}
}

async function searchSearXNG(
	query: string,
	limit: number,
	baseUrl: string,
): Promise<SearchResult[]> {
	const url = new URL("/search", baseUrl);
	url.searchParams.set("q", query);
	url.searchParams.set("format", "json");
	url.searchParams.set("categories", "general");

	const res = await fetch(url.toString(), {
		headers: { Accept: "application/json" },
		signal: AbortSignal.timeout(15_000),
	});

	if (!res.ok) throw new Error(`SearXNG HTTP ${res.status}`);

	const data = (await res.json()) as {
		results?: Array<{ title?: string; url?: string; content?: string }>;
	};

	return (data.results ?? []).slice(0, limit).map((r) => ({
		title: r.title ?? "",
		url: r.url ?? "",
		snippet: r.content ?? "",
	}));
}
