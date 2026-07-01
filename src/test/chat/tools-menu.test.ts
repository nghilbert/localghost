import { describe, expect, it, vi } from "vitest";
import type { ToolControls } from "#/features/chat/components/ChatInput/ToolsMenu";
import { toolRows } from "#/features/chat/components/ChatInput/ToolsMenu";

function makeControls(overrides: Partial<ToolControls> = {}): ToolControls {
	return {
		enabledTools: [],
		forceWebSearch: false,
		supportsTools: true,
		onEnabledToolsChange: vi.fn(),
		onForceWebSearchChange: vi.fn(),
		...overrides,
	};
}

const active = (controls: ToolControls) => toolRows(controls).filter((row) => row.on).length;

describe("toolRows", () => {
	it("reflects which tools are on in the active count", () => {
		expect(active(makeControls())).toBe(0);
		expect(active(makeControls({ forceWebSearch: true }))).toBe(1);
		expect(active(makeControls({ forceWebSearch: true, enabledTools: ["memory"] }))).toBe(2);
	});

	it("routes the web-search switch to onForceWebSearchChange", () => {
		const controls = makeControls();
		const webSearch = toolRows(controls).find((row) => row.id === "web_search");
		webSearch?.onChange(true);
		expect(controls.onForceWebSearchChange).toHaveBeenCalledWith(true);
	});

	it("adds and removes 'memory' from enabledTools without touching other ids", () => {
		const withOther = makeControls({ enabledTools: ["other"] });
		toolRows(withOther)
			.find((row) => row.id === "memory")
			?.onChange(true);
		expect(withOther.onEnabledToolsChange).toHaveBeenCalledWith(["other", "memory"]);

		const withMemory = makeControls({ enabledTools: ["other", "memory"] });
		toolRows(withMemory)
			.find((row) => row.id === "memory")
			?.onChange(false);
		expect(withMemory.onEnabledToolsChange).toHaveBeenCalledWith(["other"]);
	});
});
