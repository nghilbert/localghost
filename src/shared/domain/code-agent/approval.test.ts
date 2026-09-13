import { describe, expect, it } from "vitest";
import {
	approvalCommandTarget,
	CODE_AGENT_APPROVAL_EVENT,
	isCodeAgentApproval,
} from "#/shared/domain/code-agent/approval";

describe("isCodeAgentApproval", () => {
	it("accepts our renamed event", () => {
		expect(isCodeAgentApproval(CODE_AGENT_APPROVAL_EVENT, { approvalId: "a", title: "t" })).toBe(
			true,
		);
	});

	it("rejects another event and a payload missing its fields", () => {
		expect(isCodeAgentApproval("something-else", { approvalId: "a", title: "t" })).toBe(false);
		expect(isCodeAgentApproval(CODE_AGENT_APPROVAL_EVENT, { approvalId: "a" })).toBe(false);
	});
});

describe("approvalCommandTarget", () => {
	it("reads the command out of a command approval id", () => {
		expect(approvalCommandTarget("claude-code:command:npm test")).toBe("npm test");
	});

	it("keeps colons that belong to the command itself", () => {
		expect(approvalCommandTarget("claude-code:command:npm run build:prod")).toBe(
			"npm run build:prod",
		);
	});

	it("returns null for an approval that is not a command", () => {
		expect(approvalCommandTarget("claude-code:capability:fileWrite")).toBeNull();
	});

	it("returns null for a target containing a glob character, to avoid over-granting", () => {
		expect(approvalCommandTarget("claude-code:command:rm -rf src/*")).toBeNull();
	});
});
