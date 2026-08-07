import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "#/shared/components/ui/toast";
import {
	cancelModelDownload,
	deleteModel,
	libraryStatusQueryOptions,
	registerRemoteRuntime,
	startModelDownload,
	testRemoteRuntime,
} from "./model.functions";
import { aggregatePullProgress } from "./pull-progress";
import { llamaModelDownloadEventSchema } from "./schemas";
import type { RuntimeStatus } from "./types";

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

/** Keeps the shared runtime-status cache synchronized with llama.cpp's model event stream. */
export function useModelDownloadEvents(endpointId: string | null): void {
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!endpointId) return;
		const queryKey = libraryStatusQueryOptions().queryKey;
		const search = new URLSearchParams({ endpointId });
		const source = new EventSource(`/api/models/events?${search}`);

		source.onopen = () => {
			void queryClient.invalidateQueries({ queryKey });
		};
		source.onmessage = (message) => {
			let value: unknown;
			try {
				value = JSON.parse(message.data);
			} catch {
				return;
			}
			const parsed = llamaModelDownloadEventSchema.safeParse(value);
			if (!parsed.success) return;
			const event = parsed.data;
			if (event.event === "download_progress") {
				queryClient.setQueryData<RuntimeStatus>(queryKey, (status) => {
					if (!status?.found) return status;
					return {
						...status,
						downloads: {
							...status.downloads,
							[event.model]: aggregatePullProgress(event.data.progress),
						},
					};
				});
				return;
			}
			void queryClient.invalidateQueries({ queryKey });
		};

		return () => source.close();
	}, [endpointId, queryClient]);
}
