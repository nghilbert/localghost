import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { downloadModel, unloadModel } from "#/shared/lib/llamacpp/client.server";
import { llamacppConnectionSchema, llamacppUrlSchema } from "#/shared/lib/llamacpp/url";
import { authedFn } from "#/shared/lib/middleware";
import { getCatalogModelsByIds, getCatalogPage, listGroupVariants } from "./catalog.server";
import {
	getRuntimeEndpointById,
	probeRuntime,
	scanForRuntime,
	upsertRuntimeEndpoint,
} from "./discovery.server";
import { getHardwareInfo } from "./hardware.server";
import { removeInstalledModel } from "./models.server";
import {
	type CatalogQuery,
	catalogModelsByIdsInput,
	catalogQuerySchema,
	modelVariantsInput,
} from "./schemas";
import type { RuntimeStatus } from "./types";

export const getHardware = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async () => getHardwareInfo());

export const getModelCatalog = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.validator(catalogQuerySchema)
	.handler(async ({ data }) => getCatalogPage(data));

export const getModelCatalogByIds = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.validator(catalogModelsByIdsInput)
	.handler(async ({ data }) => getCatalogModelsByIds(data.ids));

export const getModelVariants = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.validator(modelVariantsInput)
	.handler(async ({ data }) => listGroupVariants(data));

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
			return 30_000;
		},
	});

export const hardwareQueryOptions = () =>
	queryOptions({
		queryKey: ["library-hardware"],
		queryFn: () => getHardware(),
		staleTime: 60_000,
		// Keeps "GB free" current as llama.cpp loads/idles-out models between polls.
		refetchInterval: 15_000,
	});

export const catalogQueryOptions = (query: CatalogQuery) =>
	queryOptions({
		queryKey: ["library-catalog", query],
		queryFn: () => getModelCatalog({ data: query }),
		// Matches the server-side fetch TTL; the catalog changes slowly.
		staleTime: 6 * 60 * 60_000,
		// Keep showing the previous page's rows while the next page loads, instead of flashing empty.
		placeholderData: keepPreviousData,
	});

export const catalogByIdsQueryOptions = (ids: string[]) =>
	queryOptions({
		queryKey: ["library-catalog-by-ids", ids],
		queryFn: () => getModelCatalogByIds({ data: { ids } }),
		staleTime: 6 * 60 * 60_000,
	});

export const modelVariantsQueryOptions = (query: { repoId: string; siblingRepoIds: string[] }) =>
	queryOptions({
		queryKey: ["library-model-variants", query],
		queryFn: () => getModelVariants({ data: query }),
		staleTime: 6 * 60 * 60_000,
	});
