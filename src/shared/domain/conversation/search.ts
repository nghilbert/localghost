/** A conversation as the sidebar renders it, optionally carrying a match snippet. */
export type SearchableConversation = {
	id: string;
	title: string;
	model: string | null;
	endpointId: string | null;
	updatedAt: Date;
	/** Present only on a content (message-body) hit; absent for a title match. */
	snippet?: string;
};

/**
 * Merges the instant title filter with the server's message-body search: title
 * matches rank first, then content-only hits (deduped by id) with their snippet.
 */
export function mergeSearchResults({
	titleMatches,
	contentMatches,
}: {
	titleMatches: SearchableConversation[];
	contentMatches: SearchableConversation[];
}): SearchableConversation[] {
	const titleIds = new Set(titleMatches.map((conversation) => conversation.id));
	return [...titleMatches, ...contentMatches.filter((hit) => !titleIds.has(hit.id))];
}

/**
 * A run of snippet text; `highlight` marks the matched terms `ts_headline`
 * wrapped. `start` is the run's offset in the original snippet — a stable React
 * key that never collides even when two runs share the same text.
 */
export type SnippetSegment = { text: string; highlight: boolean; start: number };

/**
 * Splits a `ts_headline` snippet on its `<<<…>>>` match markers into plain and
 * highlighted runs, so the sidebar can bold matches without rendering raw HTML.
 */
export function snippetSegments(snippet: string): SnippetSegment[] {
	const segments: SnippetSegment[] = [];
	let cursor = 0;
	for (const match of snippet.matchAll(/<<<([\s\S]*?)>>>/g)) {
		const index = match.index ?? 0;
		if (index > cursor) {
			segments.push({ text: snippet.slice(cursor, index), highlight: false, start: cursor });
		}
		segments.push({ text: match[1] ?? "", highlight: true, start: index });
		cursor = index + match[0].length;
	}
	if (cursor < snippet.length) {
		segments.push({ text: snippet.slice(cursor), highlight: false, start: cursor });
	}
	return segments;
}
