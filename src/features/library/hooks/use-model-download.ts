import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "#/components/ui/toast";
import { cancelModelDownload, startModelDownload } from "#/features/library/library.functions";
import { libraryQueries } from "#/features/library/library.queries";
import type { PullProgress } from "#/features/library/library.types";

/** Clears a model's byte progress, so a restarted download shows a spinner, not the old percentage. */
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
		libraryQueries.downloadProgress(endpointId).queryKey,
		(progress) => {
			if (!progress || !(model in progress)) return progress;
			const { [model]: _dropped, ...rest } = progress;
			return rest;
		},
	);
}

/**
 * Starts and stops model downloads on the local llama.cpp runtime. `pulling` combines
 * which models are downloading with their byte progress; read progress from here, since
 * `runtimeStatus.downloads` has no byte counts.
 */
export function useModelDownload() {
	const queryClient = useQueryClient();
	const { data: runtimeStatus } = useQuery(libraryQueries.runtimeStatus());
	const endpointId = runtimeStatus?.endpointId ?? null;
	const { data: byteProgress = {} } = useQuery(libraryQueries.downloadProgress(endpointId));
	const startedModels = useRef<Set<string>>(new Set());
	const observedDownloads = useRef<Set<string>>(new Set());

	const polledDownloads = runtimeStatus?.found ? runtimeStatus.downloads : {};
	const pulling: Record<string, PullProgress> = {};
	for (const [id, progress] of Object.entries(polledDownloads)) {
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
			queryClient.invalidateQueries({ queryKey: libraryQueries.runtimeStatus().queryKey }),
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
			queryClient.invalidateQueries({ queryKey: libraryQueries.runtimeStatus().queryKey });
			toast.add({ title: `Stopped downloading ${model}`, type: "info" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to stop download", type: "error", description: error.message }),
	});

	return { pulling, pull: pullMutation.mutate, stop: stopMutation.mutate };
}
