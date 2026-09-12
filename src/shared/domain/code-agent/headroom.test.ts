import { describe, expect, it } from "vitest";
import {
	classifyAgentContextFit,
	contextHeadroomWarning,
	HARNESS_PROMPT_TOKENS,
} from "#/shared/domain/code-agent/headroom";

describe("contextHeadroomWarning", () => {
	it("warns with the arithmetic when headroom is thin", () => {
		expect(contextHeadroomWarning({ nCtx: 32_768 })).toBe(
			"32K context, ~24K spent on the harness, ~8K left for your task.",
		);
	});

	it("says nothing once headroom clears the comfortable threshold", () => {
		expect(contextHeadroomWarning({ nCtx: 65_536 })).toBeNull();
	});

	it("never reports negative headroom when the harness alone exceeds the window", () => {
		expect(contextHeadroomWarning({ nCtx: 8_192 })).toBe(
			"8K context, ~24K spent on the harness, ~0K left for your task.",
		);
	});
});

describe("classifyAgentContextFit", () => {
	it("flags a context window that can't clear the harness with room to spare", () => {
		expect(classifyAgentContextFit({ contextK: 8 })).toBe("too-small");
	});

	it("passes a window with comfortable headroom", () => {
		expect(classifyAgentContextFit({ contextK: 128 })).toBeNull();
	});

	it("passes an unknown context length rather than guessing", () => {
		expect(classifyAgentContextFit({ contextK: null })).toBeNull();
	});

	it("agrees with the harness constant at the boundary", () => {
		// contextK is in 1024-token units, so this is exactly HARNESS_PROMPT_TOKENS of context.
		const contextK = Math.floor(HARNESS_PROMPT_TOKENS / 1024);
		expect(classifyAgentContextFit({ contextK })).toBe("too-small");
	});
});
