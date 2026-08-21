import type { ModelMessage } from "@tanstack/ai";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { storedMessages } from "#/shared/domain/conversation/messages";
import { authedFn } from "#/shared/lib/middleware";
import {
	findCodeAgentSession,
	findCodeAgentSessions,
	insertCodeAgentSession,
	removeCodeAgentSession,
} from "./code-agent.server";
import { availableCodeAgentHarnessIds } from "./harness-availability.server";
import { codeAgentSessionIdInput, createCodeAgentSessionSchema } from "./schemas";

/** Which harnesses this server can run, by whether their CLI is on PATH. */
export const getCodeAgentAvailability = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async () => ({ availableHarnessIds: await availableCodeAgentHarnessIds() }));

/** Session list: only the fields needed to render and order session links. */
export const listCodeAgentSessions = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(({ context }) => findCodeAgentSessions({ ownerId: context.userId }));

/**
 * Full session row, including the `messages` blob and endpoint config.
 * @throws If no session with that id is owned by the current user.
 */
export const getCodeAgentSession = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(codeAgentSessionIdInput)
	.handler(async ({ data: { id }, context }) => {
		const session = await findCodeAgentSession({ id, ownerId: context.userId });
		if (!session) throw new Error("Not found");
		return session;
	});

/** A session as the query cache holds it: the row with `messages` typed. */
export type CodeAgentSessionDetail = Omit<
	Awaited<ReturnType<typeof getCodeAgentSession>>,
	"messages"
> & { messages: ModelMessage[] };

/**
 * Creates a session locked to the workspace/model selection.
 * See {@link insertCodeAgentSession} for the checks a client selection is re-validated against.
 */
export const createCodeAgentSession = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(createCodeAgentSessionSchema)
	.handler(({ data, context }) => insertCodeAgentSession({ ownerId: context.userId, ...data }));

/** Delete a code-agent session by id. No-op when the id isn't owned by the current user. */
export const deleteCodeAgentSession = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(codeAgentSessionIdInput)
	.handler(async ({ data: { id }, context }) => {
		await removeCodeAgentSession({ id, ownerId: context.userId });
	});

// ── Query options (for TanStack Query) ───────────────────────

export const codeAgentAvailabilityQueryOptions = () =>
	queryOptions({
		queryKey: ["code-agent-availability"],
		queryFn: () => getCodeAgentAvailability(),
		// Short-lived: installing the CLI should make the form appear on the next visit.
		staleTime: 30_000,
	});

export const codeAgentSessionsQueryOptions = () =>
	queryOptions({
		queryKey: ["code-agent-sessions"],
		queryFn: () => listCodeAgentSessions(),
	});

export const codeAgentSessionQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["code-agent-session", id],
		// The server fn returns `messages` as the raw JSONB value; type it at the query seam.
		queryFn: async (): Promise<CodeAgentSessionDetail> => {
			const session = await getCodeAgentSession({ data: { id } });
			return { ...session, messages: storedMessages(session.messages) };
		},
	});
