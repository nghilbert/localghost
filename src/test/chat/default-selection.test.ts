import { describe, expect, it } from "vitest";
import { orderEndpointsForDefault } from "#/features/chat/lib/default-selection";

describe("orderEndpointsForDefault", () => {
	it("puts the built-in ollama endpoint first", () => {
		const ordered = orderEndpointsForDefault([
			{ id: "a", provider: "openai" },
			{ id: "b", provider: "anthropic" },
			{ id: "c", provider: "ollama" },
		]);
		expect(ordered.map((e) => e.id)).toEqual(["c", "a", "b"]);
	});

	it("keeps added endpoints in their original order", () => {
		const ordered = orderEndpointsForDefault([
			{ id: "a", provider: "anthropic" },
			{ id: "b", provider: "openai" },
			{ id: "c", provider: "groq" },
		]);
		expect(ordered.map((e) => e.id)).toEqual(["a", "b", "c"]);
	});

	it("is a no-op when ollama is already first", () => {
		const ordered = orderEndpointsForDefault([
			{ id: "a", provider: "ollama" },
			{ id: "b", provider: "openai" },
		]);
		expect(ordered.map((e) => e.id)).toEqual(["a", "b"]);
	});

	it("returns an empty list unchanged", () => {
		expect(orderEndpointsForDefault([])).toEqual([]);
	});
});
