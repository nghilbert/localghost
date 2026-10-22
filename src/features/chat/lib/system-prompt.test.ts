import { afterEach, describe, expect, it, vi } from "vitest";
import { buildChatSystemPrompt, currentDateLine } from "./system-prompt";

afterEach(() => {
	vi.useRealTimers();
});

describe("currentDateLine", () => {
	it("gives the date in the given IANA timezone", () => {
		vi.useFakeTimers({ now: new Date("2026-10-14T20:00:00Z") });

		expect(currentDateLine("Asia/Tokyo")).toContain("Thursday, October 15, 2026");
		expect(currentDateLine("America/New_York")).toContain("Wednesday, October 14, 2026");
	});

	it("falls back to the server timezone on an invalid zone", () => {
		vi.useFakeTimers({ now: new Date("2026-10-14T12:00:00Z") });

		expect(currentDateLine("Not/AZone")).toContain("2026");
	});
});

describe("buildChatSystemPrompt", () => {
	it("always starts with the date line", () => {
		const prompt = buildChatSystemPrompt({ enabledTools: [] });
		expect(prompt).toMatch(/^Today's date: /);
	});

	it("stays the same through the day, so the provider's prompt cache keeps matching", () => {
		const prompt = () => buildChatSystemPrompt({ enabledTools: [], timeZone: "UTC" });
		vi.useFakeTimers({ now: new Date("2026-10-14T09:00:00Z") });
		const morning = prompt();

		vi.setSystemTime(new Date("2026-10-14T10:00:01Z"));

		expect(prompt()).toBe(morning);
	});

	it("appends the trimmed user prompt", () => {
		const prompt = buildChatSystemPrompt({ userPrompt: "  Be brief.  ", enabledTools: [] });
		expect(prompt).toContain("\n\nBe brief.");
	});

	it("adds the search directive only when web_search is enabled", () => {
		const withSearch = buildChatSystemPrompt({ enabledTools: ["web_search"] });
		expect(withSearch).toContain("Use the web_search tool");
		const without = buildChatSystemPrompt({ enabledTools: [] });
		expect(without).not.toContain("web_search tool");
	});

	it("skips blank user prompts", () => {
		const prompt = buildChatSystemPrompt({ userPrompt: " ".repeat(3), enabledTools: [] });
		expect(prompt).not.toContain("\n\n");
	});
});
