import { queryOptions } from "@tanstack/react-query";
import { trimPathRight } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { ollamaOptionsSchema } from "#/entities/endpoint/schemas";
import { getHardwareInfo } from "#/features/pull-model/lib/hardware.server";
import { getCatalog } from "#/features/pull-model/lib/ollama/catalog.server";
import {
	getOllamaUrl,
	probeOllama,
	scanForOllama,
	upsertOllamaEndpoint,
} from "#/features/pull-model/lib/ollama/discovery.server";
import { removeInstalledModel } from "#/features/pull-model/lib/ollama/models.server";
import {
	cancelPull,
	listActivePulls as readActivePulls,
	resumeOrphanedPulls,
	startPull,
} from "#/features/pull-model/lib/ollama/pull-registry.server";
import type { OllamaStatus } from "#/features/pull-model/lib/types";
import { ollamaConnectionSchema, ollamaUrlSchema } from "#/shared/lib/ollama/url";
import { getCurrentUserId } from "#/shared/lib/session.server";

export const getHardware = createServerFn({ method: "GET" }).handler(async () => {
	await getCurrentUserId();
	return getHardwareInfo();
});

export const getModelCatalog = createServerFn({ method: "GET" }).handler(async () => {
	await getCurrentUserId();
	return getCatalog();
});

export const scanOllamaStatus = createServerFn({ method: "GET" }).handler(
	async (): Promise<OllamaStatus> => {
		const userId = await getCurrentUserId();
		const found = await scanForOllama(userId);
		if (!found) {
			return { found: false, ollamaUrl: null, installedModels: [], numCtx: null, endpointId: null };
		}

		const endpointId = await upsertOllamaEndpoint({
			userId,
			url: found.url,
			existing: found.savedEndpoint,
		});
		const options = ollamaOptionsSchema.safeParse(found.savedEndpoint?.options);
		return {
			found: true,
			ollamaUrl: found.url,
			installedModels: found.installedModels,
			numCtx: options.success ? (options.data.num_ctx ?? null) : null,
			endpointId,
		};
	},
);

export const deleteModel = createServerFn({ method: "POST" })
	.validator(z.object({ model: z.string().min(1) }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		await removeInstalledModel({ userId, model: data.model });
	});

export const testRemoteOllama = createServerFn({ method: "POST" })
	.validator(ollamaUrlSchema)
	.handler(async ({ data }) => {
		await getCurrentUserId();
		const probe = await probeOllama({ url: data.url });
		return { reachable: probe.reachable, modelCount: probe.installedModels.length };
	});

export const registerRemoteOllama = createServerFn({ method: "POST" })
	.validator(ollamaConnectionSchema)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const probe = await probeOllama({ url: data.url });
		if (!probe.reachable) {
			throw new Error(`No Ollama instance is responding at ${data.url}`);
		}
		await upsertOllamaEndpoint({ userId, url: data.url, numCtx: data.numCtx });
	});

export const startModelPull = createServerFn({ method: "POST" })
	.validator(z.object({ model: z.string().min(1), ollamaUrl: z.string().optional() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const ollamaUrl = data.ollamaUrl ? trimPathRight(data.ollamaUrl) : await getOllamaUrl(userId);
		await startPull({ userId, model: data.model, ollamaUrl });
	});

export const cancelModelPull = createServerFn({ method: "POST" })
	.validator(z.object({ model: z.string().min(1) }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		cancelPull({ userId, model: data.model });
	});

export const listActivePulls = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	// Re-attach pulls a server restart orphaned before reporting, so the Library
	// regains its progress view instead of staying blind until the daemon finishes.
	await resumeOrphanedPulls(userId);
	return readActivePulls(userId);
});

export const libraryStatusQueryOptions = () =>
	queryOptions({
		queryKey: ["library-status"],
		queryFn: () => scanOllamaStatus(),
		// Re-probe slowly once reachable, quickly while it's down so recovery shows fast.
		refetchInterval: (query) => (query.state.data?.found ? 30_000 : 5_000),
	});

export const activePullsQueryOptions = () =>
	queryOptions({
		queryKey: ["library", "active-pulls"],
		queryFn: () => listActivePulls(),
		// Poll while a pull is in flight; idle otherwise so there's no wasted traffic.
		refetchInterval: (query) => (query.state.data && query.state.data.length > 0 ? 600 : false),
	});

export const hardwareQueryOptions = () =>
	queryOptions({
		queryKey: ["library-hardware"],
		queryFn: () => getHardware(),
		staleTime: 60_000,
	});

export const catalogQueryOptions = () =>
	queryOptions({
		queryKey: ["library-catalog"],
		queryFn: () => getModelCatalog(),
		// Matches the server-side scrape TTL; the catalog changes slowly.
		staleTime: 6 * 60 * 60_000,
	});
