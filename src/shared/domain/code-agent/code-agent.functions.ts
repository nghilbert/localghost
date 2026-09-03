import type { ModelMessage } from "@tanstack/ai";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Temporal } from "temporal-polyfill";
import { reviveMessageDates } from "#/shared/domain/conversation/messages";
import { authedFn } from "#/shared/lib/middleware";
import {
	findCodeAgentSession,
	findCodeAgentSessions,
	insertCodeAgentSession,
	recordApprovedCommand,
	removeCodeAgentSession,
} from "./code-agent.server";
import { availableCodeAgentHarnessIds } from "./harness-availability.server";
import { approvalCommandTarget } from "./policy.server";
import {
	approveCodeAgentCommandInput,
	codeAgentSessionIdInput,
	createCodeAgentSessionSchema,
	listWorkspaceEntriesSchema,
} from "./schemas";
import type { CodeAgentSessionListItem } from "./session-activity";
import { getCodeAgentWorkspaceRoot, listWorkspaceEntries } from "./workspace-path.server";

/** Reshapes a row's `updatedAt` for the RPC boundary: `Temporal.PlainDateTime`
 * has no registered serializer for `createServerFn`'s return-type check. */
function toRpcUpdatedAt<T extends { updatedAt: Temporal.PlainDateTime }>(row: T) {
	return { ...row, updatedAt: new Date(row.updatedAt.toString()) };
}

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
 * Allows a command the sandbox asked about, for the rest of this session.
 * @throws If the approval names something other than a command.
 */
export const approveCodeAgentCommand = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(approveCodeAgentCommandInput)
	.handler(async ({ data: { id, approvalId }, context }) => {
		const command = approvalCommandTarget(approvalId);
		if (!command) throw new Error("That approval does not name a command.");
		await recordApprovedCommand({ id, ownerId: context.userId, command });
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
