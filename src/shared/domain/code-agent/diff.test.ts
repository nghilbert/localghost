import { describe, expect, it } from "vitest";
import { CODE_AGENT_DIFF_EVENT, isCodeAgentDiff } from "#/shared/domain/code-agent/diff";

describe("isCodeAgentDiff", () => {
	it("accepts the adapter's diff event", () => {
		expect(isCodeAgentDiff(CODE_AGENT_DIFF_EVENT, { path: ".", diff: "diff --git a b" })).toBe(
			true,
		);
	});

	it("rejects another event and a payload missing its fields", () => {
		expect(isCodeAgentDiff("something-else", { path: ".", diff: "x" })).toBe(false);
		expect(isCodeAgentDiff(CODE_AGENT_DIFF_EVENT, { path: "." })).toBe(false);
	});
});
