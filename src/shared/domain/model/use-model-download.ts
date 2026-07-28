import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
	cancelModelDownload,
	libraryStatusQueryOptions,
	startModelDownload,
} from "./model.functions";

/** Starts and stops router-owned downloads while the runtime query reports progress. */
export function useModelDownload(endpointId: string | null) {
	const queryClient = useQueryClient();
	const { data: runtimeStatus } = useQuery(libraryStatusQueryOptions());
	const startedModels = useRef<Set<string>>(new Set());
	const observedDownloads = useRef<Set<string>>(new Set());
	const pulling = runtimeStatus?.found ? runtimeStatus.downloads : {};

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
			if (installed.has(model)) toast.success(`${model} is ready`);
			else toast.error(`Download failed for ${model}`);
		}
	}, [runtimeStatus]);

	const pullMutation = useMutation({
		mutationFn: async (model: string) => {
			if (!endpointId) throw new Error("llama.cpp endpoint not found");
			await startModelDownload({ data: { endpointId, model } });
		},
		onMutate: (model) => startedModels.current.add(model),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: libraryStatusQueryOptions().queryKey }),
		onError: (error, model) => {
			startedModels.current.delete(model);
			observedDownloads.current.delete(model);
			toast.error("Failed to start download", { description: error.message });
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
			queryClient.invalidateQueries({ queryKey: libraryStatusQueryOptions().queryKey });
			toast.info(`Stopped downloading ${model}`);
		},
		onError: (error) => toast.error("Failed to stop download", { description: error.message }),
	});

	return { pulling, pull: pullMutation.mutate, stop: stopMutation.mutate };
}
