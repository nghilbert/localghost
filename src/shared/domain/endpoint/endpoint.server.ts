import type { z } from "zod/v4";
import { db } from "#/prisma/db";
import { decrypt, encrypt } from "#/shared/lib/crypto.server";
import { listModels as listLlamacppModels } from "#/shared/lib/llamacpp/client.server";
import {
	type EndpointProbeResult,
	listModels,
	modelSupportsTools,
	probeEndpoint,
} from "#/shared/lib/llm/client.server";
import { asLLMProvider } from "#/shared/lib/llm/provider";
import { nowTimestamp } from "#/shared/lib/temporal";
import type { createEndpointSchema, updateEndpointSchema } from "./schemas";

export type EndpointRow = NonNullable<Awaited<ReturnType<typeof db.orm.public.Endpoint.first>>>;

/** Strips the encrypted key off an endpoint row, replacing it with a `hasApiKey` flag. */
export function toClientEndpoint(endpoint: EndpointRow) {
	return { ...endpoint, apiKeyEncrypted: undefined, hasApiKey: !!endpoint.apiKeyEncrypted };
}

/**
 * The endpoint's decrypted API key, or undefined when none is stored.
 * @throws A user-readable error when the stored key cannot be decrypted
 * (typically after an `ENCRYPTION_KEY` rotation); the raw crypto failure is logged.
 */
export function endpointApiKey(endpoint: Pick<EndpointRow, "apiKeyEncrypted">) {
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
	const endpoints = await db.orm.public.Endpoint.where({ ownerId })
		.orderBy((e) => e.id.asc())
		.all();
	return endpoints.map(toClientEndpoint);
}

export async function insertEndpoint({
	ownerId,
	data,
}: {
	ownerId: string;
	data: z.infer<typeof createEndpointSchema>;
}) {
	const endpoint = await db.orm.public.Endpoint.create({
		name: data.name,
		url: data.url,
		apiKeyEncrypted: data.apiKey ? encrypt(data.apiKey) : null,
		provider: data.provider,
		ownerId,
		...(data.options && { options: data.options }),
		updatedAt: nowTimestamp(),
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
	const existing = await db.orm.public.Endpoint.where({ id, ownerId }).first();
	if (!existing) throw new Error("Not found");
	const endpoint = await db.orm.public.Endpoint.where({ id }).update({
		...(patch.name !== undefined && { name: patch.name }),
		...(patch.url !== undefined && { url: patch.url }),
		...(patch.provider !== undefined && { provider: patch.provider }),
		...(patch.apiKey !== undefined && {
			apiKeyEncrypted: patch.apiKey ? encrypt(patch.apiKey) : null,
		}),
		...(patch.options !== undefined && { options: patch.options }),
		updatedAt: nowTimestamp(),
	});
	if (!endpoint) throw new Error("Not found");
	return toClientEndpoint(endpoint);
}

/** Deletes an endpoint, clearing the model on its conversations first. */
export async function removeEndpoint({ id, ownerId }: { id: string; ownerId: string }) {
	// Clear the model on conversations using this endpoint so the (endpointId, model)
	// pair goes null together; the FK's SetNull only nulls endpointId. Keeps history,
	// reopening the chat to a fresh model pick instead of an orphaned model string.
	await db.orm.public.Conversation.where({ endpointId: id, ownerId }).update({
		model: null,
		updatedAt: nowTimestamp(),
	});
	await db.orm.public.Endpoint.where({ id, ownerId }).delete();
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
	const endpoint = await db.orm.public.Endpoint.where({ id: endpointId, ownerId }).first();
	if (!endpoint) throw new Error("Not found");
	return listModels({
		url: endpoint.url,
		apiKey: endpointApiKey(endpoint),
		provider: asLLMProvider(endpoint.provider),
	});
}

/** Probes a saved endpoint's model list after decrypting its API key.
 * @throws If no endpoint with that id is owned by the user.
 */
export async function probeSavedEndpoint({
	endpointId,
	ownerId,
}: {
	endpointId: string;
	ownerId: string;
}): Promise<EndpointProbeResult> {
	const endpoint = await db.orm.public.Endpoint.where({ id: endpointId, ownerId }).first();
	if (!endpoint) throw new Error("Not found");
	return probeEndpoint({
		url: endpoint.url,
		apiKey: endpointApiKey(endpoint),
		provider: asLLMProvider(endpoint.provider),
	});
}

/** Reports model tool, image, and document capabilities.
 * llama.cpp reports image support from `/models`; cloud capabilities are permissive.
 */
export async function probeModelCapabilities({
	endpointId,
	ownerId,
	model,
}: {
	endpointId: string;
	ownerId: string;
	model: string;
}): Promise<{ supportsTools: boolean; supportsImages: boolean; supportsDocuments: boolean }> {
	const endpoint = await db.orm.public.Endpoint.where({ id: endpointId, ownerId }).first();
	if (!endpoint) return { supportsTools: true, supportsImages: false, supportsDocuments: false };
	// Only the cloud providers whose adapters advertise document support get it;
	// llama.cpp and unverified OpenAI-compatible endpoints stay images-only.
	const supportsDocuments = endpoint.provider === "anthropic" || endpoint.provider === "gemini";
	if (endpoint.provider === "llamacpp") {
		try {
			const models = await listLlamacppModels({ url: endpoint.url, timeoutMs: 5000 });
			const supportsImages =
				models.find((m) => m.id === model)?.architecture?.input_modalities?.includes("image") ??
				false;
			return { supportsTools: true, supportsImages, supportsDocuments: false };
		} catch (error) {
			console.warn("llama.cpp capability probe failed; assuming tool support", {
				url: endpoint.url,
				model,
				error,
			});
			return { supportsTools: true, supportsImages: false, supportsDocuments: false };
		}
	}
	try {
		const supportsTools = await modelSupportsTools({
			url: endpoint.url,
			apiKey: endpointApiKey(endpoint),
			provider: asLLMProvider(endpoint.provider),
			model,
		});
		return { supportsTools, supportsImages: true, supportsDocuments };
	} catch {
		// endpointApiKey throws on an undecryptable key; stay optimistic here and
		// let model listing surface that error.
		return { supportsTools: true, supportsImages: true, supportsDocuments };
	}
}
