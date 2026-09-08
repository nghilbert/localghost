import { beforeEach, describe, expect, it, vi } from "vitest";

const { chat, claudeCodeText } = vi.hoisted(() => ({
	chat: vi.fn(),
	claudeCodeText: vi.fn(),
}));

vi.mock("@tanstack/ai", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/ai")>()),
	chat,
}));
vi.mock("@tanstack/ai-claude-code", () => ({ claudeCodeText }));

const { streamCodeAgentEvents } = await import("./run.server");

/** The `env` the adapter was built with on the last run. */
function adapterEnv(): Record<string, string> {
	const call = claudeCodeText.mock.calls[0];
	if (!call) throw new Error("claudeCodeText was never called");
	return call[1].env;
}

async function run(overrides: { apiKey: string }) {
	chat.mockReturnValue((async function* () {})());
	claudeCodeText.mockReturnValue({});
	const events = streamCodeAgentEvents({
		workspacePath: "/tmp/localghost-run-test",
		model: "qwen3.5",
		endpointUrl: "http://llamacpp:8080",
		endpointProvider: "llamacpp",
		approvedCommands: [],
		threadId: "11111111-1111-1111-1111-111111111111",
		messages: [],
		...overrides,
	});
	for await (const _ of events) {
		// drain
	}
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.unstubAllEnvs();
});

describe("streamCodeAgentEvents", () => {
	// The adapter copies the host's own Anthropic credentials into every spawn, and our
	// `env` is spread after it. Without these two keys the server owner's real credentials
	// would reach whatever URL the user pointed the endpoint at.
	it("overrides the host's Anthropic credentials with the session's own", async () => {
		vi.stubEnv("ANTHROPIC_API_KEY", "sk-host-secret");
		vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "host-token");

		await run({ apiKey: "sk-session" });

		expect(adapterEnv().ANTHROPIC_API_KEY).toBe("sk-session");
		expect(adapterEnv().ANTHROPIC_AUTH_TOKEN).toBe("");
	});

	it("blanks the token even when the session has no key of its own", async () => {
		await run({ apiKey: "" });

		expect(adapterEnv().ANTHROPIC_AUTH_TOKEN).toBe("");
		expect(adapterEnv().ANTHROPIC_API_KEY).not.toBe("sk-host-secret");
	});
});
