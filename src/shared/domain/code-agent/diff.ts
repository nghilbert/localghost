/**
 * The adapter's own event name for a run's diff (`@tanstack/ai-claude-code`'s `emitDiff`),
 * not one we rename: unlike the sandbox's approval event, it already reaches us this way.
 */
export const CODE_AGENT_DIFF_EVENT = "file.changed";

/**
 * A run's working-tree diff. `path` is always `"."`: the adapter emits one aggregate
 * `git diff` per run, not one event per file, so it must never be shown as a filename.
 */
export type CodeAgentDiff = { path: string; diff: string };

/** Whether a custom event payload is the adapter's diff event. */
export function isCodeAgentDiff(name: string, value: unknown): value is CodeAgentDiff {
	if (name !== CODE_AGENT_DIFF_EVENT || typeof value !== "object" || value === null) return false;
	const candidate: Record<string, unknown> = { ...value };
	return typeof candidate.path === "string" && typeof candidate.diff === "string";
}
