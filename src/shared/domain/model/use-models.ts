import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "#/shared/components/ui/toast";
import {
	cancelModelDownload,
	deleteModel,
	libraryStatusQueryOptions,
	modelDownloadProgressQueryOptions,
	registerRemoteRuntime,
	startModelDownload,
	testRemoteRuntime,
} from "./model.functions";
import type { PullProgress } from "./types";

/**
 * Drops a model's streamed byte progress so a restart or a stop falls back to the
 * spinner instead of showing the previous run's percentage.
 */
function evictDownloadProgress({
	queryClient,
	endpointId,
	model,
}: {
	queryClient: QueryClient;
	endpointId: string | null;
	model: string;
}) {
	queryClient.setQueryData<Record<string, PullProgress>>(
		modelDownloadProgressQueryOptions(endpointId).queryKey,
		(progress = {}) => {
			if (!(model in progress)) return progress;
			const { [model]: _dropped, ...rest } = progress;
			return rest;
		},
	);
}

/** Deletes an installed model. */
export function useDeleteModel() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: { endpointId: string; model: string }) => deleteModel({ data: input }),
		onSuccess: async (_data, { model }) => {
			await queryClient.invalidateQueries({ queryKey: libraryStatusQueryOptions().queryKey });
			toast.add({ title: `${model} deleted`, type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to delete model", type: "error", description: error.message }),
	});
}

/** Connects a remote llama.cpp runtime. */
export function useConnectRuntime() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: { url: string }) => registerRemoteRuntime({ data: input }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: libraryStatusQueryOptions().queryKey }),
				queryClient.invalidateQueries({ queryKey: ["endpoints"] }),
			]);
			toast.add({ title: "Connected to llama.cpp", type: "success" });
		},
		onError: (error) =>
			toast.add({
				title: "Failed to connect to llama.cpp",
				type: "error",
				description: error.message,
			}),
	});
}

/** Tests a llama.cpp runtime URL without saving it. */
export function useTestRuntime() {
	return useMutation({
		mutationFn: (url: string) => testRemoteRuntime({ data: { url } }),
	});
}

/**
 * Starts and stops router-owned downloads. `pulling` is the merged view: the poll says
 * which models are downloading, the stream supplies the bytes `GET /models` omits. Read
 * progress from here, never from `runtimeStatus.downloads`, which can only ever spin.
 */
export function useModelDownload() {
	const queryClient = useQueryClient();
	const { data: runtimeStatus } = useQuery(libraryStatusQueryOptions());
	const endpointId = runtimeStatus?.endpointId ?? null;
	const { data: byteProgress = {} } = useQuery(modelDownloadProgressQueryOptions(endpointId));
	const startedModels = useRef<Set<string>>(new Set());
	const observedDownloads = useRef<Set<string>>(new Set());

	const rawDownloads = runtimeStatus?.found ? runtimeStatus.downloads : {};
	const pulling: Record<string, PullProgress> = {};
	for (const [id, progress] of Object.entries(rawDownloads)) {
		const bytes = byteProgress[id];
		pulling[id] = bytes
			? { ...progress, completed: bytes.completed, total: bytes.total }
			: progress;
	}

	useEffect(() => {
		if (!runtimeStatus?.found) return;
		const downloading = new Set(Object.keys(runtimeStatus.downloads));
		const installed = new Set(runtimeStatus.installedModels.map((model) => model.id));
		for (const model of startedModels.current) {
			if (downloading.has(model)) {
				observedDownloads.current.add(model);
				continue;
			}
			if (!installed.has(model) && !observedDownloads.current.has(model)) continue;
			startedModels.current.delete(model);
			observedDownloads.current.delete(model);
			if (installed.has(model)) toast.add({ title: `${model} is ready`, type: "success" });
			else toast.add({ title: `Download failed for ${model}`, type: "error" });
		}
	}, [runtimeStatus]);

	const pullMutation = useMutation({
		mutationFn: async (model: string) => {
			if (!endpointId) throw new Error("llama.cpp endpoint not found");
			await startModelDownload({ data: { endpointId, model } });
		},
		onMutate: (model) => {
			startedModels.current.add(model);
			evictDownloadProgress({ queryClient, endpointId, model });
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: libraryStatusQueryOptions().queryKey }),
		onError: (error, model) => {
			startedModels.current.delete(model);
			observedDownloads.current.delete(model);
			toast.add({ title: "Failed to start download", type: "error", description: error.message });
		},
	});

	const stopMutation = useMutation({
		mutationFn: async (model: string) => {
			if (!endpointId) throw new Error("llama.cpp endpoint not found");
			await cancelModelDownload({ data: { endpointId, model } });
		},
		onSuccess: (_data, model) => {
			startedModels.current.delete(model);
			observedDownloads.current.delete(model);
			evictDownloadProgress({ queryClient, endpointId, model });
			queryClient.invalidateQueries({ queryKey: libraryStatusQueryOptions().queryKey });
			toast.add({ title: `Stopped downloading ${model}`, type: "info" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to stop download", type: "error", description: error.message }),
	});

	return { pulling, pull: pullMutation.mutate, stop: stopMutation.mutate };
}
