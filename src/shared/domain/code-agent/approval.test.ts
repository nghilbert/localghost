import { describe, expect, it } from "vitest";
import {
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
