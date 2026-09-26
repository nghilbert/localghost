import { describe, expect, it } from "vitest";
import { defaultEnabledTools } from "./tool-catalog";

describe("defaultEnabledTools", () => {
	it("enables web search when the server offers it and nothing was carried over", () => {
		expect(defaultEnabledTools({ webSearchAvailable: true })).toEqual(["web_search"]);
	});

	it("enables nothing when the server doesn't offer web search", () => {
		expect(defaultEnabledTools({ webSearchAvailable: false })).toEqual([]);
	});

	it("prefers the toggles a new chat carried over over the web-search default", () => {
		expect(
			defaultEnabledTools({ webSearchAvailable: true, initialEnabledTools: ["memory"] }),
		).toEqual(["memory"]);
	});

	it("honors an empty carried-over selection instead of falling back", () => {
		expect(defaultEnabledTools({ webSearchAvailable: true, initialEnabledTools: [] })).toEqual([]);
	});
});
