import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { getCurrentUserId } from "#/features/auth/lib/session.server";
import { getHardwareInfo } from "#/features/library/lib/hardware.server";
import { ollamaClient } from "#/features/library/lib/ollama/client.server";
import {
	getOllamaUrl,
	probeOllama,
	scanForOllama,
	upsertOllamaEndpoint,
} from "#/features/library/lib/ollama/discovery.server";
import {
	cancelPull,
	getActivePulls as readActivePulls,
	startPull,
} from "#/features/library/lib/ollama/pull-registry.server";
import { OllamaUrlSchema } from "#/features/library/lib/ollama/url";
import type { OllamaStatus } from "#/features/library/lib/types";
import { prisma } from "#/lib/db.server";

export const getHardware = createServerFn({ method: "GET" }).handler(async () => {
	await getCurrentUserId();
	return getHardwareInfo();
});

export const scanOllamaStatus = createServerFn({ method: "GET" }).handler(
	async (): Promise<OllamaStatus> => {
		const userId = await getCurrentUserId();
		const found = await scanForOllama(userId);
		if (!found) return { found: false, ollamaUrl: null, installedModels: [] };

		await upsertOllamaEndpoint(userId, found.url, found.savedEndpoint);
		return { found: true, ollamaUrl: found.url, installedModels: found.installedModels };
	},
);

export const deleteModel = createServerFn({ method: "POST" })
	.validator(z.object({ model: z.string().min(1) }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const ollamaUrl = await getOllamaUrl(userId);
		await ollamaClient(ollamaUrl).delete({ model: data.model });
	});

/**
 * Loads a local Ollama model into memory ahead of the first message so the user
 * doesn't pay the multi-second cold start mid-conversation. Only acts on Ollama
 * endpoints (cloud models are always warm); any failure resolves as a no-op.
 */
export const warmModel = createServerFn({ method: "POST" })
	.validator(z.object({ endpointId: z.uuid(), model: z.string().min(1) }))
	.handler(async ({ data }): Promise<{ warmed: boolean }> => {
		const userId = await getCurrentUserId();
		const endpoint = await prisma.modelEndpoint.findFirst({
			where: { id: data.endpointId, ownerId: userId },
		});
		if (endpoint?.provider !== "ollama") return { warmed: false };

		try {
			// Empty prompt + keep_alive loads the model into memory without generating.
			await ollamaClient(endpoint.url, 60_000).generate({
				model: data.model,
				prompt: "",
				keep_alive: "10m",
			});
			return { warmed: true };
		} catch {
			return { warmed: false };
		}
	});

export const testRemoteOllama = createServerFn({ method: "POST" })
	.validator(OllamaUrlSchema)
	.handler(async ({ data }) => {
		await getCurrentUserId();
		const probe = await probeOllama(data.url);
		return { reachable: probe.reachable, modelCount: probe.installedModels.length };
	});

export const registerRemoteOllama = createServerFn({ method: "POST" })
	.validator(OllamaUrlSchema)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const probe = await probeOllama(data.url);
		if (!probe.reachable) {
			throw new Error(`No Ollama instance is responding at ${data.url}`);
		}
		await upsertOllamaEndpoint(userId, data.url);
	});

export const startModelPull = createServerFn({ method: "POST" })
	.validator(z.object({ model: z.string().min(1), ollamaUrl: z.string().optional() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const ollamaUrl = data.ollamaUrl?.replace(/\/+$/, "") ?? (await getOllamaUrl(userId));
		startPull(userId, data.model, ollamaUrl);
	});

export const cancelModelPull = createServerFn({ method: "POST" })
	.validator(z.object({ model: z.string().min(1) }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		cancelPull(userId, data.model);
	});

export const getActivePulls = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return readActivePulls(userId);
});

export const libraryStatusQueryOptions = () =>
	queryOptions({
		queryKey: ["library-status"],
		queryFn: () => scanOllamaStatus(),
	});

export const activePullsQueryOptions = () =>
	queryOptions({
		queryKey: ["library", "active-pulls"],
		queryFn: () => getActivePulls(),
		// Poll while a pull is in flight; idle otherwise so there's no wasted traffic.
		refetchInterval: (query) => (query.state.data && query.state.data.length > 0 ? 600 : false),
	});

export const hardwareQueryOptions = () =>
	queryOptions({
		queryKey: ["library-hardware"],
		queryFn: () => getHardware(),
		staleTime: 60_000,
	});

/**
 * Fires a one-shot model load, keyed by endpoint + model so it runs once per
 * selection per session. `isFetching` doubles as the "warming up" signal.
 */
export const modelWarmupQueryOptions = (endpointId: string, model: string) =>
	queryOptions({
		queryKey: ["model-warmup", endpointId, model],
		queryFn: () => warmModel({ data: { endpointId, model } }),
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: Number.POSITIVE_INFINITY,
		retry: false,
	});
