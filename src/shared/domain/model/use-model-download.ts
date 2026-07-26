import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "#/shared/components/ui/toast";
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
			if (installed.has(model)) toast.add({ title: `${model} is ready`, type: "success" });
			else toast.add({ title: `Download failed for ${model}`, type: "error" });
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
			queryClient.invalidateQueries({ queryKey: libraryStatusQueryOptions().queryKey });
			toast.add({ title: `Stopped downloading ${model}`, type: "info" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to stop download", type: "error", description: error.message }),
	});

	return { pulling, pull: pullMutation.mutate, stop: stopMutation.mutate };
}
