import { trimPathRight } from "@tanstack/react-router";
import type { z } from "zod";
import type {
	createEndpointSchema,
	updateEndpointSchema,
} from "#/features/endpoint/endpoint.schemas";
import type { Endpoint } from "#/generated/prisma/client";
import { encrypt, endpointApiKey } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { listModels as listLlamacppModels } from "#/lib/llamacpp/client.server";
import {
	type EndpointProbeResult,
	listModels,
	modelSupportsTools,
	probeEndpoint,
} from "#/lib/llm.server";
import { asLLMProvider } from "#/lib/llm-provider";

/** An endpoint row safe to send to the client: a `hasApiKey` flag replaces the encrypted key. */
export function toClientEndpoint(endpoint: Endpoint) {
	return { ...endpoint, apiKeyEncrypted: undefined, hasApiKey: !!endpoint.apiKeyEncrypted };
}

/** The user's endpoints, keys stripped. */
export async function findEndpoints({ ownerId }: { ownerId: string }) {
	const endpoints = await prisma.endpoint.findMany({
		where: { ownerId },
		orderBy: { id: "asc" },
	});
	return endpoints.map(toClientEndpoint);
}

/** Saves a new endpoint, encrypting its API key. */
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
 * Updates an endpoint's given fields, encrypting a new `apiKey`.
 * @throws If the user does not own the endpoint.
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

/** Deletes an endpoint. Its conversations stay, with no model selected. */
export async function removeEndpoint({ id, ownerId }: { id: string; ownerId: string }) {
	// The foreign key's SetNull clears only `endpointId`, so clear `model` with it.
	await prisma.conversation.updateMany({
		where: { endpointId: id, ownerId },
		data: { model: null },
	});
	await prisma.endpoint.deleteMany({ where: { id, ownerId } });
}

/**
 * The models a saved endpoint reports.
 * @throws If the user does not own the endpoint.
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
 * Tests a saved endpoint's connection and key.
 * @throws If the user does not own the endpoint.
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
 * Whether a model accepts tools, images, and documents. llama.cpp reports image support;
 * other providers are assumed capable.
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
	const endpoint = await prisma.endpoint.findFirst({ where: { id: endpointId, ownerId } });
	if (!endpoint) return { supportsTools: true, supportsImages: false, supportsDocuments: false };
	// Only these providers' adapters support documents.
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
		// An undecryptable key is reported by model listing instead.
		return { supportsTools: true, supportsImages: true, supportsDocuments };
	}
}

/** A saved llama.cpp endpoint's id and URL. */
export type SavedLlamacppEndpoint = { id: string; url: string };

/** The user's llama.cpp endpoints, oldest first. */
export function findLlamacppEndpoints({ ownerId }: { ownerId: string }): Promise<Endpoint[]> {
	return prisma.endpoint.findMany({
		where: { ownerId, provider: "llamacpp" },
		orderBy: { id: "asc" },
	});
}

/** A llama.cpp endpoint the user owns, or null. */
export function findLlamacppEndpoint({
	id,
	ownerId,
}: {
	id: string;
	ownerId: string;
}): Promise<Endpoint | null> {
	return prisma.endpoint.findFirst({ where: { id, ownerId, provider: "llamacpp" } });
}

/** Whether the user owns the endpoint. */
export async function endpointOwnedBy({
	id,
	ownerId,
}: {
	id: string;
	ownerId: string;
}): Promise<boolean> {
	return (await prisma.endpoint.count({ where: { id, ownerId } })) > 0;
}

/**
 * Saves where llama.cpp was found, creating the endpoint on first detection.
 * Pass `existing` when known to skip the lookup.
 */
export async function upsertLlamacppEndpoint({
	ownerId,
	url,
	existing,
}: {
	ownerId: string;
	url: string;
	existing?: SavedLlamacppEndpoint | null;
}): Promise<string> {
	const normalizedUrl = trimPathRight(url);
	const resolved =
		existing !== undefined
			? existing
			: await prisma.endpoint.findFirst({
					where: { ownerId, provider: "llamacpp" },
					orderBy: { id: "asc" },
					select: { id: true, url: true },
				});

	if (!resolved) {
		// Upsert on the (ownerId, discovered) unique, so two concurrent first scans create one row.
		const endpoint = await prisma.endpoint.upsert({
			where: { ownerId_discovered: { ownerId, discovered: true } },
			create: {
				name: "llama.cpp (local)",
				url: normalizedUrl,
				provider: "llamacpp",
				ownerId,
				discovered: true,
			},
			update: { url: normalizedUrl },
			select: { id: true },
		});
		return endpoint.id;
	}

	if (resolved.url === normalizedUrl) return resolved.id;
	await prisma.endpoint.update({
		where: { id: resolved.id },
		data: { url: normalizedUrl },
	});
	return resolved.id;
}
