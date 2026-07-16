import type { z } from "zod/v4";
import type { Endpoint } from "#/generated/prisma/client";
import { decrypt, encrypt } from "#/shared/lib/crypto.server";
import { prisma } from "#/shared/lib/db.server";
import {
	asLLMProvider,
	type EndpointProbeResult,
	listModels,
	modelSupportsTools,
	probeEndpoint,
} from "#/shared/lib/llm.server";
import { ollamaClient } from "#/shared/lib/ollama/client.server";
import type { createEndpointSchema, updateEndpointSchema } from "./schemas";

/** Strips the encrypted key off an endpoint row, replacing it with a `hasApiKey` flag. */
export function toClientEndpoint(endpoint: Endpoint) {
	return { ...endpoint, apiKeyEncrypted: undefined, hasApiKey: !!endpoint.apiKeyEncrypted };
}

/**
 * The endpoint's decrypted API key, or undefined when none is stored.
 * @throws A user-readable error when the stored key cannot be decrypted
 * (typically after an `ENCRYPTION_KEY` rotation); the raw crypto failure is logged.
 */
export function endpointApiKey(endpoint: Pick<Endpoint, "apiKeyEncrypted">) {
	if (!endpoint.apiKeyEncrypted) return undefined;
	try {
		return decrypt(endpoint.apiKeyEncrypted);
	} catch (error) {
		console.error("Failed to decrypt a stored endpoint API key (was ENCRYPTION_KEY rotated?)", {
			error,
		});
		throw new Error(
			"This endpoint's stored API key can't be decrypted. Re-enter the key in Settings.",
		);
	}
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
 * Reachability of a saved endpoint: resolves it by id, decrypts its key, and
 * probes the provider's model list.
 * @returns `{ ok: true, modelCount }` when reachable, `{ ok: false, error }` otherwise.
 * @throws If no endpoint with that id is owned by the user.
 */
export async function probeSavedEndpoint({
	endpointId,
	ownerId,
}: {
	endpointId: string;
	ownerId: string;
}): Promise<EndpointProbeResult> {
	const endpoint = await prisma.endpoint.findFirst({ where: { id: endpointId, ownerId } });
	if (!endpoint) throw new Error("Not found");
	return probeEndpoint({
		url: endpoint.url,
		apiKey: endpointApiKey(endpoint),
		provider: asLLMProvider(endpoint.provider),
	});
}

/**
 * Whether a model can use tools and accept images. Tool support: Ollama via
 * `/api/show`, cloud providers via {@link modelSupportsTools}; unknown cases are
 * assumed capable, never wrongly blocking a working model. Image support: Ollama
 * reports it as the `vision` capability; cloud providers can't be probed, so we
 * stay permissive and let the model reject an image it can't read.
 */
export async function probeModelCapabilities({
	endpointId,
	ownerId,
	model,
}: {
	endpointId: string;
	ownerId: string;
	model: string;
}): Promise<{ supportsTools: boolean; supportsImages: boolean }> {
	const endpoint = await prisma.endpoint.findFirst({ where: { id: endpointId, ownerId } });
	if (!endpoint) return { supportsTools: true, supportsImages: false };
	if (endpoint.provider === "ollama") {
		try {
			const { capabilities } = await ollamaClient({ host: endpoint.url, timeoutMs: 5000 }).show({
				model,
			});
			return {
				supportsTools: capabilities.includes("tools"),
				supportsImages: capabilities.includes("vision"),
			};
		} catch (error) {
			console.warn("Ollama capability probe failed; assuming tool support", {
				url: endpoint.url,
				model,
				error,
			});
			return { supportsTools: true, supportsImages: false };
		}
	}
	try {
		const supportsTools = await modelSupportsTools({
			url: endpoint.url,
			apiKey: endpointApiKey(endpoint),
			provider: asLLMProvider(endpoint.provider),
			model,
		});
		return { supportsTools, supportsImages: true };
	} catch {
		// endpointApiKey throws on an undecryptable key; stay optimistic here and
		// let model listing surface that error.
		return { supportsTools: true, supportsImages: true };
	}
}
