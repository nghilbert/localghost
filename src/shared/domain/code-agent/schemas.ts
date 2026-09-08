import { z } from "zod/v4";
import { CODE_AGENT_HARNESS_IDS } from "./harnesses";

const uuid = z.uuid();

export const codeAgentHarnessSchema = z.enum(CODE_AGENT_HARNESS_IDS);

/**
 * A model id the server will launch a harness with. The charset is the point: this is
 * read back from the session row on every run and handed to a child process, so it
 * must not be able to carry shell syntax.
 */
export const codeAgentModelSchema = z
	.string()
	.min(1, "Choose a model from this endpoint.")
	.max(200)
	.regex(/^[A-Za-z0-9._:@/+-]+$/, "That model id has characters this server won't run.");

export const createCodeAgentSessionSchema = z.object({
	workspacePath: z
		.string()
		.min(1, "Choose a folder for the agent to work in.")
		.startsWith("/", "Use an absolute path, starting with /."),
	endpointId: z.uuid("Choose an endpoint for this harness."),
	harness: codeAgentHarnessSchema,
	model: codeAgentModelSchema,
	firstMessage: z.string().min(1, "Describe the first task for the agent."),
});

/** The subpath a workspace-browser client is currently navigating, relative to its root. */
export const listWorkspaceEntriesSchema = z.object({
	subpath: z.string().max(4096).default(""),
});

export const codeAgentSessionIdInput = z.object({ id: uuid });

/**
 * Approvals the user granted for this run, as the sandbox's `provider:kind:target` ids.
 * They widen the run's policy and are never stored: the harness denies an `ask` action and
 * asks the client to re-run with a decision, so a grant is only ever worth one run.
 */
export const codeAgentStreamForwardedPropsSchema = z.object({
	approvedApprovalIds: z.array(z.string().min(1).max(4096)).max(50).default([]),
});

/** The agent stream's run identity: the session id doubles as the AG-UI thread id. */
export const codeAgentThreadIdSchema = uuid;
