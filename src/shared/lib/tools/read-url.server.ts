import { Defuddle } from "defuddle/node";
import { parseHTML } from "linkedom";
import { z } from "zod/v4";
import { resolvePublicUrl, UnsafeUrlError } from "#/shared/lib/ssrf-guard.server";

export const readUrlArgsSchema = z.object({
	url: z.string(),
});

/**
 * Fetches a web page as clean Markdown, stripping navigation and boilerplate
 * via defuddle. Pairs with `web_search`: the model searches, then reads a
 * result in full. Output is capped to protect the context budget.
 */
const MAX_CHARS = 8000;
const MAX_REDIRECTS = 5;

/**
 * Follows redirects manually, re-checking each hop against {@link resolvePublicUrl}
 * so a public URL can't redirect the model into fetching an internal address.
 */
async function fetchFollowingSafeRedirects(input: string): Promise<Response> {
	let target = input;
	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		const url = await resolvePublicUrl(target);
		const res = await fetch(url, {
			headers: { "User-Agent": "Mozilla/5.0 (compatible; localghost/1.0)" },
			redirect: "manual",
			signal: AbortSignal.timeout(15_000),
		});
		const location = res.headers.get("location");
		if (res.status < 300 || res.status >= 400 || !location) return res;
		target = new URL(location, url).toString();
	}
	throw new Error("Too many redirects");
}

export async function readUrl(url: string): Promise<string> {
	try {
		const res = await fetchFollowingSafeRedirects(url);
		if (!res.ok) return `Failed to fetch page: HTTP ${res.status}`;

		const { document } = parseHTML(await res.text());
		const { title, content } = await Defuddle(document, url, { markdown: true });

		const body = content?.trim();
		if (!body) return "No readable content found at that URL.";
		return `# ${title ?? url}\n\n${body}`.slice(0, MAX_CHARS);
	} catch (err) {
		if (err instanceof UnsafeUrlError) return err.message;
		return `Failed to read page: ${err instanceof Error ? err.message : "Unknown error"}`;
	}
}
