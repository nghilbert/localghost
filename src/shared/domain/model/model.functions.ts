import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { downloadModel, unloadModel } from "#/shared/lib/llamacpp/client.server";
import { llamacppConnectionSchema, llamacppUrlSchema } from "#/shared/lib/llamacpp/url";
import { authedFn } from "#/shared/lib/middleware";
import { getCatalog } from "./catalog.server";
import {
	getRuntimeEndpointById,
	probeRuntime,
	scanForRuntime,
	upsertRuntimeEndpoint,
} from "./discovery.server";
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
			return {
				found: false,
				runtimeUrl: null,
				installedModels: [],
				downloads: {},
				endpointId: null,
			};
		}

		const endpointId = await upsertRuntimeEndpoint({
			userId: context.userId,
			url: found.url,
			existing: found.savedEndpoint,
		});
		return {
			found: true,
			runtimeUrl: found.url,
			installedModels: found.installedModels,
			downloads: found.downloads,
			endpointId,
		};
	});

export const deleteModel = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(z.object({ endpointId: z.uuid(), model: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		await removeInstalledModel({
			userId: context.userId,
			endpointId: data.endpointId,
			model: data.model,
		});
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
	.validator(z.object({ endpointId: z.uuid(), model: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		const resolved = await getRuntimeEndpointById({
			userId: context.userId,
			endpointId: data.endpointId,
		});
		await downloadModel({ url: resolved.url, model: data.model, apiKey: resolved.apiKey });
	});

export const cancelModelDownload = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(z.object({ endpointId: z.uuid(), model: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		const resolved = await getRuntimeEndpointById({
			userId: context.userId,
			endpointId: data.endpointId,
		});
		await unloadModel({ url: resolved.url, model: data.model, apiKey: resolved.apiKey });
	});

export const libraryStatusQueryOptions = () =>
	queryOptions({
		queryKey: ["library-status"],
		queryFn: () => scanRuntimeStatus(),
		refetchInterval: (query) => {
			const status = query.state.data;
			if (!status?.found) return 5_000;
			return Object.keys(status.downloads).length > 0 ? 1_000 : 30_000;
		},
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
