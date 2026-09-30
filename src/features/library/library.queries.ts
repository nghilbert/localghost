import {
	experimental_streamedQuery,
	keepPreviousData,
	queryOptions,
	skipToken,
} from "@tanstack/react-query";
import { MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND } from "#/lib/format";
import type { LlamaModelDownloadEvent } from "#/lib/llamacpp/schemas";
import type { ModelSelection } from "#/lib/llm-schemas";
import { reduceDownloadEvent, streamModelEvents } from "./lib/download-stream";
import {
	fetchModelSetting,
	getHardware,
	getModelCatalog,
	getModelCatalogByIds,
	getModelSettings,
	getModelVariants,
	scanRuntimeStatus,
} from "./library.functions";
import type { CatalogQuery } from "./library.schemas";
import type { PullProgress, RuntimeStatus } from "./library.types";

/** Matches the server's Hugging Face cache time. */
const CATALOG_STALE_TIME = 6 * MS_PER_HOUR;

/** How often to rescan the runtime: often until one is found and while a download runs. */
export function libraryStatusPollInterval(status: RuntimeStatus | undefined): number {
	if (!status?.found) return 5 * MS_PER_SECOND;
	return Object.keys(status.downloads).length > 0 ? 2 * MS_PER_SECOND : 30 * MS_PER_SECOND;
}

/** Query options for the local runtime, hardware, catalog, and per-model settings. */
export const libraryQueries = {
	all: () => ["library"] as const,
	runtimeStatus: () =>
		queryOptions({
			queryKey: [...libraryQueries.all(), "runtime-status"],
			queryFn: () => scanRuntimeStatus(),
			refetchInterval: (query) => libraryStatusPollInterval(query.state.data),
		}),
	/**
	 * Byte progress per model id from llama.cpp's `/models/sse` stream, open while observed.
	 * Each connection and each non-progress event refetches `runtimeStatus`.
	 */
	downloadProgress: (endpointId: string | null) =>
		queryOptions({
			queryKey: [...libraryQueries.all(), "download-progress", endpointId],
			queryFn:
				endpointId === null
					? skipToken
					: experimental_streamedQuery<LlamaModelDownloadEvent, Record<string, PullProgress>>({
							streamFn: async function* (context) {
								const resync = () =>
									void context.client.invalidateQueries({
										queryKey: libraryQueries.runtimeStatus().queryKey,
									});
								for await (const event of streamModelEvents({
									endpointId,
									signal: context.signal,
									onOpen: resync,
								})) {
									if (event.event !== "download_progress") resync();
									yield event;
								}
							},
							initialValue: {},
							reducer: (byModel, event) => reduceDownloadEvent({ byModel, event }),
							// A reconnect keeps the current progress instead of resetting to a spinner.
							refetchMode: "append",
						}),
		}),
	hardware: () =>
		queryOptions({
			queryKey: [...libraryQueries.all(), "hardware"],
			queryFn: () => getHardware(),
			staleTime: MS_PER_MINUTE,
			// Free memory changes as llama.cpp loads and unloads models.
			refetchInterval: 15 * MS_PER_SECOND,
		}),
	catalog: (query: CatalogQuery) =>
		queryOptions({
			queryKey: [...libraryQueries.all(), "catalog", query],
			queryFn: () => getModelCatalog({ data: query }),
			staleTime: CATALOG_STALE_TIME,
			placeholderData: keepPreviousData,
		}),
	catalogByIds: (ids: string[]) =>
		queryOptions({
			queryKey: [...libraryQueries.all(), "catalog-by-ids", ids],
			queryFn: () => getModelCatalogByIds({ data: { ids } }),
			staleTime: CATALOG_STALE_TIME,
		}),
	variants: (query: { repoId: string; siblingRepoIds: string[] }) =>
		queryOptions({
			queryKey: [...libraryQueries.all(), "variants", query],
			queryFn: () => getModelVariants({ data: query }),
			staleTime: CATALOG_STALE_TIME,
		}),
	/** Per-model sampling overrides. */
	modelSettings: {
		all: () => [...libraryQueries.all(), "model-setting"] as const,
		list: () =>
			queryOptions({
				queryKey: [...libraryQueries.modelSettings.all(), "list"],
				queryFn: () => getModelSettings(),
			}),
		detail: ({ endpointId, model }: ModelSelection) =>
			queryOptions({
				queryKey: [...libraryQueries.modelSettings.all(), "detail", endpointId, model],
				queryFn: () => fetchModelSetting({ data: { endpointId, model } }),
			}),
	},
};
