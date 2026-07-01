import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
	activePullsQueryOptions,
	cancelModelPull,
	startModelPull,
} from "#/features/library/lib/library.functions";
import type { PullProgress } from "#/features/library/lib/types";

/**
 * Drives Ollama model pulls off the server-side registry: starting a pull only
 * kicks off the server download, and live progress comes from polling that
 * registry — so the returned `pulling` map is always current and survives
 * navigation or a reload while a download is in flight.
 */
export function useModelPull() {
	const queryClient = useQueryClient();
	const { data: activePulls } = useQuery(activePullsQueryOptions());
	const toastedModels = useRef<Set<string>>(new Set());

	// Announce completions and refresh installed models the moment a pull finishes.
	useEffect(() => {
		if (!activePulls) return;
		const present = new Set(activePulls.map((pull) => pull.model));

		for (const pull of activePulls) {
			if (!pull.done || toastedModels.current.has(pull.model)) continue;
			toastedModels.current.add(pull.model);
			if (pull.error) {
				toast.error(`Failed to pull ${pull.model}`, { description: pull.error });
			} else {
				toast.success(`${pull.model} is ready`);
				queryClient.invalidateQueries({ queryKey: ["library-status"] });
			}
		}

		// Forget models that aged out so a later re-pull can announce again.
		for (const model of toastedModels.current) {
			if (!present.has(model)) toastedModels.current.delete(model);
		}
	}, [activePulls, queryClient]);

	const pulling: Record<string, PullProgress> = {};
	for (const pull of activePulls ?? []) {
		if (pull.done && !pull.error) continue; // succeeded → no longer pulling
		pulling[pull.model] = {
			status: pull.status,
			completed: pull.completed,
			total: pull.total,
			error: pull.error,
			bytesPerSec: pull.bytesPerSec,
		};
	}

	const pullMutation = useMutation({
		mutationFn: (vars: { model: string; ollamaUrl: string }) => startModelPull({ data: vars }),
		onMutate: ({ model }) => toastedModels.current.delete(model),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library", "active-pulls"] }),
		onError: (error) => toast.error("Failed to start pull", { description: error.message }),
	});

	const stopMutation = useMutation({
		mutationFn: (model: string) => cancelModelPull({ data: { model } }),
		onSuccess: (_data, model) => {
			queryClient.invalidateQueries({ queryKey: ["library", "active-pulls"] });
			toast.info(`Stopped pulling ${model}`);
		},
		onError: (error) => toast.error("Failed to stop pull", { description: error.message }),
	});

	return { pulling, pull: pullMutation.mutate, stop: stopMutation.mutate };
}
