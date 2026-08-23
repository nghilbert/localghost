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
 * The session's policy. Capabilities are pre-allowed so every prompt is a command with
 * a concrete target: Claude Code's own settings already confine writes to the
 * workspace, and a file-write prompt carries nothing the user could judge.
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
 * The command an approval id refers to. Ids are `provider:kind:target`, so anything
 * that isn't a command approval returns null and is not persistable as one.
 */
export function approvalCommandTarget(approvalId: string): string | null {
	const [, kind, ...target] = approvalId.split(":");
	if (kind !== "command" || target.length === 0) return null;
	return target.join(":");
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
