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
		.min(1, "Enter the directory the agent should work in.")
		.startsWith("/", "Use an absolute path, starting with /."),
	endpointId: z.uuid("Choose an endpoint for this harness."),
	harness: codeAgentHarnessSchema,
	model: codeAgentModelSchema,
	firstMessage: z.string().min(1, "Describe the first task for the agent."),
});

export const codeAgentSessionIdInput = z.object({ id: uuid });

/** Approving one command the sandbox asked about, for the rest of this session. */
export const approveCodeAgentCommandInput = z.object({ id: uuid, approvalId: z.string().min(1) });

/** The agent stream's run identity: the session id doubles as the AG-UI thread id. */
export const codeAgentThreadIdSchema = uuid;
