import { describe, expect, it } from "vitest";
import {
	CODE_AGENT_HARNESS_IDS,
	CODE_AGENT_HARNESSES,
	codeAgentHarness,
	harnessAcceptsProvider,
} from "#/shared/domain/code-agent/harnesses";
import { codeAgentHarnessSchema } from "#/shared/domain/code-agent/schemas";

describe("CODE_AGENT_HARNESSES", () => {
	it("stays in step with the schema's enum", () => {
		expect(CODE_AGENT_HARNESSES.map((harness) => harness.id)).toEqual([...CODE_AGENT_HARNESS_IDS]);
		for (const id of CODE_AGENT_HARNESS_IDS) {
			expect(codeAgentHarnessSchema.safeParse(id).success).toBe(true);
		}
	});
});

describe("harnessAcceptsProvider", () => {
	it("accepts every provider its registry entry lists", () => {
		for (const harness of CODE_AGENT_HARNESSES) {
			for (const provider of harness.endpointProviders) {
				expect(harnessAcceptsProvider({ harness: harness.id, provider })).toBe(true);
			}
		}
	});

	it("rejects a provider whose wire protocol the harness does not speak", () => {
		expect(harnessAcceptsProvider({ harness: "claude-code", provider: "openai" })).toBe(false);
	});

	it("rejects everything for an unregistered harness", () => {
		expect(harnessAcceptsProvider({ harness: "nonexistent", provider: "llamacpp" })).toBe(false);
		expect(codeAgentHarness("nonexistent")).toBeUndefined();
	});
});
