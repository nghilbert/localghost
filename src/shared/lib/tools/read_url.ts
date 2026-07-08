import { Defuddle } from "defuddle/node";
import { parseHTML } from "linkedom";
import { z } from "zod/v4";

export const readUrlArgsSchema = z.object({
	url: z.string(),
});

/**
 * Fetches a web page as clean Markdown, stripping navigation and boilerplate
 * via defuddle. Pairs with `web_search`: the model searches, then reads a
 * result in full. Output is capped to protect the context budget.
 */
const MAX_CHARS = 8000;

export async function readUrl(url: string): Promise<string> {
	try {
		const res = await fetch(url, {
			headers: { "User-Agent": "Mozilla/5.0 (compatible; localghost/1.0)" },
			signal: AbortSignal.timeout(15_000),
		});
		if (!res.ok) return `Failed to fetch page: HTTP ${res.status}`;

		const { document } = parseHTML(await res.text());
		const { title, content } = await Defuddle(document, url, { markdown: true });

		const body = content?.trim();
		if (!body) return "No readable content found at that URL.";
		return `# ${title ?? url}\n\n${body}`.slice(0, MAX_CHARS);
	} catch (err) {
		return `Failed to read page: ${err instanceof Error ? err.message : "Unknown error"}`;
	}
}
