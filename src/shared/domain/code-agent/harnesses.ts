import type { LLMProvider } from "#/shared/lib/llm/provider";

/** Every harness id the code agent can run, the schema's single source of truth. */
export const CODE_AGENT_HARNESS_IDS = ["claude-code"] as const;
export type CodeAgentHarnessId = (typeof CODE_AGENT_HARNESS_IDS)[number];

/** One coding-agent harness the code agent can run. */
export type CodeAgentHarnessInfo = {
	id: CodeAgentHarnessId;
	label: string;
	/** What this harness is for, shown under its option. */
	description: string;
	/**
	 * Endpoint providers this harness can be pointed at, by wire protocol: Claude Code
	 * speaks the Anthropic Messages API, which llama.cpp also serves. Models are not
	 * listed here; they come from whichever endpoint the user picks.
	 */
	endpointProviders: LLMProvider[];
	/** The CLI this harness needs on the server's PATH. */
	executable: string;
};

export const CODE_AGENT_HARNESSES: readonly CodeAgentHarnessInfo[] = [
	{
		id: "claude-code",
		label: "Claude Code",
		description:
			"Anthropic's agent. Works best with Anthropic models; local models are hit or miss.",
		endpointProviders: ["anthropic", "llamacpp"],
		executable: "claude",
	},
] as const satisfies readonly CodeAgentHarnessInfo[];

/** The registry entry for a harness id, or undefined if it isn't registered. */
export function codeAgentHarness(id: string): CodeAgentHarnessInfo | undefined {
	return CODE_AGENT_HARNESSES.find((harness) => harness.id === id);
}

/**
 * Whether a harness can speak this endpoint provider's wire protocol. The form filters
 * its endpoint options with this; session creation re-checks rather than trust the client.
 */
export function harnessAcceptsProvider({
	harness,
	provider,
}: {
	harness: string;
	provider: string;
}): boolean {
	const providers: readonly string[] = codeAgentHarness(harness)?.endpointProviders ?? [];
	return providers.includes(provider);
}
