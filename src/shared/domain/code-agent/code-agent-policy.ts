import type { StreamChunk } from "@tanstack/ai";
import { EventType } from "@tanstack/ai/client";
import { defineSandboxPolicy, type SandboxPolicy } from "@tanstack/ai-sandbox";

/**
 * The sandbox emits its approval request under this name, which `@tanstack/ai`'s stream
 * processor claims for *tool* approvals: it destructures an `approval.id` the sandbox
 * payload has no field for, then returns before the generic custom-event fan-out.
 */
const SANDBOX_APPROVAL_EVENT = "approval-requested";

/** What we re-emit it as, so it reaches `useChat`'s `onCustomEvent` intact. */
export const CODE_AGENT_APPROVAL_EVENT = "code-agent.approval";

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

/** A pending approval as the transcript renders it. */
export type CodeAgentApproval = { approvalId: string; title: string };

/** Whether a custom event payload is one of our renamed approval requests. */
export function isCodeAgentApproval(name: string, value: unknown): value is CodeAgentApproval {
	if (name !== CODE_AGENT_APPROVAL_EVENT || typeof value !== "object" || value === null) {
		return false;
	}
	const candidate: Record<string, unknown> = { ...value };
	return typeof candidate.approvalId === "string" && typeof candidate.title === "string";
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
