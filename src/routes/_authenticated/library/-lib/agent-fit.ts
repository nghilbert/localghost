import type { AgentContextFit } from "#/shared/domain/code-agent/headroom";

/** The label shown for the catalog's one code-agent fit signal: a proven "no", never a "yes". */
export const AGENT_FIT_LABELS: Record<AgentContextFit, string> = {
	"too-small": "Too small for a coding agent",
};
