import type { StreamChunk } from "@tanstack/ai";
import { EventType } from "@tanstack/ai/client";
import { defineSandboxPolicy, type SandboxPolicy } from "@tanstack/ai-sandbox";
import { CODE_AGENT_APPROVAL_EVENT } from "./approval";

/**
 * The sandbox emits its approval request under this name, which `@tanstack/ai`'s stream
 * processor claims for *tool* approvals: it destructures an `approval.id` the sandbox
 * payload has no field for, then returns before the generic custom-event fan-out.
 */
const SANDBOX_APPROVAL_EVENT = "approval-requested";

/** Commands refused outright, whatever the user approves. Patterns glob on `*` only. */
const DENIED_COMMANDS = ["sudo *", "rm -rf *", "rm -fr *"];

/**
 * This run's policy. Capabilities are pre-allowed so every prompt is a command with a
 * concrete target; Claude Code confines writes to the workspace itself. `approvedCommands`
 * covers this run only: entries match as globs, so a stored one would let an approved
 * `src/*` stand in for any longer command sharing that prefix.
 */
export function buildCodeAgentPolicy({
	approvedCommands,
}: {
	approvedCommands: string[];
}): SandboxPolicy {
	return defineSandboxPolicy({
		default: "ask",
		commands: { deny: DENIED_COMMANDS, allow: approvedCommands },
		capabilities: { fileWrite: "allow", network: "allow" },
	});
}

/**
 * Re-emits the sandbox's approval requests under our own event name and passes every
 * other chunk through untouched.
 */
export async function* renameApprovalChunks(
	source: AsyncIterable<StreamChunk>,
): AsyncGenerator<StreamChunk> {
	for await (const chunk of source) {
		if (chunk.type === EventType.CUSTOM && chunk.name === SANDBOX_APPROVAL_EVENT) {
			yield { ...chunk, name: CODE_AGENT_APPROVAL_EVENT };
			continue;
		}
		yield chunk;
	}
}
