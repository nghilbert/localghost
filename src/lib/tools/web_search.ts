import { z } from "zod/v4";

export const webSearchArgsSchema = z.object({
	query: z.string().optional(),
	limit: z.number().optional(),
});

export type SearchResult = {
	title: string;
	url: string;
	snippet: string;
};

/**
 * Search the web via SearXNG (SEARXNG_URL env) or DuckDuckGo HTML as fallback.
 * Returns up to `limit` results as plain text the agent can reason over.
 */
export async function webSearch(query: string, limit = 5): Promise<string> {
	const searxUrl = process.env.SEARXNG_URL;

	try {
		const results = searxUrl
			? await searchSearXNG(query, limit, searxUrl)
			: await searchDuckDuckGo(query, limit);

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

async function searchDuckDuckGo(query: string, limit: number): Promise<SearchResult[]> {
	// DuckDuckGo Instant Answer API — low-fi but no auth needed
	const url = new URL("https://api.duckduckgo.com/");
	url.searchParams.set("q", query);
	url.searchParams.set("format", "json");
	url.searchParams.set("no_html", "1");
	url.searchParams.set("skip_disambig", "1");

	const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });
	if (!res.ok) throw new Error(`DuckDuckGo HTTP ${res.status}`);

	const data = (await res.json()) as {
		AbstractText?: string;
		AbstractURL?: string;
		AbstractSource?: string;
		RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
	};

	const results: SearchResult[] = [];

	if (data.AbstractText) {
		results.push({
			title: data.AbstractSource ?? "DuckDuckGo",
			url: data.AbstractURL ?? "",
			snippet: data.AbstractText,
		});
	}

	for (const topic of data.RelatedTopics ?? []) {
		if (results.length >= limit) break;
		if (topic.Text && topic.FirstURL) {
			results.push({
				title: topic.Text.split(" - ")[0] ?? "",
				url: topic.FirstURL,
				snippet: topic.Text,
			});
		}
	}

	return results;
}
