/** What we re-emit the sandbox's approval request as, so it reaches `useChat`'s `onCustomEvent` intact. */
export const CODE_AGENT_APPROVAL_EVENT = "code-agent.approval";

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
 * The command an approval id refers to, or null when it cannot be granted: a non-`command`
 * kind (no grant path exists for those), or a target containing `*` (the policy matches an
 * allow entry as a glob, so granting it verbatim would approve more than was asked).
 */
export function approvalCommandTarget(approvalId: string): string | null {
	const [, kind, ...target] = approvalId.split(":");
	if (kind !== "command" || target.length === 0) return null;
	const command = target.join(":");
	return command.includes("*") ? null : command;
}
