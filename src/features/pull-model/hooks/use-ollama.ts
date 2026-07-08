import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	deleteModel,
	registerRemoteOllama,
	testRemoteOllama,
} from "#/features/pull-model/lib/library.functions";

export function useOllama() {
	const queryClient = useQueryClient();

	const deleteModelMutation = useMutation({
		mutationFn: (model: string) => deleteModel({ data: { model } }),
		onSuccess: (_data, model) => {
			queryClient.invalidateQueries({ queryKey: ["library-status"] });
			toast.success(`${model} deleted`);
		},
		onError: (error) => toast.error("Failed to delete model", { description: error.message }),
	});

	const connectRemoteMutation = useMutation({
		mutationFn: (input: { url: string; numCtx?: number | null }) =>
			registerRemoteOllama({ data: input }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["library-status"] });
			queryClient.invalidateQueries({ queryKey: ["endpoints"] });
			toast.success("Connected to Ollama");
		},
		onError: (error) => toast.error("Failed to connect to Ollama", { description: error.message }),
	});

	const testRemoteMutation = useMutation({
		mutationFn: (url: string) => testRemoteOllama({ data: { url } }),
	});

	return {
		deleteModel: deleteModelMutation,
		connectRemote: connectRemoteMutation,
		testRemote: testRemoteMutation,
	};
}
