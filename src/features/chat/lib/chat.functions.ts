import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUserId } from "#/features/auth/lib/session.server";
import { decrypt, encrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { listModels, probeEndpoint } from "#/lib/llm.server";
import {
	createEndpointSchema,
	createSessionSchema,
	endpointIdInput,
	forkSessionInput,
	getEndpointModelsInput,
	searchMessagesInput,
	sessionIdInput,
	testEndpointInput,
	updateEndpointInput,
	updateSessionInput,
} from "./schemas";

// ── Model Endpoints ──────────────────────────────────────────

export const getEndpoints = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	const endpoints = await prisma.modelEndpoint.findMany({
		where: { ownerId: userId },
		orderBy: { createdAt: "asc" },
	});
	return endpoints.map((e) => ({
		...e,
		apiKeyEncrypted: undefined,
		hasApiKey: !!e.apiKeyEncrypted,
	}));
});

export const createEndpoint = createServerFn({ method: "POST" })
	.validator(createEndpointSchema)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const endpoint = await prisma.modelEndpoint.create({
			data: {
				name: data.name,
				url: data.url,
				apiKeyEncrypted: data.apiKey ? encrypt(data.apiKey) : null,
				provider: data.provider,
				ownerId: userId,
			},
		});
		return { ...endpoint, apiKeyEncrypted: undefined, hasApiKey: !!endpoint.apiKeyEncrypted };
	});

export const updateEndpoint = createServerFn({ method: "POST" })
	.validator(updateEndpointInput)
	.handler(async ({ data: { id, data: patch } }) => {
		const userId = await getCurrentUserId();
		const existing = await prisma.modelEndpoint.findFirst({ where: { id, ownerId: userId } });
		if (!existing) throw new Error("Not found");
		const endpoint = await prisma.modelEndpoint.update({
			where: { id },
			data: {
				...(patch.name !== undefined && { name: patch.name }),
				...(patch.url !== undefined && { url: patch.url }),
				...(patch.provider !== undefined && { provider: patch.provider }),
				...(patch.apiKey !== undefined && {
					apiKeyEncrypted: patch.apiKey ? encrypt(patch.apiKey) : null,
				}),
			},
		});
		return { ...endpoint, apiKeyEncrypted: undefined, hasApiKey: !!endpoint.apiKeyEncrypted };
	});

export const deleteEndpoint = createServerFn({ method: "POST" })
	.validator(endpointIdInput)
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		await prisma.modelEndpoint.deleteMany({ where: { id, ownerId: userId } });
	});

export const getEndpointModels = createServerFn({ method: "POST" })
	.validator(getEndpointModelsInput)
	.handler(async ({ data: { endpointId } }) => {
		const userId = await getCurrentUserId();
		const endpoint = await prisma.modelEndpoint.findFirst({
			where: { id: endpointId, ownerId: userId },
		});
		if (!endpoint) throw new Error("Not found");
		const apiKey = endpoint.apiKeyEncrypted ? decrypt(endpoint.apiKeyEncrypted) : undefined;
		return listModels(endpoint.url, apiKey);
	});

export const testEndpoint = createServerFn({ method: "POST" })
	.validator(testEndpointInput)
	.handler(async ({ data }) => {
		await getCurrentUserId();
		return probeEndpoint(data.url, data.apiKey);
	});

// ── Chat Sessions ─────────────────────────────────────────────

export const getSessions = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return prisma.chatSession.findMany({
		where: { ownerId: userId, archived: false },
		orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
		select: {
			id: true,
			name: true,
			model: true,
			mode: true,
			messageCount: true,
			lastMessageAt: true,
			createdAt: true,
			endpoint: { select: { id: true, name: true, url: true, provider: true } },
		},
	});
});

export const getSession = createServerFn({ method: "POST" })
	.validator(sessionIdInput)
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		const session = await prisma.chatSession.findFirst({
			where: { id, ownerId: userId },
			include: {
				messages: { orderBy: { createdAt: "asc" } },
				endpoint: { select: { id: true, name: true, url: true, provider: true } },
			},
		});
		if (!session) throw new Error("Not found");
		return session;
	});

export const createSession = createServerFn({ method: "POST" })
	.validator(createSessionSchema)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		return prisma.chatSession.create({
			data: {
				name: data.name,
				endpointId: data.endpointId ?? null,
				model: data.model,
				mode: data.mode,
				ownerId: userId,
			},
		});
	});

export const updateSession = createServerFn({ method: "POST" })
	.validator(updateSessionInput)
	.handler(async ({ data: { id, data: patch } }) => {
		const userId = await getCurrentUserId();
		const existing = await prisma.chatSession.findFirst({ where: { id, ownerId: userId } });
		if (!existing) throw new Error("Not found");
		return prisma.chatSession.update({ where: { id }, data: patch });
	});

export const deleteSession = createServerFn({ method: "POST" })
	.validator(sessionIdInput)
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		await prisma.chatSession.deleteMany({ where: { id, ownerId: userId } });
	});

export const searchMessages = createServerFn({ method: "POST" })
	.validator(searchMessagesInput)
	.handler(async ({ data: { query } }) => {
		const userId = await getCurrentUserId();
		const messages = await prisma.chatMessage.findMany({
			where: {
				content: { contains: query, mode: "insensitive" },
				session: { ownerId: userId, archived: false },
			},
			include: { session: { select: { id: true, name: true } } },
			orderBy: { createdAt: "desc" },
			take: 30,
		});
		return messages.map((m) => ({
			messageId: m.id,
			sessionId: m.session.id,
			sessionName: m.session.name,
			role: m.role,
			snippet: m.content.slice(0, 200),
			createdAt: m.createdAt,
		}));
	});

export const forkSession = createServerFn({ method: "POST" })
	.validator(forkSessionInput)
	.handler(async ({ data: { id, keepCount } }) => {
		const userId = await getCurrentUserId();
		const source = await prisma.chatSession.findFirst({
			where: { id, ownerId: userId },
			include: {
				messages: { orderBy: { createdAt: "asc" } },
				endpoint: { select: { id: true } },
			},
		});
		if (!source) throw new Error("Not found");

		const msgs = keepCount && keepCount > 0 ? source.messages.slice(0, keepCount) : source.messages;

		const forked = await prisma.chatSession.create({
			data: {
				name: `Fork: ${source.name}`,
				endpointId: source.endpointId,
				model: source.model,
				mode: source.mode,
				systemPrompt: source.systemPrompt,
				ragEnabled: source.ragEnabled,
				messageCount: msgs.length,
				ownerId: userId,
			},
		});

		if (msgs.length > 0) {
			await prisma.chatMessage.createMany({
				data: msgs.map((m) => ({
					sessionId: forked.id,
					role: m.role,
					content: m.content,
					metadata: m.metadata ?? undefined,
				})),
			});
		}

		return { id: forked.id };
	});

// ── Query options (for TanStack Query) ───────────────────────

export const endpointsQueryOptions = () =>
	queryOptions({ queryKey: ["endpoints"], queryFn: () => getEndpoints() });

export const sessionsQueryOptions = () =>
	queryOptions({ queryKey: ["sessions"], queryFn: () => getSessions() });

export const sessionQueryOptions = (id: string) =>
	queryOptions({ queryKey: ["session", id], queryFn: () => getSession({ data: { id } }) });
