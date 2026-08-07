import { describe, expect, it } from "vitest";
import { buildChatSystemPrompt, currentDateTimeLine } from "#/shared/domain/chat/system-prompt";

describe("currentDateTimeLine", () => {
	it("formats in the given IANA timezone with the zone name", () => {
		const line = currentDateTimeLine("Asia/Tokyo");
		expect(line).toMatch(/^Current date and time: /);
		expect(line).toContain("GMT+9");
	});

	it("falls back to the server timezone on an invalid zone", () => {
		expect(currentDateTimeLine("Not/AZone")).toMatch(/^Current date and time: /);
	});
});

describe("buildChatSystemPrompt", () => {
	it("always starts with the date line", () => {
		const prompt = buildChatSystemPrompt({ enabledTools: [] });
		expect(prompt).toMatch(/^Current date and time: /);
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
		const prompt = buildChatSystemPrompt({ userPrompt: "   ", enabledTools: [] });
		expect(prompt).not.toContain("\n\n");
	});
});
