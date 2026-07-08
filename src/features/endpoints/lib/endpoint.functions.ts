import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUserId } from "#/features/auth/lib/session.server";
import { ollamaClient } from "#/features/library/lib/ollama/client.server";
import { decrypt, encrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { listModels, probeEndpoint } from "#/lib/llm.server";
import {
	createEndpointSchema,
	endpointIdInput,
	listEndpointModelsInput,
	modelCapabilitiesInput,
	testEndpointInput,
	updateEndpointInput,
} from "./schemas";
import type { ModelSelection } from "./types";

/**
 * The current user's configured endpoints.
 * @returns Each endpoint with its encrypted key stripped and a `hasApiKey` flag instead.
 */
export const listEndpoints = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	const endpoints = await prisma.modelEndpoint.findMany({
		where: { ownerId: userId },
		orderBy: { id: "asc" },
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
				...(data.options && { options: data.options }),
			},
		});
		return { ...endpoint, apiKeyEncrypted: undefined, hasApiKey: !!endpoint.apiKeyEncrypted };
	});

/**
 * Patch an endpoint's fields; re-encrypts the key when `apiKey` is supplied.
 * @returns The updated endpoint, key stripped, with a `hasApiKey` flag.
 * @throws If no endpoint with that id is owned by the current user.
 */
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
				...(patch.options !== undefined && { options: patch.options }),
			},
		});
		return { ...endpoint, apiKeyEncrypted: undefined, hasApiKey: !!endpoint.apiKeyEncrypted };
	});

export const deleteEndpoint = createServerFn({ method: "POST" })
	.validator(endpointIdInput)
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		// Clear the model on conversations using this endpoint so the (endpointId, model)
		// pair goes null together; the FK's SetNull only nulls endpointId. Keeps history,
		// reopening the chat to a fresh model pick instead of an orphaned model string.
		await prisma.conversation.updateMany({
			where: { endpointId: id, ownerId: userId },
			data: { model: null },
		});
		await prisma.modelEndpoint.deleteMany({ where: { id, ownerId: userId } });
	});

export const listEndpointModels = createServerFn({ method: "POST" })
	.validator(listEndpointModelsInput)
	.handler(async ({ data: { endpointId } }) => {
		const userId = await getCurrentUserId();
		const endpoint = await prisma.modelEndpoint.findFirst({
			where: { id: endpointId, ownerId: userId },
		});
		if (!endpoint) throw new Error("Not found");
		const apiKey = endpoint.apiKeyEncrypted ? decrypt(endpoint.apiKeyEncrypted) : undefined;
		return listModels({ url: endpoint.url, apiKey });
	});

export const testEndpoint = createServerFn({ method: "POST" })
	.validator(testEndpointInput)
	.handler(async ({ data }) => {
		await getCurrentUserId();
		return probeEndpoint({ url: data.url, apiKey: data.apiKey });
	});

/**
 * Whether a model can use tools, so the chat UI can disable the tool picker.
 * Only local Ollama models are checked (via `/api/show`); cloud providers and
 * any unknown case are assumed capable, never wrongly blocking a working model.
 */
export const getModelCapabilities = createServerFn({ method: "POST" })
	.validator(modelCapabilitiesInput)
	.handler(async ({ data }): Promise<{ supportsTools: boolean }> => {
		const userId = await getCurrentUserId();
		const endpoint = await prisma.modelEndpoint.findFirst({
			where: { id: data.endpointId, ownerId: userId },
		});
		if (endpoint?.provider !== "ollama") return { supportsTools: true };

		try {
			const { capabilities } = await ollamaClient({ host: endpoint.url, timeoutMs: 5000 }).show({
				model: data.model,
			});
			return { supportsTools: capabilities.includes("tools") };
		} catch {
			return { supportsTools: true };
		}
	});

// ── Query options (for TanStack Query) ───────────────────────

export const endpointsQueryOptions = () =>
	queryOptions({ queryKey: ["endpoints"], queryFn: () => listEndpoints() });

export const endpointModelsQueryOptions = (endpointId: string) =>
	queryOptions({
		queryKey: ["endpoint-models", endpointId],
		queryFn: () => listEndpointModels({ data: { endpointId } }),
		staleTime: 30_000,
	});

export const modelCapabilitiesQueryOptions = ({ endpointId, model }: ModelSelection) =>
	queryOptions({
		queryKey: ["model-capabilities", endpointId, model],
		queryFn: () => getModelCapabilities({ data: { endpointId, model } }),
		staleTime: 5 * 60_000,
	});
