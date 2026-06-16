import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { getCurrentUserId } from "#/features/auth/lib/session.server";
import { OllamaUrlSchema } from "#/features/cookbook/lib/ollama-url";
import {
	cancelPull,
	getActivePulls as readActivePulls,
	startPull,
} from "#/features/cookbook/lib/pull-registry.server";
import type { OllamaStatus } from "#/features/cookbook/lib/types";
import { getHardwareInfo } from "#/lib/hardware.server";
import {
	getOllamaUrl,
	probeOllama,
	scanForOllama,
	upsertOllamaEndpoint,
} from "#/lib/ollama.server";

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
		const res = await fetch(`${ollamaUrl}/api/delete`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: data.model }),
		});
		if (!res.ok) throw new Error(`Failed to delete model: ${res.statusText}`);
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

export const cookbookStatusQueryOptions = () =>
	queryOptions({
		queryKey: ["cookbook-status"],
		queryFn: () => scanOllamaStatus(),
	});

export const activePullsQueryOptions = () =>
	queryOptions({
		queryKey: ["cookbook", "active-pulls"],
		queryFn: () => getActivePulls(),
		// Poll while a pull is in flight; idle otherwise so there's no wasted traffic.
		refetchInterval: (query) => (query.state.data && query.state.data.length > 0 ? 600 : false),
	});

export const hardwareQueryOptions = () =>
	queryOptions({
		queryKey: ["cookbook-hardware"],
		queryFn: () => getHardware(),
		staleTime: 60_000,
	});
