import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scrubbedEnvKeys } from "#/shared/domain/code-agent/code-agent-env.server";

describe("scrubbedEnvKeys", () => {
	const original = { ...process.env };

	beforeEach(() => {
		process.env.LOCALGHOST_TEST_SECRET = "should-be-scrubbed";
	});
	afterEach(() => {
		process.env = { ...original };
	});

	it("scrubs a var that is neither plumbing nor injected", () => {
		expect(scrubbedEnvKeys({ injected: {} })).toContain("LOCALGHOST_TEST_SECRET");
	});

	it("keeps shell plumbing the harness needs", () => {
		const scrubbed = scrubbedEnvKeys({ injected: {} });
		expect(scrubbed).not.toContain("PATH");
		expect(scrubbed).not.toContain("HOME");
	});

	it("keeps an injected key the host environment also defines", () => {
		process.env.ANTHROPIC_API_KEY = "host-value";

		expect(scrubbedEnvKeys({ injected: { ANTHROPIC_API_KEY: "session-value" } })).not.toContain(
			"ANTHROPIC_API_KEY",
		);
	});
});
