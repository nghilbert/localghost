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
