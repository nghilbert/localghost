/** A conversation in the sidebar, with a snippet when its messages matched a search. */
export type SearchableConversation = {
	id: string;
	title: string;
	model: string | null;
	endpointId: string | null;
	updatedAt: Date;
	/** Only on a message match, not a title match. */
	snippet?: string;
};

/** Title matches first, then message matches that are not already listed. */
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

/** A piece of a search snippet. `start` is its offset in the snippet, unique enough for a React key. */
type SnippetSegment = { text: string; highlight: boolean; start: number };

/** Splits a `ts_headline` snippet on its `<<<` and `>>>` markers, so matches can be bolded without raw HTML. */
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
