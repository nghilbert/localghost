import { stat } from "node:fs/promises";
import { deleteChatThreadRows } from "#/shared/domain/chat/chat-persistence.server";
import { deriveConversationTitle, threadMessagesFrom } from "#/shared/domain/conversation/messages";
import { fetchEndpointModels } from "#/shared/domain/endpoint/endpoint.server";
import { prisma } from "#/shared/lib/db.server";
import { availableCodeAgentHarnessIds } from "./harness-availability.server";
import { harnessAcceptsProvider } from "./harnesses";
import { codeAgentModelSchema } from "./schemas";
import { type CodeAgentSessionListItem, sortSessionsByActivity } from "./session-activity";
import { assertWorkspacePathAllowed } from "./workspace-path.server";

/** Session list, ordered by whichever is more recent: the last message or a metadata edit. */
export async function findCodeAgentSessions({
	ownerId,
}: {
	ownerId: string;
}): Promise<CodeAgentSessionListItem[]> {
	const sessions = await prisma.codeAgentSession.findMany({
		where: { ownerId },
		select: { id: true, title: true, workspacePath: true, updatedAt: true },
	});
	const threads = await prisma.chatThread.findMany({
		where: { threadId: { in: sessions.map((session) => session.id) } },
		select: { threadId: true, updatedAt: true },
	});
	return sortSessionsByActivity({
		sessions,
		threadActivity: new Map(threads.map((thread) => [thread.threadId, thread.updatedAt])),
	});
}

/**
 * Full session row with client-safe endpoint config and its transcript, or null when
 * not owned. `hasRun` is what tells the client whether a seeded first message is still
 * waiting for its reply or the session simply ended on a user turn.
 */
export async function findCodeAgentSession({ id, ownerId }: { id: string; ownerId: string }) {
	const session = await prisma.codeAgentSession.findFirst({
		where: { id, ownerId },
		include: { endpoint: { select: { id: true, name: true, url: true, provider: true } } },
	});
	if (!session) return null;
	const thread = await prisma.chatThread.findUnique({
		where: { threadId: id },
		select: { messages: true },
	});
	const runs = await prisma.chatRun.count({ where: { threadId: id } });
	return { ...session, messages: thread?.messages ?? [], hasRun: runs > 0 };
}

/** The session with its complete endpoint row (encrypted key included) for an agent run. */
export function findCodeAgentSessionWithEndpoint({ id, ownerId }: { id: string; ownerId: string }) {
	return prisma.codeAgentSession.findFirst({ where: { id, ownerId }, include: { endpoint: true } });
}

/** Whether `id` is a session owned by `ownerId`. For authorization checks that need no row data. */
export async function codeAgentSessionOwnedBy({
	id,
	ownerId,
}: {
	id: string;
	ownerId: string;
}): Promise<boolean> {
	const count = await prisma.codeAgentSession.count({ where: { id, ownerId } });
	return count > 0;
}

/**
 * Creates a session seeded with the first user message, plus its `ChatThread` row.
 * Every client-supplied choice is re-checked: a run decrypts this endpoint's key and
 * edits this directory, and the session row is all that ties the two together.
 * @throws If the endpoint, harness, model or workspace can't run.
 */
export async function insertCodeAgentSession({
	ownerId,
	workspacePath,
	endpointId,
	harness,
	model,
	firstMessage,
}: {
	ownerId: string;
	workspacePath: string;
	endpointId: string;
	harness: string;
	model: string;
	firstMessage: string;
}): Promise<{ id: string }> {
	const endpoint = await prisma.endpoint.findFirst({
		where: { id: endpointId, ownerId },
		select: { provider: true },
	});
	if (!endpoint) throw new Error("That endpoint no longer exists.");
	if (!harnessAcceptsProvider({ harness, provider: endpoint.provider })) {
		throw new Error(`${harness} cannot drive a ${endpoint.provider} endpoint.`);
	}
	const availableIds: readonly string[] = await availableCodeAgentHarnessIds();
	if (!availableIds.includes(harness)) {
		throw new Error(`${harness}'s CLI isn't installed on this server.`);
	}

	// A model the endpoint doesn't serve would fail on the first run instead of here,
	// after the agent had already been pointed at the workspace.
	const parsedModel = codeAgentModelSchema.safeParse(model);
	if (!parsedModel.success) throw new Error("That model id has characters this server won't run.");
	const models = await fetchEndpointModels({ endpointId, ownerId }).catch(() => null);
	if (!models) throw new Error("Couldn't reach that endpoint to confirm the model.");
	if (!models.includes(parsedModel.data)) {
		throw new Error(`${model} isn't served by that endpoint.`);
	}

	await assertWorkspacePathAllowed(workspacePath);
	const stats = await stat(workspacePath).catch(() => null);
	if (!stats?.isDirectory()) {
		throw new Error(
			`This server cannot see a directory at ${workspacePath}. Paths resolve against the app process, so under Compose the directory has to sit inside CODE_AGENT_WORKSPACE_ROOT.`,
		);
	}

	return prisma.$transaction(async (tx) => {
		const session = await tx.codeAgentSession.create({
			data: {
				ownerId,
				workspacePath,
				endpointId,
				harness,
				model: parsedModel.data,
				title: deriveConversationTitle(firstMessage) ?? "New code session",
				approvedCommands: [],
			},
			select: { id: true },
		});
		await tx.chatThread.create({
			data: { threadId: session.id, messages: threadMessagesFrom({ content: firstMessage }) },
		});
		return session;
	});
}

/** Records a command the user approved, so the sandbox policy stops asking about it. */
export async function recordApprovedCommand({
	id,
	ownerId,
	command,
}: {
	id: string;
	ownerId: string;
	command: string;
}): Promise<void> {
	const session = await prisma.codeAgentSession.findFirst({
		where: { id, ownerId },
		select: { approvedCommands: true },
	});
	if (!session || session.approvedCommands.includes(command)) return;
	await prisma.codeAgentSession.update({
		where: { id },
		data: { approvedCommands: { push: command } },
	});
}

/**
 * Delete a code-agent session by id, plus its chat-persistence rows. The files it
 * edited are left alone. No-op when the id isn't owned.
 */
export async function removeCodeAgentSession({
	id,
	ownerId,
}: {
	id: string;
	ownerId: string;
}): Promise<void> {
	const owned = await prisma.codeAgentSession.findFirst({
		where: { id, ownerId },
		select: { id: true },
	});
	if (!owned) return;
	await prisma.$transaction([
		...deleteChatThreadRows({ threadId: id }),
		prisma.codeAgentSession.deleteMany({ where: { id, ownerId } }),
	]);
}
