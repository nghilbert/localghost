import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
	activeDownloadsQueryOptions,
	cancelModelDownload,
	libraryStatusQueryOptions,
	startModelDownload,
} from "./model.functions";
import type { PullProgress } from "./types";

/**
 * Drives llama.cpp model downloads off the server-side registry: starting a
 * download kicks off the router's own download, and progress comes from
 * polling that registry, so the `pulling` map survives navigation or a reload
 * mid-download (the router keeps downloading regardless).
 */
export function useModelDownload() {
	const queryClient = useQueryClient();
	const { data: activeDownloads } = useQuery(activeDownloadsQueryOptions());
	const toastedModels = useRef<Set<string>>(new Set());

	// Announce completions and refresh installed models the moment a download finishes.
	useEffect(() => {
		if (!activeDownloads) return;
		const present = new Set(activeDownloads.map((download) => download.model));

		for (const download of activeDownloads) {
			if (!download.done || toastedModels.current.has(download.model)) continue;
			toastedModels.current.add(download.model);
			if (download.error) {
				toast.error(`Failed to download ${download.model}`, { description: download.error });
			} else {
				toast.success(`${download.model} is ready`);
				queryClient.invalidateQueries({ queryKey: libraryStatusQueryOptions().queryKey });
			}
		}

		// Forget models that aged out so a later re-download can announce again.
		for (const model of toastedModels.current) {
			if (!present.has(model)) toastedModels.current.delete(model);
		}
	}, [activeDownloads, queryClient]);

	const pulling: Record<string, PullProgress> = {};
	for (const download of activeDownloads ?? []) {
		if (download.done && !download.error) continue; // succeeded → no longer downloading
		pulling[download.model] = {
			status: download.status,
			completed: download.completed,
			total: download.total,
			error: download.error,
			bytesPerSec: download.bytesPerSec,
		};
	}

	const pullMutation = useMutation({
		mutationFn: (vars: { model: string; runtimeUrl: string }) => startModelDownload({ data: vars }),
		onMutate: ({ model }) => toastedModels.current.delete(model),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: activeDownloadsQueryOptions().queryKey }),
		onError: (error) => toast.error("Failed to start download", { description: error.message }),
	});

	const stopMutation = useMutation({
		mutationFn: (model: string) => cancelModelDownload({ data: { model } }),
		onSuccess: (_data, model) => {
			queryClient.invalidateQueries({ queryKey: activeDownloadsQueryOptions().queryKey });
			toast.info(`Stopped downloading ${model}`);
		},
		onError: (error) => toast.error("Failed to stop download", { description: error.message }),
	});

	// Clears a failed download's row; same server call as stop, minus the toast.
	const dismissMutation = useMutation({
		mutationFn: (model: string) => cancelModelDownload({ data: { model } }),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: activeDownloadsQueryOptions().queryKey }),
		onError: (error) => toast.error("Failed to dismiss", { description: error.message }),
	});

	return {
		pulling,
		pull: pullMutation.mutate,
		stop: stopMutation.mutate,
		dismiss: dismissMutation.mutate,
	};
}
