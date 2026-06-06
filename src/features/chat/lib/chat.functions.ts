import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod/v4";
import { decrypt, encrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { listModels } from "#/lib/llm.server";
import {
	createEndpointSchema,
	createSessionSchema,
	updateEndpointSchema,
	updateSessionSchema,
} from "./schemas";

async function getCurrentUserId(): Promise<string> {
	const { auth } = await import("#/features/auth/lib/auth.server");
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

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
	.inputValidator(createEndpointSchema)
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
	.inputValidator(z.object({ id: z.uuid(), data: updateEndpointSchema }))
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
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		await prisma.modelEndpoint.deleteMany({ where: { id, ownerId: userId } });
	});

export const getEndpointModels = createServerFn({ method: "POST" })
	.inputValidator(z.object({ endpointId: z.uuid() }))
	.handler(async ({ data: { endpointId } }) => {
		const userId = await getCurrentUserId();
		const endpoint = await prisma.modelEndpoint.findFirst({
			where: { id: endpointId, ownerId: userId },
		});
		if (!endpoint) throw new Error("Not found");
		const apiKey = endpoint.apiKeyEncrypted ? decrypt(endpoint.apiKeyEncrypted) : undefined;
		return listModels(endpoint.url, apiKey);
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
	.inputValidator(z.object({ id: z.uuid() }))
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
	.inputValidator(createSessionSchema)
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
	.inputValidator(z.object({ id: z.uuid(), data: updateSessionSchema }))
	.handler(async ({ data: { id, data: patch } }) => {
		const userId = await getCurrentUserId();
		const existing = await prisma.chatSession.findFirst({ where: { id, ownerId: userId } });
		if (!existing) throw new Error("Not found");
		return prisma.chatSession.update({ where: { id }, data: patch });
	});

export const deleteSession = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		await prisma.chatSession.deleteMany({ where: { id, ownerId: userId } });
	});

export const searchMessages = createServerFn({ method: "POST" })
	.inputValidator(z.object({ query: z.string().min(1).max(200) }))
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

// ── Query options (for TanStack Query) ───────────────────────

export const endpointsQueryOptions = () =>
	queryOptions({ queryKey: ["endpoints"], queryFn: () => getEndpoints() });

export const sessionsQueryOptions = () =>
	queryOptions({ queryKey: ["sessions"], queryFn: () => getSessions() });

export const sessionQueryOptions = (id: string) =>
	queryOptions({ queryKey: ["session", id], queryFn: () => getSession({ data: { id } }) });
