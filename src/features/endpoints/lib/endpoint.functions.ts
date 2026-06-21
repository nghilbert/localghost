import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUserId } from "#/features/auth/lib/session.server";
import { decrypt, encrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { listModels, probeEndpoint } from "#/lib/llm.server";
import {
	createEndpointSchema,
	endpointIdInput,
	getEndpointModelsInput,
	modelCapabilitiesInput,
	testEndpointInput,
	updateEndpointInput,
} from "./schemas";

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

/**
 * Reports whether a model can use tools, so the chat UI can disable the tool
 * picker for models that can't. Only local Ollama models are checked (via
 * `/api/show` capabilities); cloud providers support tools, and any unknown or
 * unreachable case is assumed capable so a working model is never wrongly blocked.
 */
export const getModelCapabilities = createServerFn({ method: "POST" })
	.validator(modelCapabilitiesInput)
	.handler(async ({ data }): Promise<{ supportsTools: boolean }> => {
		const userId = await getCurrentUserId();
		const endpoint = await prisma.modelEndpoint.findFirst({
			where: { id: data.endpointId, ownerId: userId },
		});
		if (endpoint?.provider !== "ollama") return { supportsTools: true };

		const url = endpoint.url.replace(/\/+$/, "");
		try {
			const res = await fetch(`${url}/api/show`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ model: data.model }),
				signal: AbortSignal.timeout(5000),
			});
			if (!res.ok) return { supportsTools: true };
			const json: { capabilities?: string[] } = await res.json();
			if (!json.capabilities) return { supportsTools: true };
			return { supportsTools: json.capabilities.includes("tools") };
		} catch {
			return { supportsTools: true };
		}
	});

// ── Query options (for TanStack Query) ───────────────────────

export const endpointsQueryOptions = () =>
	queryOptions({ queryKey: ["endpoints"], queryFn: () => getEndpoints() });

export const endpointModelsQueryOptions = (endpointId: string) =>
	queryOptions({
		queryKey: ["endpoint-models", endpointId],
		queryFn: () => getEndpointModels({ data: { endpointId } }),
		staleTime: 30_000,
	});

export const modelCapabilitiesQueryOptions = (endpointId: string, model: string) =>
	queryOptions({
		queryKey: ["model-capabilities", endpointId, model],
		queryFn: () => getModelCapabilities({ data: { endpointId, model } }),
		staleTime: 5 * 60_000,
	});
