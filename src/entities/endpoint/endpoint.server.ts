import type { z } from "zod/v4";
import type { Endpoint } from "#/generated/prisma/client";
import { decrypt, encrypt } from "#/shared/lib/crypto.server";
import { prisma } from "#/shared/lib/db.server";
import { asLLMProvider, listModels } from "#/shared/lib/llm.server";
import { ollamaClient } from "#/shared/lib/ollama/client.server";
import type { createEndpointSchema, updateEndpointSchema } from "./schemas";

/** Strips the encrypted key off an endpoint row, replacing it with a `hasApiKey` flag. */
export function toClientEndpoint(endpoint: Endpoint) {
	return { ...endpoint, apiKeyEncrypted: undefined, hasApiKey: !!endpoint.apiKeyEncrypted };
}

/** The endpoint's decrypted API key, or undefined when none is stored. */
export function endpointApiKey(endpoint: Pick<Endpoint, "apiKeyEncrypted">) {
	return endpoint.apiKeyEncrypted ? decrypt(endpoint.apiKeyEncrypted) : undefined;
}

/** The user's endpoints, keys stripped. */
export async function findEndpoints({ ownerId }: { ownerId: string }) {
	const endpoints = await prisma.endpoint.findMany({
		where: { ownerId },
		orderBy: { id: "asc" },
	});
	return endpoints.map(toClientEndpoint);
}

export async function insertEndpoint({
	ownerId,
	data,
}: {
	ownerId: string;
	data: z.infer<typeof createEndpointSchema>;
}) {
	const endpoint = await prisma.endpoint.create({
		data: {
			name: data.name,
			url: data.url,
			apiKeyEncrypted: data.apiKey ? encrypt(data.apiKey) : null,
			provider: data.provider,
			ownerId,
			...(data.options && { options: data.options }),
		},
	});
	return toClientEndpoint(endpoint);
}

/**
 * Patch an endpoint's fields; re-encrypts the key when `apiKey` is supplied.
 * @throws If no endpoint with that id is owned by the user.
 */
export async function patchEndpoint({
	id,
	ownerId,
	patch,
}: {
	id: string;
	ownerId: string;
	patch: z.infer<typeof updateEndpointSchema>;
}) {
	const existing = await prisma.endpoint.findFirst({ where: { id, ownerId } });
	if (!existing) throw new Error("Not found");
	const endpoint = await prisma.endpoint.update({
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
	return toClientEndpoint(endpoint);
}

/** Deletes an endpoint, clearing the model on its conversations first. */
export async function removeEndpoint({ id, ownerId }: { id: string; ownerId: string }) {
	// Clear the model on conversations using this endpoint so the (endpointId, model)
	// pair goes null together; the FK's SetNull only nulls endpointId. Keeps history,
	// reopening the chat to a fresh model pick instead of an orphaned model string.
	await prisma.conversation.updateMany({
		where: { endpointId: id, ownerId },
		data: { model: null },
	});
	await prisma.endpoint.deleteMany({ where: { id, ownerId } });
}

/**
 * The models the endpoint's provider reports.
 * @throws If no endpoint with that id is owned by the user.
 */
export async function fetchEndpointModels({
	endpointId,
	ownerId,
}: {
	endpointId: string;
	ownerId: string;
}) {
	const endpoint = await prisma.endpoint.findFirst({ where: { id: endpointId, ownerId } });
	if (!endpoint) throw new Error("Not found");
	return listModels({
		url: endpoint.url,
		apiKey: endpointApiKey(endpoint),
		provider: asLLMProvider(endpoint.provider),
	});
}

/**
 * Whether a model can use tools. Only local Ollama models are checked (via
 * `/api/show`); cloud providers and any unknown case are assumed capable,
 * never wrongly blocking a working model.
 */
export async function probeModelCapabilities({
	endpointId,
	ownerId,
	model,
}: {
	endpointId: string;
	ownerId: string;
	model: string;
}): Promise<{ supportsTools: boolean }> {
	const endpoint = await prisma.endpoint.findFirst({ where: { id: endpointId, ownerId } });
	if (endpoint?.provider !== "ollama") return { supportsTools: true };
	try {
		const { capabilities } = await ollamaClient({ host: endpoint.url, timeoutMs: 5000 }).show({
			model,
		});
		return { supportsTools: capabilities.includes("tools") };
	} catch {
		return { supportsTools: true };
	}
}
