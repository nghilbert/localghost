import { mkdir } from "node:fs/promises";
import { z } from "zod/v4";
import { db } from "#/prisma/db";
import { deleteChatThreadRows } from "#/shared/domain/chat/persistence.server";
import { deriveConversationTitle, threadMessagesFrom } from "#/shared/domain/conversation/messages";
import { fetchEndpointModels } from "#/shared/domain/endpoint/endpoint.server";
import { nowTimestamp } from "#/shared/lib/temporal";
import { availableCodeAgentHarnessIds } from "./harness-availability.server";
import { harnessAcceptsProvider } from "./harnesses";
import { codeAgentModelSchema } from "./schemas";
import { type CodeAgentSessionListItem, sortSessionsByActivity } from "./session-activity";
import { getCodeAgentWorkspaceRoot, resolveContainedPath } from "./workspace-path.server";

/** Session list, ordered by whichever is more recent: the last message or a metadata edit. */
export async function findCodeAgentSessions({
	ownerId,
}: {
	ownerId: string;
}): Promise<CodeAgentSessionListItem[]> {
	const sessions = await db.orm.public.CodeAgentSession.where({ ownerId })
		.select("id", "title", "workspacePath", "updatedAt")
		.all();
	const threads = await db.orm.public.ChatThread.where((t) =>
		t.threadId.in(sessions.map((s) => s.id)),
	)
		.select("threadId", "updatedAt")
		.all();
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
	const session = await db.orm.public.CodeAgentSession.where({ id, ownerId })
		.include("endpoint", (e) => e.select("id", "name", "url", "provider"))
		.first();
	if (!session) return null;
	const thread = await db.orm.public.ChatThread.select("messages").first({ threadId: id });
	const { runs } = await db.orm.public.ChatRun.where({ threadId: id }).aggregate((a) => ({
		runs: a.count(),
	}));
	return { ...session, messages: thread?.messages ?? [], hasRun: runs > 0 };
}

/** The session with its complete endpoint row (encrypted key included) for an agent run. */
export function findCodeAgentSessionWithEndpoint({ id, ownerId }: { id: string; ownerId: string }) {
	return db.orm.public.CodeAgentSession.where({ id, ownerId })
		.include("endpoint", (e) =>
			e.select(
				"id",
				"name",
				"url",
				"apiKeyEncrypted",
				"provider",
				"options",
				"ownerId",
				"updatedAt",
				"discovered",
			),
		)
		.first();
}

/** Whether `id` is a session owned by `ownerId`. For authorization checks that need no row data. */
export async function codeAgentSessionOwnedBy({
	id,
	ownerId,
}: {
	id: string;
	ownerId: string;
}): Promise<boolean> {
	const { total } = await db.orm.public.CodeAgentSession.where({ id, ownerId }).aggregate((a) => ({
		total: a.count(),
	}));
	return total > 0;
}

/**
 * Creates a session seeded with the first user message, plus its `ChatThread` row.
 * Every client-supplied choice is re-checked before a run touches this endpoint's key or edits this directory.
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
	const endpoint = await db.orm.public.Endpoint.select("provider")
		.where({ id: endpointId, ownerId })
		.first();
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

	const root = await getCodeAgentWorkspaceRoot();
	const resolvedWorkspacePath = await resolveContainedPath({ root, target: workspacePath });
	await mkdir(resolvedWorkspacePath, { recursive: true });

	return db.transaction(async (tx) => {
		const session = await tx.orm.public.CodeAgentSession.select("id").create({
			ownerId,
			workspacePath: resolvedWorkspacePath,
			endpointId,
			harness,
			model: parsedModel.data,
			title: deriveConversationTitle(firstMessage) ?? "New code session",
			approvedCommands: [],
			updatedAt: nowTimestamp(),
		});
		await tx.orm.public.ChatThread.create({
			threadId: session.id,
			messages: threadMessagesFrom({ content: firstMessage }),
			updatedAt: nowTimestamp(),
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
	const session = await db.orm.public.CodeAgentSession.select("approvedCommands")
		.where({ id, ownerId })
		.first();
	if (!session) return;
	const approvedCommands = z.array(z.string()).parse(session.approvedCommands);
	if (approvedCommands.includes(command)) return;
	await db.orm.public.CodeAgentSession.where({ id }).update({
		approvedCommands: [...approvedCommands, command],
		updatedAt: nowTimestamp(),
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
	await db.transaction(async (tx) => {
		const owned = await tx.orm.public.CodeAgentSession.select("id").where({ id, ownerId }).first();
		if (!owned) return;
		await deleteChatThreadRows({ tx, threadId: id });
		await tx.orm.public.CodeAgentSession.where({ id, ownerId }).delete();
	});
}
