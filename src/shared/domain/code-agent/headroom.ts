/**
 * Measured Claude Code harness prompt size (system prompt + tool definitions) in tokens,
 * before the user's first message. Re-sent and growing on every turn.
 */
export const HARNESS_PROMPT_TOKENS = 24_700;

/** Below this much leftover, the form warns the task is sharing a crowded window. Not measured. */
const MIN_COMFORTABLE_TOKENS = 16_384;

/** Below this much leftover, the catalog calls the fit a hard no rather than just tight. */
const MIN_VIABLE_TOKENS = 4_096;

function toK(tokens: number): number {
	return Math.round(Math.max(tokens, 0) / 1024);
}

function headroomTokens(contextTokens: number): number {
	return contextTokens - HARNESS_PROMPT_TOKENS;
}

/**
 * Warns when a context window leaves the task sharing a crowded window with the harness
 * prompt, spelling out the arithmetic rather than a bare "too small" claim.
 */
export function contextHeadroomWarning({ nCtx }: { nCtx: number }): string | null {
	const remaining = headroomTokens(nCtx);
	if (remaining >= MIN_COMFORTABLE_TOKENS) return null;
	return `${toK(nCtx)}K context, ~${toK(HARNESS_PROMPT_TOKENS)}K spent on the harness, ~${toK(remaining)}K left for your task.`;
}

export type AgentContextFit = "too-small";

/** The catalog's hard "no": whether a model's context leaves next to nothing once the harness fits. */
export function classifyAgentContextFit({
	contextK,
}: {
	contextK: number | null;
}): AgentContextFit | null {
	if (contextK === null) return null;
	return headroomTokens(contextK * 1024) < MIN_VIABLE_TOKENS ? "too-small" : null;
}
