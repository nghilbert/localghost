import { describe, expect, it } from "vitest";
import {
	buildChatSystemPrompt,
	currentDateTimeLine,
} from "#/features/send-message/lib/system-prompt";

describe("currentDateTimeLine", () => {
	it("formats in the given IANA timezone with the zone name", () => {
		const line = currentDateTimeLine("Asia/Tokyo");
		expect(line).toMatch(/^Current date and time: /);
		expect(line).toContain("GMT+9");
	});

	it("falls back to the server timezone on an invalid zone", () => {
		expect(currentDateTimeLine("Not/AZone")).toMatch(/^Current date and time: /);
	});

	it("tells the model the timestamp is authoritative", () => {
		expect(currentDateTimeLine()).toContain("answer time questions from it directly");
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
		const without = buildChatSystemPrompt({ enabledTools: ["memory"] });
		expect(without).not.toContain("web_search tool");
	});

	it("adds the memory directive only when memory is enabled", () => {
		const withMemory = buildChatSystemPrompt({ enabledTools: ["memory"] });
		expect(withMemory).toContain("Use the manage_memory tool");
		const without = buildChatSystemPrompt({ enabledTools: ["web_search"] });
		expect(without).not.toContain("manage_memory tool");
	});

	it("skips blank user prompts", () => {
		const prompt = buildChatSystemPrompt({ userPrompt: "   ", enabledTools: [] });
		expect(prompt).not.toContain("\n\n");
	});
});
