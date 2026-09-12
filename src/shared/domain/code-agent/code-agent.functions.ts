import { type ModelMessage, requestRunCancel } from "@tanstack/ai";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { chatPersistence, findRunThreadId } from "#/shared/domain/chat/persistence.server";
import { chatRunIdSchema } from "#/shared/domain/chat/schemas";
import { reviveMessageDates } from "#/shared/domain/conversation/messages";
import { authedFn } from "#/shared/lib/middleware";
import {
	codeAgentSessionOwnedBy,
	findCodeAgentModelWarnings,
	findCodeAgentSession,
	findCodeAgentSessions,
	insertCodeAgentSession,
	removeCodeAgentSession,
} from "./code-agent.server";
import { availableCodeAgentHarnessIds } from "./harness-availability.server";
import {
	codeAgentModelWarningsSchema,
	codeAgentSessionIdInput,
	createCodeAgentSessionSchema,
	listWorkspaceEntriesSchema,
} from "./schemas";
import { getCodeAgentWorkspaceRoot, listWorkspaceEntries } from "./workspace-path.server";

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

/**
 * Records an explicit cancel for a run: the out-of-band signal `/api/agent/stream`'s
 * disconnect handler checks to tell Stop apart from a dropped connection, which
 * produces the identical disconnect.
 */
export const requestCodeAgentRunCancel = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(chatRunIdSchema)
	.handler(async ({ data: runId, context }) => {
		const threadId = await findRunThreadId({ runId });
		if (!threadId || !(await codeAgentSessionOwnedBy({ id: threadId, ownerId: context.userId })))
			return;
		await requestRunCancel(chatPersistence.stores.runs, runId);
	});

/** Delete a code-agent session by id. No-op when the id isn't owned by the current user. */
export const deleteCodeAgentSession = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(codeAgentSessionIdInput)
	.handler(async ({ data: { id }, context }) => {
		await removeCodeAgentSession({ id, ownerId: context.userId });
	});

/** The workspace browser's current level: its root plus the subdirectories at `subpath`. */
export const listCodeAgentWorkspaceEntries = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.validator(listWorkspaceEntriesSchema)
	.handler(async ({ data: { subpath } }) => {
		const root = await getCodeAgentWorkspaceRoot();
		const entries = await listWorkspaceEntries({ root, subpath });
		return { root, subpath, entries };
	});

/** Non-blocking warnings for the endpoint/model pair a session form is considering. */
export const getCodeAgentModelWarnings = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.validator(codeAgentModelWarningsSchema)
	.handler(({ data: { endpointId, model }, context }) =>
		findCodeAgentModelWarnings({ endpointId, ownerId: context.userId, model }),
	);

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
			const messages: ModelMessage[] = JSON.parse(JSON.stringify(session.messages ?? []));
			return { ...session, messages: reviveMessageDates(messages) };
		},
	});

export const codeAgentWorkspaceEntriesQueryOptions = (subpath: string) =>
	queryOptions({
		queryKey: ["code-agent-workspace-entries", subpath],
		queryFn: () => listCodeAgentWorkspaceEntries({ data: { subpath } }),
	});

export const codeAgentModelWarningsQueryOptions = ({
	endpointId,
	model,
}: {
	endpointId: string;
	model: string;
}) =>
	queryOptions({
		queryKey: ["code-agent-model-warnings", endpointId, model],
		queryFn: () => getCodeAgentModelWarnings({ data: { endpointId, model } }),
	});
