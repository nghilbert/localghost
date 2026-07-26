import { queryOptions } from "@tanstack/react-query";
import { trimPathRight } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { llamacppConnectionSchema, llamacppUrlSchema } from "#/shared/lib/llamacpp/url";
import { authedFn } from "#/shared/lib/middleware";
import { getCatalog } from "./catalog.server";
import {
	getRuntimeEndpoint,
	probeRuntime,
	scanForRuntime,
	upsertRuntimeEndpoint,
} from "./discovery.server";
import {
	cancelDownload,
	ensureWatching,
	listActiveDownloads,
	startDownload,
} from "./download-registry.server";
import { getHardwareInfo } from "./hardware.server";
import { removeInstalledModel } from "./models.server";
import type { RuntimeStatus } from "./types";

export const getHardware = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async () => getHardwareInfo());

export const getModelCatalog = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async () => getCatalog());

export const scanRuntimeStatus = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async ({ context }): Promise<RuntimeStatus> => {
		const found = await scanForRuntime(context.userId);
		if (!found) {
			return { found: false, runtimeUrl: null, installedModels: [], endpointId: null };
		}

		const endpointId = await upsertRuntimeEndpoint({
			userId: context.userId,
			url: found.url,
			existing: found.savedEndpoint,
		});
		ensureWatching(found.url, found.apiKey);
		return {
			found: true,
			runtimeUrl: found.url,
			installedModels: found.installedModels,
			endpointId,
		};
	});

export const deleteModel = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(z.object({ model: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		await removeInstalledModel({ userId: context.userId, model: data.model });
	});

export const testRemoteRuntime = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(llamacppUrlSchema)
	.handler(async ({ data }) => {
		const probe = await probeRuntime({ url: data.url });
		return { reachable: probe.reachable, modelCount: probe.installedModels.length };
	});

export const registerRemoteRuntime = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(llamacppConnectionSchema)
	.handler(async ({ data, context }) => {
		const probe = await probeRuntime({ url: data.url });
		if (!probe.reachable) {
			throw new Error(`No llama.cpp instance is responding at ${data.url}`);
		}
		await upsertRuntimeEndpoint({ userId: context.userId, url: data.url });
	});

export const startModelDownload = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(z.object({ model: z.string().min(1), runtimeUrl: z.string().optional() }))
	.handler(async ({ data, context }) => {
		const resolved = await getRuntimeEndpoint(context.userId);
		const url = data.runtimeUrl ? trimPathRight(data.runtimeUrl) : resolved.url;
		await startDownload({ url, model: data.model, apiKey: resolved.apiKey });
	});

export const cancelModelDownload = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(z.object({ model: z.string().min(1), runtimeUrl: z.string().optional() }))
	.handler(async ({ data, context }) => {
		const resolved = await getRuntimeEndpoint(context.userId);
		const url = data.runtimeUrl ? trimPathRight(data.runtimeUrl) : resolved.url;
		await cancelDownload({ url, model: data.model, apiKey: resolved.apiKey });
	});

export const listActiveDownloadsFn = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async ({ context }) => {
		const { url } = await getRuntimeEndpoint(context.userId);
		return listActiveDownloads(url);
	});

export const libraryStatusQueryOptions = () =>
	queryOptions({
		queryKey: ["library-status"],
		queryFn: () => scanRuntimeStatus(),
		// Re-probe slowly once reachable, quickly while it's down so recovery shows fast.
		refetchInterval: (query) => (query.state.data?.found ? 30_000 : 5_000),
	});

export const activeDownloadsQueryOptions = () =>
	queryOptions({
		queryKey: ["library", "active-downloads"],
		queryFn: () => listActiveDownloadsFn(),
		// Poll while a download is in flight; idle otherwise so there's no wasted traffic.
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
		// Matches the server-side fetch TTL; the catalog changes slowly.
		staleTime: 6 * 60 * 60_000,
	});
