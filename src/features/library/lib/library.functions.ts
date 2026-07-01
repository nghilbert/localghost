import { queryOptions } from "@tanstack/react-query";
import { trimPathRight } from "@tanstack/react-router";
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

export const getHardware = createServerFn({ method: "GET" }).handler(async () => {
	await getCurrentUserId();
	return getHardwareInfo();
});

export const scanOllamaStatus = createServerFn({ method: "GET" }).handler(
	async (): Promise<OllamaStatus> => {
		const userId = await getCurrentUserId();
		const found = await scanForOllama(userId);
		if (!found) return { found: false, ollamaUrl: null, installedModels: [] };

		await upsertOllamaEndpoint({ userId, url: found.url, existing: found.savedEndpoint });
		return { found: true, ollamaUrl: found.url, installedModels: found.installedModels };
	},
);

export const deleteModel = createServerFn({ method: "POST" })
	.validator(z.object({ model: z.string().min(1) }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const ollamaUrl = await getOllamaUrl(userId);
		await ollamaClient({ host: ollamaUrl }).delete({ model: data.model });
	});

export const testRemoteOllama = createServerFn({ method: "POST" })
	.validator(OllamaUrlSchema)
	.handler(async ({ data }) => {
		await getCurrentUserId();
		const probe = await probeOllama({ url: data.url });
		return { reachable: probe.reachable, modelCount: probe.installedModels.length };
	});

export const registerRemoteOllama = createServerFn({ method: "POST" })
	.validator(OllamaUrlSchema)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const probe = await probeOllama({ url: data.url });
		if (!probe.reachable) {
			throw new Error(`No Ollama instance is responding at ${data.url}`);
		}
		await upsertOllamaEndpoint({ userId, url: data.url });
	});

export const startModelPull = createServerFn({ method: "POST" })
	.validator(z.object({ model: z.string().min(1), ollamaUrl: z.string().optional() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const ollamaUrl = data.ollamaUrl ? trimPathRight(data.ollamaUrl) : await getOllamaUrl(userId);
		startPull({ userId, model: data.model, ollamaUrl });
	});

export const cancelModelPull = createServerFn({ method: "POST" })
	.validator(z.object({ model: z.string().min(1) }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		cancelPull({ userId, model: data.model });
	});

export const getActivePulls = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
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
