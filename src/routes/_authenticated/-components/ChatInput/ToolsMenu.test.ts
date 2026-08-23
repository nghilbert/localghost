import { describe, expect, it, vi } from "vitest";
import type { ToolControls } from "#/routes/_authenticated/-components/ChatInput/ToolsMenu";
import { toolRows } from "#/routes/_authenticated/-components/ChatInput/ToolsMenu";

function makeControls(overrides: Partial<ToolControls> = {}): ToolControls {
	return {
		enabledTools: [],
		supportsTools: true,
		onEnabledToolsChange: vi.fn(),
		...overrides,
	};
}

const active = (controls: ToolControls) => toolRows(controls).filter((row) => row.on).length;

describe("toolRows", () => {
	it("reflects which tools are on in the active count", () => {
		expect(active(makeControls())).toBe(0);
		expect(active(makeControls({ enabledTools: ["web_search"] }))).toBe(1);
	});

	it("adds and removes a tool id from enabledTools without touching other ids", () => {
		const withOther = makeControls({ enabledTools: ["other"] });
		toolRows(withOther)
			.find((row) => row.id === "web_search")
			?.onChange(true);
		expect(withOther.onEnabledToolsChange).toHaveBeenCalledWith(["other", "web_search"]);

		const withBoth = makeControls({ enabledTools: ["other", "web_search"] });
		toolRows(withBoth)
			.find((row) => row.id === "web_search")
			?.onChange(false);
		expect(withBoth.onEnabledToolsChange).toHaveBeenCalledWith(["other"]);
	});
});
