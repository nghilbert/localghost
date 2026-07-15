import { describe, expect, it } from "vitest";
import { defaultEnabledTools } from "#/routes/_authenticated/-lib/tool-catalog";

describe("defaultEnabledTools", () => {
	it("enables web search when the server offers it and there's no handoff", () => {
		expect(defaultEnabledTools({ webSearchAvailable: true })).toEqual(["web_search"]);
	});

	it("enables nothing when the server doesn't offer web search", () => {
		expect(defaultEnabledTools({ webSearchAvailable: false })).toEqual([]);
	});

	it("prefers an explicit handoff selection over the web-search default", () => {
		expect(
			defaultEnabledTools({ webSearchAvailable: true, initialEnabledTools: ["memory"] }),
		).toEqual(["memory"]);
	});

	it("honors an explicit empty handoff selection instead of falling back", () => {
		expect(defaultEnabledTools({ webSearchAvailable: true, initialEnabledTools: [] })).toEqual([]);
	});
});
