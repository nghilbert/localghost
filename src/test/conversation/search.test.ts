import { describe, expect, it } from "vitest";
import {
	mergeSearchResults,
	type SearchableConversation,
	snippetSegments,
} from "#/shared/domain/conversation/search";

function conversation(
	id: string,
	extra: Partial<SearchableConversation> = {},
): SearchableConversation {
	return {
		id,
		title: `Chat ${id}`,
		model: null,
		endpointId: null,
		updatedAt: new Date(0),
		...extra,
	};
}

describe("mergeSearchResults", () => {
	it("ranks title matches ahead of content-only hits", () => {
		const merged = mergeSearchResults({
			titleMatches: [conversation("a")],
			contentMatches: [conversation("b", { snippet: "…matched body…" })],
		});
		expect(merged.map((c) => c.id)).toEqual(["a", "b"]);
	});

	it("drops a content hit already present as a title match (dedupe by id)", () => {
		const merged = mergeSearchResults({
			titleMatches: [conversation("a")],
			contentMatches: [
				conversation("a", { snippet: "body" }),
				conversation("b", { snippet: "body" }),
			],
		});
		expect(merged.map((c) => c.id)).toEqual(["a", "b"]);
	});

	it("keeps the snippet on a content-only hit", () => {
		const merged = mergeSearchResults({
			titleMatches: [],
			contentMatches: [conversation("b", { snippet: "…the answer was 42…" })],
		});
		expect(merged[0]?.snippet).toBe("…the answer was 42…");
	});

	it("returns only title matches when there are no content hits", () => {
		const merged = mergeSearchResults({
			titleMatches: [conversation("a"), conversation("b")],
			contentMatches: [],
		});
		expect(merged.map((c) => c.id)).toEqual(["a", "b"]);
	});
});

describe("snippetSegments", () => {
	it("splits ts_headline markers into plain and highlighted runs", () => {
		const segments = snippetSegments("the great <<<barrier>>> <<<reef>>> here");
		expect(segments).toEqual([
			{ text: "the great ", highlight: false, start: 0 },
			{ text: "barrier", highlight: true, start: 10 },
			{ text: " ", highlight: false, start: 23 },
			{ text: "reef", highlight: true, start: 24 },
			{ text: " here", highlight: false, start: 34 },
		]);
	});

	it("treats a snippet with no markers as a single plain run", () => {
		expect(snippetSegments("no match markers")).toEqual([
			{ text: "no match markers", highlight: false, start: 0 },
		]);
	});

	it("gives every run a distinct start key even when highlight text repeats", () => {
		const segments = snippetSegments("<<<a>>> and <<<a>>>");
		expect(segments.map((s) => s.start)).toEqual([0, 7, 12]);
	});
});
